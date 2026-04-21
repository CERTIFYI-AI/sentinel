// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock supabase BEFORE importing the factory.
vi.mock("@/lib/supabase", () => {
  type Row = { id: string; org_id: string; name: string; created_at: string; updated_at: string; deleted_at: string | null };
  const store: Row[] = [
    { id: "r1", org_id: "o1", name: "alpha", created_at: "2026-04-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", deleted_at: null },
    { id: "r2", org_id: "o1", name: "beta", created_at: "2026-04-02T00:00:00Z", updated_at: "2026-04-02T00:00:00Z", deleted_at: null },
  ];
  const builder = () => {
    const state = { eq: {} as Record<string, unknown>, softIs: true as null | true, updated: null as Partial<Row> | null, action: "select" as "select" | "update" | "delete" | "insert", inserted: null as Partial<Row> | null };
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.order = () => b;
    b.limit = () => b;
    b.gte = () => b;
    b.abortSignal = () => b;
    b.is = (col: string, val: unknown) => { if (col === "deleted_at") state.softIs = val as null; return b; };
    b.eq = (k: string, v: unknown) => { state.eq[k] = v; return b; };
    b.insert = (rec: Partial<Row>) => { state.action = "insert"; state.inserted = rec; return b; };
    b.update = (rec: Partial<Row>) => { state.action = "update"; state.updated = rec; return b; };
    b.delete = () => { state.action = "delete"; return b; };
    b.single = async () => {
      if (state.action === "insert") {
        const row: Row = { id: "new", org_id: "o1", name: (state.inserted?.name ?? "x") as string, created_at: "2026-04-03T00:00:00Z", updated_at: "2026-04-03T00:00:00Z", deleted_at: null };
        store.push(row);
        return { data: row, error: null };
      }
      if (state.action === "update") {
        const id = state.eq["id"] as string;
        const row = store.find((r) => r.id === id);
        if (!row) return { data: null, error: { message: "not found" } };
        Object.assign(row, state.updated);
        row.updated_at = "2026-04-04T00:00:00Z";
        return { data: row, error: null };
      }
      return { data: null, error: null };
    };
    b.maybeSingle = async () => {
      const id = state.eq["id"] as string;
      const row = store.find((r) => r.id === id && (state.softIs === null ? true : r.deleted_at === null));
      return { data: row ?? null, error: null };
    };
    // Terminal for list()
    b.then = (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: store.filter((r) => (state.softIs === null ? true : r.deleted_at === null)), error: null });
    return b;
  };
  return {
    supabase: { from: () => builder() },
    isSupabaseConfigured: () => true,
  };
});

import { createService, ServiceError } from "@/lib/serviceFactory";

const Row = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
const Input = z.object({ name: z.string().min(1) });
type Input = z.infer<typeof Input>;

describe("serviceFactory", () => {
  const svc = createService<typeof Row, Input>({
    table: "widgets",
    schema: Row,
    inputSchema: Input,
    defaultOrder: { column: "created_at", ascending: false },
  });

  beforeEach(() => vi.clearAllMocks());

  it("list() returns rows filtered by soft-delete", async () => {
    const rows = await svc.list();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((r) => r.deleted_at === null)).toBe(true);
  });

  it("get() respects soft-delete", async () => {
    const r = await svc.get("r1");
    expect(r?.id).toBe("r1");
  });

  it("create() validates input and returns parsed row", async () => {
    const created = await svc.create({ name: "gamma" });
    expect(created.name).toBe("gamma");
  });

  it("create() rejects invalid input with ServiceError", async () => {
    await expect(svc.create({ name: "" } as Input)).rejects.toBeInstanceOf(ServiceError);
  });

  it("update() patches and returns the row", async () => {
    const updated = await svc.update("r1", { name: "renamed" });
    expect(updated.name).toBe("renamed");
  });
});
