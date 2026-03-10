import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error: unknown) => {
        const err = error as { message?: string; status?: number };
        window.dispatchEvent(
          new CustomEvent("sentinel:api-error", {
            detail: {
              message: err?.message ?? "Request failed",
              status: err?.status,
            },
          }),
        );
      },
    },
  },
});
