// src/hooks/use-models.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchModels, fetchModelHealthAll, updateModel, resetCircuitBreaker, testModel } from "../api/client";
import type { ModelConfig, ModelHealth, ModelTestResult } from "../api/types";
import { toast } from "sonner";

export function useModels() {
  return useQuery<ModelConfig[]>({ queryKey: ["models"], queryFn: fetchModels, staleTime: 30_000 });
}

export function useModelHealth() {
  return useQuery<Record<string, ModelHealth>>({ queryKey: ["models", "health"], queryFn: fetchModelHealthAll, staleTime: 10_000 });
}

export function useSetModelRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateModel(id, { role: role as ModelConfig["role"] }),
    onMutate: async ({ id, role }) => {
      await qc.cancelQueries({ queryKey: ["models"] });
      const prev = qc.getQueryData<ModelConfig[]>(["models"]);
      qc.setQueryData<ModelConfig[]>(["models"], old => old?.map(m => m.id === id ? { ...m, role: role as ModelConfig["role"] } : (role === "primary" && m.role === "primary") ? { ...m, role: "fallback" } : m) ?? []);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["models"], ctx.prev); toast.error("Failed to update model role"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useResetCircuitBreaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetCircuitBreaker(id),
    onSuccess: (_d, id) => { toast.success("Circuit breaker reset"); qc.invalidateQueries({ queryKey: ["models", "health"] }); },
  });
}

export function useTestModel() {
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => testModel(id, data) });
}
