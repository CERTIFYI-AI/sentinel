// dashboard/src/hooks/use-metrics.ts

import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "../api/client";

export function useMetrics(hours?: number) {
  return useQuery({
    queryKey: ["metrics", hours],
    queryFn: () => fetchMetrics(hours),
    refetchInterval: 30_000,
  });
}