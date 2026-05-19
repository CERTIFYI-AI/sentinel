// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.3 — <Can> / <CanAny> / <ProtectedRoute> component tests.
//
// The supabase rpc() call is mocked at module boundary so we exercise
// the full TanStack Query lifecycle (loading → success → error) without
// hitting a real network.

/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

// --- Mock the supabase singleton. vi.mock() is hoisted so the Can import
// below already sees the stub. --------------------------------------------
const rpcMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  isSupabaseConfigured: () => true,
}));

import { Can, CanAny, ProtectedRoute } from "@/lib/rbac";

// Fresh QueryClient per test so cache state doesn't leak.
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function Providers({
  children,
  initial = "/",
}: {
  children: ReactNode;
  initial?: string;
}) {
  return (
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  rpcMock.mockReset();
});

// ---------------------------------------------------------------------------
// <Can>
// ---------------------------------------------------------------------------
describe("<Can>", () => {
  it("renders children when the caller holds the exact permission", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["risk.update"], roles: ["risk_manager"] },
      error: null,
    });

    render(
      <Providers>
        <Can permission="risk.update">ALLOWED</Can>
      </Providers>,
    );

    expect(await screen.findByText("ALLOWED")).toBeInTheDocument();
  });

  it("renders children via resource wildcard grant", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["risk.*"], roles: ["risk_manager"] },
      error: null,
    });

    render(
      <Providers>
        <Can permission="risk.delete">ALLOWED</Can>
      </Providers>,
    );

    expect(await screen.findByText("ALLOWED")).toBeInTheDocument();
  });

  it("renders fallback when permission is missing", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["read.dashboards"], roles: ["viewer"] },
      error: null,
    });

    render(
      <Providers>
        <Can permission="risk.delete" fallback={<span>NO-ACCESS</span>}>
          ALLOWED
        </Can>
      </Providers>,
    );

    expect(await screen.findByText("NO-ACCESS")).toBeInTheDocument();
    expect(screen.queryByText("ALLOWED")).not.toBeInTheDocument();
  });

  it("renders nothing when no fallback is supplied and permission missing", async () => {
    rpcMock.mockResolvedValue({ data: { grants: [], roles: [] }, error: null });

    const { container } = render(
      <Providers>
        <Can permission="risk.delete">SECRET</Can>
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
    });
    expect(container.textContent?.trim()).toBe("");
  });

  it("supports AND semantics when permission is an array", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["risk.read"], roles: ["viewer"] },
      error: null,
    });

    render(
      <Providers>
        <Can
          permission={["risk.read", "risk.update"]}
          fallback={<span>DENIED</span>}
        >
          ALLOWED
        </Can>
      </Providers>,
    );

    // Missing risk.update → DENIED
    expect(await screen.findByText("DENIED")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// <CanAny>
// ---------------------------------------------------------------------------
describe("<CanAny>", () => {
  it("renders children if ANY permission is held (OR semantics)", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["risk.read"], roles: ["viewer"] },
      error: null,
    });

    render(
      <Providers>
        <CanAny permission={["risk.delete", "risk.read"]}>ALLOWED</CanAny>
      </Providers>,
    );

    expect(await screen.findByText("ALLOWED")).toBeInTheDocument();
  });

  it("renders fallback if none are held", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["iam.read"], roles: [] },
      error: null,
    });

    render(
      <Providers>
        <CanAny
          permission={["risk.delete", "risk.update"]}
          fallback={<span>DENIED</span>}
        >
          ALLOWED
        </CanAny>
      </Providers>,
    );

    expect(await screen.findByText("DENIED")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// <ProtectedRoute>
// ---------------------------------------------------------------------------
describe("<ProtectedRoute>", () => {
  it("renders children when the caller holds all required permissions", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["*"], roles: ["org_admin"] },
      error: null,
    });

    render(
      <Providers>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute permissions={["risk.read"]}>
                <div>PROTECTED</div>
              </ProtectedRoute>
            }
          />
          <Route path="/403" element={<div>FORBIDDEN</div>} />
        </Routes>
      </Providers>,
    );

    expect(await screen.findByText("PROTECTED")).toBeInTheDocument();
  });

  it("redirects to /403 when a required permission is missing", async () => {
    rpcMock.mockResolvedValue({
      data: { grants: ["read.dashboards"], roles: ["viewer"] },
      error: null,
    });

    render(
      <Providers>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute permissions={["risk.delete"]}>
                <div>PROTECTED</div>
              </ProtectedRoute>
            }
          />
          <Route path="/403" element={<div>FORBIDDEN</div>} />
        </Routes>
      </Providers>,
    );

    expect(await screen.findByText("FORBIDDEN")).toBeInTheDocument();
    expect(screen.queryByText("PROTECTED")).not.toBeInTheDocument();
  });

  it("shows the loading fallback while permissions are in-flight", () => {
    // Never-resolving promise to freeze the query in `isLoading`.
    rpcMock.mockImplementation(
      () => new Promise(() => undefined) as unknown as Promise<unknown>,
    );

    render(
      <Providers>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute
                permissions={["risk.read"]}
                loadingFallback={<div>LOADING</div>}
              >
                <div>PROTECTED</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Providers>,
    );

    expect(screen.getByText("LOADING")).toBeInTheDocument();
    expect(screen.queryByText("PROTECTED")).not.toBeInTheDocument();
  });

  it("redirects to /login when the RPC errors (fail-closed)", async () => {
    // usePermissions() sets retry: 1, so the RPC is called up to 2 times.
    // Returning an error on every call forces the error state.
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    render(
      <Providers>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute permissions={["risk.read"]}>
                <div>PROTECTED</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </Providers>,
    );

    // retry=1 with default 1s backoff => wait up to ~4s.
    expect(
      await screen.findByText("LOGIN", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
