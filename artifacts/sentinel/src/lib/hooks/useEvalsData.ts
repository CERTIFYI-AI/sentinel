// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../queryClient";
import { QK } from "../queryKeys";

/* ── Types ── */
export interface EvalRun {
  id: string;
  modelId: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED";
  score: number | null;
  startedAt: string;
  completedAt: string | null;
  metrics: Record<string, number>;
}

export interface EvalSummary {
  totalRuns: number;
  passRate: number;
  avgScore: number;
  lastRunAt: string | null;
}

export interface EvalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

/* ── Hooks ── */
export function useEvalSummary() {
  return useQuery({
    queryKey: QK.evalSummary,
    queryFn: () =>
      api<EvalSummary>("dashboard/evals/summary"),
    refetchInterval: 30_000,
  });
}

export function useEvalRuns(modelId?: string) {
  return useQuery({
    queryKey: [...QK.evalRuns, modelId ?? "ALL"],
    queryFn: () =>
      api<EvalRun[]>(
        `dashboard/evals/runs${modelId ? `?model=${modelId}` : ""}`
      ),
    refetchInterval: 15_000,
  });
}

export function useEvalTemplates() {
  return useQuery({
    queryKey: QK.evalTemplates,
    queryFn: () =>
      api<EvalTemplate[]>("dashboard/evals/templates"),
    staleTime: 5 * 60_000,
  });
}

export function useTriggerEval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { modelId: string; templateId: string }) =>
      api<{ runId: string }>("dashboard/evals/trigger", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.evalRuns });
      queryClient.invalidateQueries({ queryKey: QK.evalSummary });
    },
  });
}
