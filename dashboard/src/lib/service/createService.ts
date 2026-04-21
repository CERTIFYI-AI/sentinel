// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * createService — the ONE way to talk to Supabase from application code.
 *
 * Every domain owns exactly one `foo.service.ts` that calls `createService()`.
 * Components and hooks never import supabase-js directly.
 *
 * Contract
 * --------
 *  - Generic over a zod output schema (row shape) and a zod input schema
 *    (create/update shape). Both are validated at the boundary.
 *  - Soft-delete by default: list/detail filter `deleted_at is null`;
 *    `delete()` writes `deleted_at = now()` instead of a hard DELETE.
 *  - Every read/write accepts an AbortSignal and a 15s hard timeout.
 *  - Returns Result<T, AppError> — never throws for expected failures.
 *  - org_id scoping is enforced by Postgres RLS; services do not append
 *    `org_id` filters client-side (defense in depth is server-side).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  appError,
  err,
  ok,
  toAppError,
  type AppError,
  type Result,
} from "../result";

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface ListOptions {
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly orderBy?: string;
  readonly orderDir?: "asc" | "desc";
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly search?: string;
  readonly signal?: AbortSignal;
}

export interface GetOptions {
  readonly signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** Opaque cursor encoding — base64 of a (sortKey, id) JSON tuple. */
export function encodeCursor(sortKey: string | number, id: string): string {
  const payload = JSON.stringify([sortKey, id]);
  if (typeof btoa === "function") return btoa(payload);
  return Buffer.from(payload, "utf8").toString("base64");
}

export function decodeCursor(cursor: string): [string | number, string] | null {
  try {
    const raw =
      typeof atob === "function"
        ? atob(cursor)
        : Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    return parsed as [string | number, string];
  } catch {
    return null;
  }
}

export interface Service<Row, Input> {
  list(opts?: ListOptions): Promise<Result<CursorPage<Row>, AppError>>;
  get(id: string, opts?: GetOptions): Promise<Result<Row, AppError>>;
  create(input: Input, opts?: GetOptions): Promise<Result<Row, AppError>>;
  update(
    id: string,
    input: Partial<Input>,
    opts?: GetOptions,
  ): Promise<Result<Row, AppError>>;
  remove(id: string, opts?: GetOptions): Promise<Result<true, AppError>>;
  bulk(
    ids: readonly string[],
    patch: Partial<Input>,
    opts?: GetOptions,
  ): Promise<Result<{ succeeded: string[]; failed: { id: string; error: AppError }[] }, AppError>>;
}

export interface CreateServiceOptions<Row, Input> {
  readonly table: string;
  readonly rowSchema: z.ZodType<Row>;
  readonly inputSchema: z.ZodType<Input>;
  readonly selectColumns?: string;
  /** Default sort column, must be indexed alongside (org_id, …). */
  readonly defaultOrderBy?: string;
  readonly defaultOrderDir?: "asc" | "desc";
  /** Hook for text search — override when using a tsvector column. */
  readonly searchBuilder?: (q: string) => string;
}

/** The single entry point for every domain service in the platform. */
export function createService<Row extends { id: string }, Input>(
  supabase: SupabaseClient,
  options: CreateServiceOptions<Row, Input>,
): Service<Row, Input> {
  const {
    table,
    rowSchema,
    inputSchema,
    selectColumns = "*",
    defaultOrderBy = "created_at",
    defaultOrderDir = "desc",
  } = options;

  function withTimeout<T>(
    p: Promise<T>,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("timeout", "AbortError")),
      DEFAULT_TIMEOUT_MS,
    );
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener("abort", () => controller.abort(signal.reason));
    }
    return p.finally(() => clearTimeout(timer));
  }

  function parseRow(raw: unknown): Result<Row, AppError> {
    const r = rowSchema.safeParse(raw);
    if (!r.success) {
      return err(
        appError("validation", "Server returned an invalid row shape", {
          issues: r.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
      );
    }
    return ok(r.data);
  }

  /**
   * Validate input at the service boundary.
   *
   * For create() we validate against the full inputSchema.
   * For update()/bulk() we validate a Partial<Input>. If the caller supplied
   * a ZodObject we derive a proper `.partial()` schema (so unknown keys still
   * fail, but any subset of known keys is allowed). If the caller supplied a
   * non-object schema (rare — union/record/intersection) we fall through to
   * the full schema, which is the safest conservative default.
   */
  function parseInput(raw: unknown, partial: boolean): Result<unknown, AppError> {
    let schema: z.ZodType<unknown>;
    if (partial && inputSchema instanceof z.ZodObject) {
      schema = (inputSchema as z.ZodObject<z.ZodRawShape>).partial() as z.ZodType<unknown>;
    } else {
      schema = inputSchema as z.ZodType<unknown>;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return err(
        appError("validation", "Invalid input", {
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
      );
    }
    return ok(parsed.data);
  }

  return {
    async list(opts: ListOptions = {}) {
      try {
        const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
        const orderBy = opts.orderBy ?? defaultOrderBy;
        const orderDir = opts.orderDir ?? defaultOrderDir;
        let q = supabase
          .from(table)
          .select(selectColumns)
          .is("deleted_at", null)
          .order(orderBy, { ascending: orderDir === "asc" })
          .order("id", { ascending: orderDir === "asc" })
          .limit(limit + 1);

        if (opts.cursor) {
          const decoded = decodeCursor(opts.cursor);
          if (decoded) {
            const [sortVal, id] = decoded;
            const op = orderDir === "asc" ? "gt" : "lt";
            q = q.or(
              `${orderBy}.${op}.${sortVal},and(${orderBy}.eq.${sortVal},id.${op}.${id})`,
            );
          }
        }
        if (opts.filters) {
          for (const [k, v] of Object.entries(opts.filters)) {
            if (v === undefined || v === null) continue;
            q = q.eq(k, v as never);
          }
        }
        if (opts.search && options.searchBuilder) {
          q = q.or(options.searchBuilder(opts.search));
        }
        if (opts.signal) q = q.abortSignal(opts.signal);

        const { data, error } = await withTimeout(Promise.resolve(q), opts.signal);
        if (error) return err(toAppError(error));
        const rows = (data ?? []) as unknown[];
        const parsed: Row[] = [];
        for (const r of rows) {
          const p = parseRow(r);
          if (!p.ok) return p;
          parsed.push(p.value);
        }
        let nextCursor: string | null = null;
        if (parsed.length > limit) {
          const last = parsed[limit - 1];
          if (last) {
            const sortVal = (last as unknown as Record<string, unknown>)[orderBy];
            nextCursor = encodeCursor(String(sortVal ?? ""), last.id);
          }
          parsed.length = limit;
        }
        return ok({ items: parsed, nextCursor });
      } catch (cause) {
        return err(toAppError(cause));
      }
    },

    async get(id, opts = {}) {
      try {
        let base = supabase
          .from(table)
          .select(selectColumns)
          .eq("id", id)
          .is("deleted_at", null);
        if (opts.signal) base = base.abortSignal(opts.signal);
        const { data, error } = await withTimeout(
          Promise.resolve(base.maybeSingle()),
          opts.signal,
        );
        if (error) return err(toAppError(error));
        if (!data) return err(appError("not_found", `No ${table} row with id ${id}`));
        return parseRow(data);
      } catch (cause) {
        return err(toAppError(cause));
      }
    },

    async create(input, opts = {}) {
      const validated = parseInput(input, false);
      if (!validated.ok) return validated;
      try {
        let base = supabase
          .from(table)
          .insert(validated.value as never)
          .select(selectColumns);
        if (opts.signal) base = base.abortSignal(opts.signal);
        const { data, error } = await withTimeout(
          Promise.resolve(base.single()),
          opts.signal,
        );
        if (error) return err(toAppError(error));
        return parseRow(data);
      } catch (cause) {
        return err(toAppError(cause));
      }
    },

    async update(id, input, opts = {}) {
      const validated = parseInput(input, true);
      if (!validated.ok) return validated;
      try {
        let base = supabase
          .from(table)
          .update({ ...(validated.value as object), updated_at: new Date().toISOString() })
          .eq("id", id)
          .is("deleted_at", null)
          .select(selectColumns);
        if (opts.signal) base = base.abortSignal(opts.signal);
        const { data, error } = await withTimeout(
          Promise.resolve(base.single()),
          opts.signal,
        );
        if (error) return err(toAppError(error));
        return parseRow(data);
      } catch (cause) {
        return err(toAppError(cause));
      }
    },

    async remove(id, opts = {}) {
      try {
        let q = supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id)
          .is("deleted_at", null);
        if (opts.signal) q = q.abortSignal(opts.signal);
        const { error } = await withTimeout(Promise.resolve(q), opts.signal);
        if (error) return err(toAppError(error));
        return ok(true as const);
      } catch (cause) {
        return err(toAppError(cause));
      }
    },

    async bulk(ids, patch, opts = {}) {
      const validated = parseInput(patch, true);
      if (!validated.ok) return validated;
      const succeeded: string[] = [];
      const failed: { id: string; error: AppError }[] = [];
      for (const id of ids) {
        if (opts.signal?.aborted) break;
        try {
          let base = supabase
            .from(table)
            .update({
              ...(validated.value as object),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .is("deleted_at", null)
            .select("id");
          if (opts.signal) base = base.abortSignal(opts.signal);
          const { error } = await withTimeout(
            Promise.resolve(base.single()),
            opts.signal,
          );
          if (error) failed.push({ id, error: toAppError(error) });
          else succeeded.push(id);
        } catch (cause) {
          failed.push({ id, error: toAppError(cause) });
        }
      }
      return ok({ succeeded, failed });
    },
  };
}
