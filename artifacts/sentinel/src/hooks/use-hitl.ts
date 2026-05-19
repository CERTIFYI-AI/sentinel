// @ts-nocheck
// dashboard/src/hooks/use-hitl.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHitlQueue, reviewHitlJob } from "../api/client";
import type { HitlReviewPayload } from "../api/types";

export function useHitlQueue(status?: string) {
  return useQuery({
    queryKey: ["hitl", status],
    queryFn: () => fetchHitlQueue(status),
    refetchInterval: 15_000,
  });
}

export function useReviewHitl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: HitlReviewPayload }) =>
      reviewHitlJob(jobId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hitl"] });
    },
  });
}