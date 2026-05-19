// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// F.1 — Unit tests for src/hooks/useGlobalSearch.ts
// Covers:
//   - query stays disabled for inputs with < 2 chars
//   - query becomes enabled after debounce settles with >= 2 chars
//   - supabase.rpc is called with the right arguments
//   - results array is populated from the mock RPC response

/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { ReactNode, ReactElement } from "react";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the hook import
// ---------------------------------------------------------------------------

const rpcMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
  isSupabaseConfigured: () => true,
}));

// Mock useTenant so useRequiredOrgId() doesn't throw
vi.mock("@/hooks/useTenant", () => ({
  useRequiredOrgId: () => "org-test-123",
}));

// Import after mocks are declared
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

function makeWrapper(): (opts: { children: ReactNode }) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Only fake setTimeout/setInterval — leave Promises/microtasks and Date unblocked
  // so React Query's async queryFn and staleTime calculations work correctly.
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  rpcMock.mockReset();
  // Default: RPC returns empty results
  rpcMock.mockReturnValue({ data: [], error: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Debounce logic — query disabled for short inputs
// ---------------------------------------------------------------------------
describe("useGlobalSearch — short query (< 2 chars)", () => {
  it("query is not enabled immediately after setQuery with 1 char", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("a");
    });

    // Even after the debounce fires, debouncedQuery = "a" (length < 2) → disabled
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.results.fetchStatus).toBe("idle");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("query stays disabled for empty string", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("");
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.results.fetchStatus).toBe("idle");
  });

  it("query text is reflected in the returned query state", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("x");
    });

    expect(result.current.query).toBe("x");
  });
});

// ---------------------------------------------------------------------------
// Debounce logic — query enabled once >= 2 chars settle
// ---------------------------------------------------------------------------
describe("useGlobalSearch — query enabled after debounce (>= 2 chars)", () => {
  // These tests require real timers so that React Query's async internals
  // (setTimeout(0) scheduling) resolve naturally. The debounce (300ms) is
  // covered by a short real-time wait.
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it("enables the query after the 300ms debounce window with 2+ char input", async () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("ri");
    });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    }, { timeout: 2000, interval: 50 });
  }, 10_000);

  it("calls supabase.rpc with global_search and the correct tenant id", async () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("risk");
    });

    await waitFor(() => expect(rpcMock).toHaveBeenCalled(), { timeout: 2000, interval: 50 });

    const [fnName, params] = rpcMock.mock.calls[0] as [
      string,
      { p_tenant_id: string; p_query: string; p_limit: number },
    ];
    expect(fnName).toBe("global_search");
    expect(params.p_tenant_id).toBe("org-test-123");
    expect(params.p_query).toBe("risk");
    expect(params.p_limit).toBeGreaterThan(0);
  }, 10_000);

  it("returns the results from the RPC mock when query is active", async () => {
    const mockResults = [
      {
        resource_type: "risk",
        resource_id: "r1",
        title: "Risk Alpha",
        excerpt: "a risk",
        url_path: "/risk-register/r1",
        score: 0.9,
      },
    ];
    rpcMock.mockReturnValue({ data: mockResults, error: null });

    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setQuery("alpha");
    });

    await waitFor(() => {
      expect(result.current.results.isSuccess).toBe(true);
      expect(result.current.results.data).toBeTruthy();
      expect(result.current.results.data).toHaveLength(1);
      expect(result.current.results.data![0].title).toBe("Risk Alpha");
    }, { timeout: 2000, interval: 50 });
  }, 10_000);
});

// ---------------------------------------------------------------------------
// isSearching flag
// ---------------------------------------------------------------------------
describe("useGlobalSearch — isSearching flag", () => {
  it("exposes isSearching that mirrors results.isFetching", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    // Initially not searching (no query set)
    expect(result.current.isSearching).toBe(false);
  });

  it("initial query value is an empty string", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.query).toBe("");
  });

  it("results.data is undefined before any query fires", () => {
    const { result } = renderHook(() => useGlobalSearch(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.results.data).toBeUndefined();
  });
});
