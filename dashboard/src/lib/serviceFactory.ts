// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS3 — Typed CRUD service factory.
//
// One factory call produces a service with:
//   - strict zod validation on input + output
//   - AbortSignal support on every read
//   - org_id scoping via RLS (relies on auth.current_org_id() in DB)
//   - soft-delete by default (writes `deleted_at` rather than hard delete)
//   - structured telemetry (no console.*)
//   - typed errors (ServiceError) instead of swallowed failures
//
// Backed by @supabase/supabase-js. Service modules stay <30 lines each.

import { z, type ZodTypeAny, type ZodObject, type ZodRawShape } from "zod";
import { supabase, isSupabaseConfigured } from "./supabase";
import { telemetry } from "./telemetry";

export class ServiceError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.cause = cause;
  }
}

export interface ServiceFactoryOptions<TSchema extends ZodObject<ZodRawShape>> {
  /** Supabase table name. */
  table: string;
  /** Canonical row schema — used for output validation. */
  schema: TSchema;
  /** Schema used for validating create/update input (omit server-managed cols). */
  inputSchema: ZodTypeAny;
  /** Soft-delete column (default: `deleted_at`). Pass `null` to opt into hard delete. */
  softDeleteColumn?: string | null;
  /** Default ordering — applied to all `list` queries. */
  defaultOrder?: { column: string; ascending: boolean };
}

export interface ListFilters {
  limit?: number;
  offset?: number;
  /** Arbitrary equality filters; values must be primitives. */
  eq?: Record<string, string | number | boolean | null>;
  /** ISO timestamp — only rows updated after this are returned. */
  since?: string;
  /** If true, include soft-deleted rows. */
  includeDeleted?: boolean;
  signal?: AbortSignal;
}

export interface TypedService<TRow, TInput> {
  list(filters?: ListFilters): Promise<TRow[]>;
  get(id: string, signal?: AbortSignal): Promise<TRow | null>;
  create(input: TInput): Promise<TRow>;
  update(id: string, input: Partial<TInput>): Promise<TRow>;
  remove(id: string): Promise<void>;
  restore(id: string): Promise<TRow>;
}

export function createService<
  TSchema extends ZodObject<ZodRawShape>,
  TInput,
>(opts: ServiceFactoryOptions<TSchema>): TypedService<z.infer<TSchema>, TInput> {
  type TRow = z.infer<TSchema>;
  const softCol = opts.softDeleteColumn === undefined ? "deleted_at" : opts.softDeleteColumn;
  const rowsSchema = z.array(opts.schema);

  async function list(filters: ListFilters = {}): Promise<TRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let q = supabase.from(opts.table).select("*");
      if (softCol && !filters.includeDeleted) q = q.is(softCol, null);
      if (filters.eq) {
        for (const [k, v] of Object.entries(filters.eq)) q = q.eq(k, v);
      }
      if (filters.since) q = q.gte("updated_at", filters.since);
      if (opts.defaultOrder) {
        q = q.order(opts.defaultOrder.column, { ascending: opts.defaultOrder.ascending });
      }
      if (typeof filters.limit === "number") q = q.limit(filters.limit);
      if (filters.signal) q = q.abortSignal(filters.signal);
      const { data, error } = await q;
      if (error) throw new ServiceError("db.list", error.message, error);
      const parsed = rowsSchema.safeParse(data ?? []);
      if (!parsed.success) {
        telemetry.warn("service.list.parse_failed", { table: opts.table, issues: parsed.error.issues });
        return [];
      }
      return parsed.data as TRow[];
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return [];
      telemetry.error("service.list.failed", { table: opts.table, error: errString(err) });
      throw err instanceof ServiceError ? err : new ServiceError("db.list.unknown", errString(err), err);
    }
  }

  async function get(id: string, signal?: AbortSignal): Promise<TRow | null> {
    if (!isSupabaseConfigured() || !id) return null;
    try {
      let q = supabase.from(opts.table).select("*").eq("id", id);
      if (softCol) q = q.is(softCol, null);
      if (signal) q = q.abortSignal(signal);
      const { data, error } = await q.maybeSingle();
      if (error) throw new ServiceError("db.get", error.message, error);
      if (!data) return null;
      const parsed = opts.schema.safeParse(data);
      if (!parsed.success) {
        telemetry.warn("service.get.parse_failed", { table: opts.table, id });
        return null;
      }
      return parsed.data as TRow;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return null;
      telemetry.error("service.get.failed", { table: opts.table, id, error: errString(err) });
      throw err instanceof ServiceError ? err : new ServiceError("db.get.unknown", errString(err), err);
    }
  }

  async function create(input: TInput): Promise<TRow> {
    const parsed = opts.inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ServiceError("validation", "Input failed schema validation", parsed.error);
    }
    if (!isSupabaseConfigured()) throw new ServiceError("db.unconfigured", "Supabase not configured");
    const { data, error } = await supabase
      .from(opts.table)
      .insert(parsed.data as Record<string, unknown>)
      .select()
      .single();
    if (error) {
      telemetry.error("service.create.failed", { table: opts.table, error: error.message });
      throw new ServiceError("db.create", error.message, error);
    }
    const rowParsed = opts.schema.safeParse(data);
    if (!rowParsed.success) throw new ServiceError("db.create.shape", "Row failed output schema");
    return rowParsed.data as TRow;
  }

  async function update(id: string, input: Partial<TInput>): Promise<TRow> {
    if (!id) throw new ServiceError("validation", "id required for update");
    const partialSchema = (opts.inputSchema as unknown as { partial?: () => ZodTypeAny }).partial?.() ?? opts.inputSchema;
    const parsed = partialSchema.safeParse(input);
    if (!parsed.success) {
      throw new ServiceError("validation", "Update input failed schema validation", parsed.error);
    }
    if (!isSupabaseConfigured()) throw new ServiceError("db.unconfigured", "Supabase not configured");
    const { data, error } = await supabase
      .from(opts.table)
      .update(parsed.data as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ServiceError("db.update", error.message, error);
    const rowParsed = opts.schema.safeParse(data);
    if (!rowParsed.success) throw new ServiceError("db.update.shape", "Row failed output schema");
    return rowParsed.data as TRow;
  }

  async function remove(id: string): Promise<void> {
    if (!id) throw new ServiceError("validation", "id required for remove");
    if (!isSupabaseConfigured()) throw new ServiceError("db.unconfigured", "Supabase not configured");
    if (softCol) {
      const { error } = await supabase
        .from(opts.table)
        .update({ [softCol]: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", id);
      if (error) throw new ServiceError("db.softDelete", error.message, error);
      return;
    }
    const { error } = await supabase.from(opts.table).delete().eq("id", id);
    if (error) throw new ServiceError("db.delete", error.message, error);
  }

  async function restore(id: string): Promise<TRow> {
    if (!softCol) throw new ServiceError("config", "restore unsupported without soft-delete column");
    if (!id) throw new ServiceError("validation", "id required for restore");
    if (!isSupabaseConfigured()) throw new ServiceError("db.unconfigured", "Supabase not configured");
    const { data, error } = await supabase
      .from(opts.table)
      .update({ [softCol]: null } as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ServiceError("db.restore", error.message, error);
    const rowParsed = opts.schema.safeParse(data);
    if (!rowParsed.success) throw new ServiceError("db.restore.shape", "Row failed output schema");
    return rowParsed.data as TRow;
  }

  return { list, get, create, update, remove, restore };
}

function errString(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
