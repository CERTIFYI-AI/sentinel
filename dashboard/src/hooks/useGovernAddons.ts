// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the governance add-on modules: AI literacy trainings,
// third-party AI apps inventory, and the trust center configuration.
// Mutations invalidate; errors surface from the thrown service calls.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTraining, fetchTrainings, softDeleteTraining, updateTraining,
  type TrainingRecord,
} from '@/services/aiLiteracyService'
import {
  createAiApp, fetchAiApps, softDeleteAiApp, updateAiApp,
  type AiAppRecord,
} from '@/services/aiAppsService'
import {
  fetchTrustCenter, saveTrustCenter,
  type TrustCenterDoc,
} from '@/services/trustCenterService'

export function useTrainings() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['ai_trainings'], queryFn: fetchTrainings, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['ai_trainings'] })
  const create = useMutation({ mutationFn: (t: Partial<TrainingRecord>) => createTraining(t), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TrainingRecord> }) => updateTraining(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteTraining(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

export function useAiApps() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['ai_apps'], queryFn: fetchAiApps, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['ai_apps'] })
  const create = useMutation({ mutationFn: (a: Partial<AiAppRecord>) => createAiApp(a), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AiAppRecord> }) => updateAiApp(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteAiApp(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

/** Lightweight option lists for interlink pickers (canonical id → display name). */
export function usePolicyOptions() {
  const q = useQuery({
    queryKey: ['policy-options'],
    staleTime: 60_000,
    queryFn: async () => {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
      if (!isSupabaseConfigured() || !supabase) return [] as { id: string; ref: string; title: string }[]
      const { data, error } = await supabase.from('policies').select('id, policy_ref, title').order('policy_ref')
      if (error) throw new Error(error.message)
      return (data ?? []).map((p: any) => ({ id: p.id as string, ref: p.policy_ref as string, title: p.title as string }))
    },
  })
  return { policies: q.data ?? [], loading: q.isLoading }
}

export function useVendorOptions() {
  const q = useQuery({
    queryKey: ['vendor-options'],
    staleTime: 60_000,
    queryFn: async () => {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
      if (!isSupabaseConfigured() || !supabase) return [] as { id: string; name: string }[]
      const { data, error } = await supabase
        .from('vendors').select('id, vendor_name').eq('is_deleted', false).order('vendor_name')
      if (error) throw new Error(error.message)
      return (data ?? []).map((v: any) => ({ id: v.id as string, name: v.vendor_name as string }))
    },
  })
  return { vendors: q.data ?? [], loading: q.isLoading }
}

export function useTrustCenter() {
  const qc = useQueryClient()
  const cfg = useQuery({ queryKey: ['trust_center_config'], queryFn: fetchTrustCenter, staleTime: 20_000 })
  const save = useMutation({
    mutationFn: ({ doc, published }: { doc: TrustCenterDoc; published: boolean }) => saveTrustCenter(doc, published),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust_center_config'] }),
  })
  return {
    data: cfg.data ?? null,
    isLoading: cfg.isLoading, isError: cfg.isError,
    error: cfg.error as Error | null, refetch: cfg.refetch,
    save,
  }
}
