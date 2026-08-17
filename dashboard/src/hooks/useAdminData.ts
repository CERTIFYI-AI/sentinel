// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the ADMIN group registers that were migrated off
// generic (id, doc jsonb) demo tables: Asset Registry, Business Impact
// Analysis and Identity Governance.
//
// Error toasts carry the database's own message rather than a generic
// "Failed to save" — hiding the real reason behind a friendly string is how
// this platform's earlier silent-write failures went unnoticed for so long.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchAssets, upsertAsset, deleteAsset, type AssetRecord,
} from '@/services/assetService'
import {
  fetchBiaProcesses, upsertBiaProcess, deleteBiaProcess, type BiaProcess,
  fetchIdentities, upsertIdentity, deleteIdentity, type Identity,
  fetchSodRules, fetchSodViolations, fetchAccessReviews,
} from '@/services/resilienceService'

export function useAssetsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => fetchAssets(filters),
    staleTime: 30_000,
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['assets'] })

  const save = useMutation({
    mutationFn: (a: Partial<AssetRecord>) => upsertAsset(a),
    onSuccess: () => { inv(); toast.success('Asset saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save asset'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => { inv(); toast.success('Asset deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete asset'),
  })

  return {
    items: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null,
    refetch: list.refetch,
    saveAsset: save.mutateAsync, removeAsset: remove.mutateAsync,
    isSaving: save.isPending,
  }
}

export function useBiaData() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['bia_processes'], queryFn: fetchBiaProcesses, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['bia_processes'] })

  const save = useMutation({
    mutationFn: (b: Partial<BiaProcess>) => upsertBiaProcess(b),
    onSuccess: () => { inv(); toast.success('Process saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save process'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteBiaProcess(id),
    onSuccess: () => { inv(); toast.success('Process deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete process'),
  })

  return {
    items: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null,
    refetch: list.refetch,
    saveProcess: save.mutateAsync, removeProcess: remove.mutateAsync,
    isSaving: save.isPending,
  }
}

export function useIdentityGovernanceData() {
  const qc = useQueryClient()
  const identities = useQuery({ queryKey: ['identities'], queryFn: fetchIdentities, staleTime: 30_000 })
  const rules = useQuery({ queryKey: ['sod_rules'], queryFn: fetchSodRules, staleTime: 60_000 })
  const violations = useQuery({ queryKey: ['sod_violations'], queryFn: fetchSodViolations, staleTime: 30_000 })
  const reviews = useQuery({ queryKey: ['access_reviews'], queryFn: fetchAccessReviews, staleTime: 30_000 })

  const inv = () => qc.invalidateQueries({ queryKey: ['identities'] })
  const save = useMutation({
    mutationFn: (i: Partial<Identity>) => upsertIdentity(i),
    onSuccess: () => { inv(); toast.success('Identity saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save identity'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteIdentity(id),
    onSuccess: () => { inv(); toast.success('Identity deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete identity'),
  })

  return {
    identities: identities.data ?? [],
    sodRules: rules.data ?? [],
    sodViolations: violations.data ?? [],
    accessReviews: reviews.data ?? [],
    isLoading: identities.isLoading,
    error: identities.error as Error | null,
    refetch: identities.refetch,
    saveIdentity: save.mutateAsync, removeIdentity: remove.mutateAsync,
    isSaving: save.isPending,
  }
}
