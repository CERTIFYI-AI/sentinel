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
      // vendors has no is_deleted column — soft deletes live in deleted_at.
      // Display name prefers vendor_name but the seeds populate `name`, so
      // fall back (both can exist; vendor_name may be an empty string).
      const { data, error } = await supabase
        .from('vendors').select('id, name, vendor_name').is('deleted_at', null).order('name')
      if (error) throw new Error(error.message)
      return (data ?? []).map((v: any) => ({
        id: v.id as string,
        name: ((v.vendor_name as string | null)?.trim() || (v.name as string | null)) ?? 'Unavailable',
      }))
    },
  })
  return {
    vendors: q.data ?? [],
    loading: q.isLoading,
    // Surface the load failure so pickers can render an inline error instead
    // of a silent empty list.
    error: (q.error as Error | null) ?? null,
  }
}

/**
 * Published policies for outward-facing surfaces (Trust Center "Policies"
 * section): the published-policy visibility leg of the policy lifecycle.
 * Live query — never a typed-in list.
 */
export interface PublishedPolicyOption {
  id: string
  title: string
  category: string | null
  version: string | null
  effectiveDate: string | null
}
export function usePublishedPolicies() {
  const q = useQuery({
    queryKey: ['published-policy-options'],
    staleTime: 60_000,
    queryFn: async () => {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
      if (!isSupabaseConfigured() || !supabase) return [] as PublishedPolicyOption[]
      const { data, error } = await supabase
        .from('policies')
        .select('id, title, category, version, effective_date')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('title')
      if (error) throw new Error(error.message)
      return (data ?? []).map((p: any): PublishedPolicyOption => ({
        id: p.id as string,
        title: (p.title as string) ?? '',
        category: p.category ?? null,
        version: p.version ?? null,
        effectiveDate: p.effective_date ?? null,
      }))
    },
  })
  return { policies: q.data ?? [], loading: q.isLoading, error: (q.error as Error | null) ?? null }
}

/**
 * Bindable targets for Trust Center resources: real documents and PUBLISHED
 * transparency reports, so a public resource resolves to a governed record
 * instead of a freehand string.
 */
export interface TrustResourceTarget { id: string; title: string; uri: string | null }
export function useTrustResourceTargets() {
  const docs = useQuery({
    queryKey: ['trust-resource-documents'],
    staleTime: 60_000,
    queryFn: async () => {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
      if (!isSupabaseConfigured() || !supabase) return [] as TrustResourceTarget[]
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, uri, external_link')
        .is('deleted_at', null)
        .order('title')
      if (error) throw new Error(error.message)
      return (data ?? []).map((d: any): TrustResourceTarget => ({
        id: d.id as string,
        title: (d.title as string | null) || 'Untitled document',
        uri: d.external_link ?? d.uri ?? null,
      }))
    },
  })
  const reports = useQuery({
    queryKey: ['trust-resource-transparency-reports'],
    staleTime: 60_000,
    queryFn: async () => {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
      if (!isSupabaseConfigured() || !supabase) return [] as TrustResourceTarget[]
      const { data, error } = await supabase
        .from('transparency_reports')
        .select('id, title, url, status')
        .eq('status', 'PUBLISHED')
        .order('title')
      if (error) throw new Error(error.message)
      return (data ?? []).map((r: any): TrustResourceTarget => ({
        id: r.id as string,
        title: (r.title as string) ?? '',
        uri: r.url ?? null,
      }))
    },
  })
  return {
    documents: docs.data ?? [],
    transparencyReports: reports.data ?? [],
    loading: docs.isLoading || reports.isLoading,
    error: ((docs.error ?? reports.error) as Error | null) ?? null,
  }
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
