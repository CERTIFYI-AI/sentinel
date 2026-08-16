// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for the eval technique catalogue. Mutations invalidate;
// errors surface from the thrown service calls.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvalTechnique, fetchEvalTechniques, softDeleteEvalTechnique, updateEvalTechnique,
  type EvalTechniqueRecord,
} from '@/services/evalTechniqueService'

export function useEvalTechniques() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['eval_techniques'], queryFn: fetchEvalTechniques, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['eval_techniques'] })
  const create = useMutation({ mutationFn: (t: Partial<EvalTechniqueRecord>) => createEvalTechnique(t), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<EvalTechniqueRecord> }) => updateEvalTechnique(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteEvalTechnique(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}
