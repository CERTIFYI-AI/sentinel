// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Per-model runtime rollup for the model record. Disabled until a model id is
// known, so the detail page issues no queries while it is still loading.

import { useQuery } from '@tanstack/react-query'
import { fetchModelRuntimeSummary } from '@/services/modelRuntimeSummary'

export function useModelRuntimeSummary(modelId?: string) {
  const q = useQuery({
    queryKey: ['model-runtime-summary', modelId],
    queryFn: () => fetchModelRuntimeSummary(modelId),
    enabled: !!modelId,
    staleTime: 60_000,
  })
  return {
    summary: q.data ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
  }
}
