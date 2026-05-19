// dashboard/src/hooks/use-config.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, updateConfig } from "../api/client";
import type { TenantConfig } from "../api/types";

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<TenantConfig>) => updateConfig(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}