// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for per-model trust configurations (model_trust_configs).
// Mutations invalidate the list; the service throws so callers surface real
// error toasts.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchModelTrustConfigs, upsertModelTrustConfig, deleteModelTrustConfig,
  type ModelTrustConfig,
} from '@/services/modelTrustConfigService'

export function useModelTrustConfigs() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['model-trust-configs'], queryFn: fetchModelTrustConfigs, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['model-trust-configs'] })
  const save = useMutation({ mutationFn: (c: Partial<ModelTrustConfig>) => upsertModelTrustConfig(c), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => deleteModelTrustConfig(id), onSuccess: inv })
  return { data: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null, save, remove }
}
