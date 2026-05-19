// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for createService — validates list/get/create/update via the
// Result<T> API with an in-memory Supabase mock.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock supabase BEFORE importing the factory.
vi.mock("@/lib/supabase", () => {
  type Row = {
    id: string;
    org_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };

  const store: Row[] = [
    {
      id: "r1",
      org_id: "o1",
      name: "alpha",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "r2",
      org_id: "o1",
      name: "beta",
      created_at: "2026-04-02T00:00:00Z",
      updated_at: "2026-04-02T00:00:00Z",
      deleted_at: null,
    },
  ];

  const builder = () => {
    const state = {
      eqs: {} as Record<string, unknown>,
      isNull: false,
      updated: null as Partial<Row> | null,
      action: "select" as "select" | "update" | "delete" | "insert",
      inserted: null as Partial<Row> | null,
    };

    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.order = () => b;
    b.limit = () => b;
    b.range = () => b;
    b.abortSignal = () => b;
    b.in = () => b;
    b.is = (col: string, val: unknown) => {
      if (col === "deleted_at" && val === null) state.isNull = true;
      return b;
    };
    b.eq = (k: string, v: unknown) => {
      state.eqs[k] = v;
      return b;
    };
    b.insert = (rec: Partial<Row> | Partial<Row>[]) => {
      state.action = "insert";
      state.inserted = Array.isArray(rec) ? rec[0] : rec;
      return b;
    };
    b.update = (rec: Partial<Row>) => {
      state.action = "update";
      state.updated = rec;
      return b;
    };
    b.delete = () => {
      state.action = "delete";
      return b;
    };

    b.single = async () => {
      if (state.action === "insert") {
        const row: Row = {
          id: "new",
          org_id: (state.inserted?.org_id ?? "o1") as string,
          name: (state.inserted?.name ?? "x") as string,
          created_at: "2026-04-03T00:00:00Z",
          updated_at: "2026-04-03T00:00:00Z",
          deleted_at: null,
        };
        store.push(row);
        return { data: row, error: null };
      }
      if (state.action === "update") {
        const id = state.eqs["id"] as string;
        const row = store.find((r) => r.id === id);
        if (!row) return { data: null, error: { message: "not found" } };
        Object.assign(row, state.updated);
        return { data: { ...row }, error: null };
      }
      // get
      const id = state.eqs["id"] as string;
      const orgId = state.eqs["org_id"] as string | undefined;
      const row = store.find(
        (r) =>
          r.id === id &&
          (!orgId || r.org_id === orgId) &&
          (!state.isNull || r.deleted_at === null),
      );
      if (!row) return { data: null, error: { message: "not found" } };
      return { data: { ...row }, error: null };
    };

    // Terminal for list()
    b.then = (
      resolve: (v: { data: Row[]; error: null; count: number }) => unknown,
    ) => {
      const orgId = state.eqs["org_id"] as string | undefined;
      const rows = store.filter(
        (r) =>
          (!orgId || r.org_id === orgId) &&
          (!state.isNull || r.deleted_at === null),
      );
      return Promise.resolve(
        resolve({ data: rows, error: null, count: rows.length }),
      );
    };

    return b;
  };

  return {
    supabase: { from: () => builder() },
    isSupabaseConfigured: () => true,
  };
});

import { createService } from "@/lib/serviceFactory";

const RowSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
type Row = z.infer<typeof RowSchema>;

describe("serviceFactory", () => {
  const svc = createService<typeof RowSchema, Row>({
    table: "widgets",
    schema: RowSchema,
    orgField: "org_id",
    softDelete: true,
    defaultOrder: { column: "created_at", ascending: false },
  });

  beforeEach(() => vi.clearAllMocks());

  it("list() returns rows filtered by orgId", async () => {
    const result = await svc.list({ orgId: "o1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it("list() soft-deletes are excluded (deleted_at = null)", async () => {
    const result = await svc.list({ orgId: "o1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.every((r: Row) => r.deleted_at === null)).toBe(true);
  });

  it("get() returns a row by id+orgId", async () => {
    const result = await svc.get("r1", "o1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe("r1");
  });

  it("create() validates input and returns the new row", async () => {
    const result = await svc.create({
      id: "new",
      org_id: "o1",
      name: "gamma",
      created_at: "2026-04-03T00:00:00Z",
      updated_at: "2026-04-03T00:00:00Z",
      deleted_at: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("gamma");
  });

  it("update() patches and returns the updated row", async () => {
    const result = await svc.update("r1", "o1", { name: "renamed" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("renamed");
  });
});
