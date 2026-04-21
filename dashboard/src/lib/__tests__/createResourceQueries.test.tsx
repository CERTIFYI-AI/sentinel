// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createResourceQueries } from "../query/createResourceQueries";
import { appError, err, ok, type Result } from "../result";
import type { Service, CursorPage } from "../service/createService";

interface Row {
  id: string;
  title: string;
}

function makeService(rows: Row[]): Service<Row, { title: string }> {
  return {
    async list(): Promise<Result<CursorPage<Row>, ReturnType<typeof appError>>> {
      return ok({ items: rows, nextCursor: null });
    },
    async get(id) {
      const found = rows.find((r) => r.id === id);
      return found ? ok(found) : err(appError("not_found", "x"));
    },
    async create(input) {
      const row: Row = { id: `new-${rows.length + 1}`, title: input.title };
      rows.push(row);
      return ok(row);
    },
    async update(id, patch) {
      const row = rows.find((r) => r.id === id);
      if (!row) return err(appError("not_found", "x"));
      Object.assign(row, patch);
      return ok(row);
    },
    async remove() {
      return ok(true as const);
    },
    async bulk(ids) {
      return ok({ succeeded: [...ids], failed: [] });
    },
  };
}

function wrapper(): (opts: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("createResourceQueries", () => {
  it("useList returns a cursor page", async () => {
    const svc = makeService([{ id: "1", title: "A" }]);
    const q = createResourceQueries(svc, "risks");
    const { result } = renderHook(() => q.useList(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("useDetail short-circuits when id is falsy", () => {
    const svc = makeService([]);
    const q = createResourceQueries(svc, "risks");
    const { result } = renderHook(() => q.useDetail(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useCreate invalidates the list cache on success", async () => {
    const svc = makeService([]);
    const q = createResourceQueries(svc, "risks");
    const { result } = renderHook(
      () => ({ create: q.useCreate(), list: q.useList() }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.list.data?.items).toHaveLength(0);
    await result.current.create.mutateAsync({ title: "New" });
    await waitFor(() =>
      expect(result.current.list.data?.items.length ?? 0).toBeGreaterThan(0),
    );
  });

  it("keys are stable and resource-namespaced", () => {
    const svc = makeService([]);
    const q = createResourceQueries(svc, "risks");
    expect(q.keys.all()).toEqual(["risks"]);
    expect(q.keys.lists()).toEqual(["risks", "list"]);
    expect(q.keys.detail("x")).toEqual(["risks", "detail", "x"]);
  });
});
