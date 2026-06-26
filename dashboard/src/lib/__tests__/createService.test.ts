// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createService, decodeCursor, encodeCursor } from "../service/createService";
import { isErr, isOk } from "../result";

// ---------------------------------------------------------------------------
// Minimal in-memory Supabase stub
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  title: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const rowSchema = z.object({
  id: z.string(),
  title: z.string(),
  org_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

const inputSchema = z.object({
  title: z.string().min(1),
  org_id: z.string(),
});

type QueryOp =
  | { kind: "select" }
  | { kind: "insert"; payload: Record<string, unknown> }
  | { kind: "update"; payload: Record<string, unknown> };

function makeStub(initial: Row[]): { supabase: unknown; rows: () => Row[] } {
  let rows = [...initial];
  function from(_table: string) {
    // Each call returns a fresh chain proxy. We record operations minimally.
    let op: QueryOp = { kind: "select" };
    const filters: Array<(r: Row) => boolean> = [];
    let limitVal: number | null = null;
    let single = false;
    let maybe = false;
    const chain: any = {
      select: () => {
        op = { kind: "select" };
        return chain;
      },
      insert: (payload: Record<string, unknown>) => {
        op = { kind: "insert", payload };
        return chain;
      },
      update: (payload: Record<string, unknown>) => {
        op = { kind: "update", payload };
        return chain;
      },
      eq: (col: string, val: unknown) => {
        filters.push((r) => (r as unknown as Record<string, unknown>)[col] === val);
        return chain;
      },
      is: (col: string, val: unknown) => {
        filters.push((r) => (r as unknown as Record<string, unknown>)[col] === val);
        return chain;
      },
      or: () => chain,
      order: () => chain,
      limit: (n: number) => {
        limitVal = n;
        return chain;
      },
      abortSignal: () => chain,
      single: () => {
        single = true;
        return chain;
      },
      maybeSingle: () => {
        maybe = true;
        return chain;
      },
      then: (resolve: (r: { data: unknown; error: unknown }) => void) => {
        let matched = rows.filter((r) => filters.every((f) => f(r)));
        if (limitVal !== null) matched = matched.slice(0, limitVal);
        if (op.kind === "insert") {
          const p = op.payload;
          const id = (p["id"] as string) ?? `new-${rows.length + 1}`;
          const now = new Date().toISOString();
          const created: Row = {
            id,
            title: String(p["title"] ?? ""),
            org_id: String(p["org_id"] ?? ""),
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          rows.push(created);
          return resolve({ data: created, error: null });
        }
        if (op.kind === "update") {
          const target = matched[0];
          if (!target) return resolve({ data: null, error: null });
          const updated = { ...target, ...op.payload };
          rows = rows.map((r) => (r.id === target.id ? (updated as Row) : r));
          return resolve({ data: updated, error: null });
        }
        // select
        if (single) return resolve({ data: matched[0] ?? null, error: null });
        if (maybe) return resolve({ data: matched[0] ?? null, error: null });
        return resolve({ data: matched, error: null });
      },
    };
    return chain;
  }
  return { supabase: { from } as unknown, rows: () => rows };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a (sort, id) tuple", () => {
    const c = encodeCursor("2026-04-21T00:00:00Z", "abc-1");
    const d = decodeCursor(c);
    expect(d).toEqual(["2026-04-21T00:00:00Z", "abc-1"]);
  });

  it("returns null for malformed cursors", () => {
    expect(decodeCursor("not-valid")).toBeNull();
  });
});

describe("createService — happy path", () => {
  it("list returns a validated page with nextCursor", async () => {
    const { supabase } = makeStub([
      {
        id: "1",
        title: "A",
        org_id: "org-1",
        created_at: "2026-04-21T00:00:00Z",
        updated_at: "2026-04-21T00:00:00Z",
        deleted_at: null,
      },
    ]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.list({ limit: 10 });
    expect(isOk(r)).toBe(true);
    if (r.ok) {
      expect(r.value.items).toHaveLength(1);
      expect(r.value.nextCursor).toBeNull();
    }
  });

  it("get returns not_found when the row is missing", async () => {
    const { supabase } = makeStub([]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.get("missing");
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("create validates input and rejects bad payloads before any IO", async () => {
    const { supabase } = makeStub([]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.create({ title: "", org_id: "org-1" } as never);
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("remove performs a soft delete", async () => {
    const { supabase, rows } = makeStub([
      {
        id: "1",
        title: "A",
        org_id: "org-1",
        created_at: "2026-04-21T00:00:00Z",
        updated_at: "2026-04-21T00:00:00Z",
        deleted_at: null,
      },
    ]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.remove("1");
    expect(isOk(r)).toBe(true);
    expect(rows()[0]?.deleted_at).not.toBeNull();
  });

  it("bulk aggregates per-item success and failure", async () => {
    const { supabase } = makeStub([
      {
        id: "1",
        title: "A",
        org_id: "org-1",
        created_at: "t",
        updated_at: "t",
        deleted_at: null,
      },
      {
        id: "2",
        title: "B",
        org_id: "org-1",
        created_at: "t",
        updated_at: "t",
        deleted_at: null,
      },
    ]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.bulk(["1", "2"], { title: "renamed" });
    expect(isOk(r)).toBe(true);
    if (r.ok) {
      expect(r.value.succeeded).toHaveLength(2);
      expect(r.value.failed).toHaveLength(0);
    }
  });
});

describe("createService — security", () => {
  it("does not allow components to bypass deleted_at filter (list default)", async () => {
    const { supabase } = makeStub([
      {
        id: "1",
        title: "A",
        org_id: "org-1",
        created_at: "t",
        updated_at: "t",
        deleted_at: "2026-04-21T00:00:00Z",
      },
    ]);
    const svc = createService<Row, { title: string; org_id: string }>(supabase as any, {
      table: "risks",
      rowSchema,
      inputSchema,
    });
    const r = await svc.list();
    expect(isOk(r)).toBe(true);
    if (r.ok) expect(r.value.items).toHaveLength(0);
  });
});
