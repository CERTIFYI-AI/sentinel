// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for the Asset Registry. Reads are cached and shared;
// mutations invalidate the list so the UI reflects the real backend. The
// service throws on failure — nothing here turns a failed write into a
// resolved promise, so the page can only fire a success toast after a write
// has genuinely resolved.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAssets, createAsset, updateAsset, deleteAsset, type AssetRecord,
} from '@/services/assetService'

const KEY = ['assets']

export function useAssetsData(filters: { entityId?: string } = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...KEY, filters.entityId ?? 'all'],
    queryFn: () => fetchAssets(filters),
    staleTime: 20_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (record: Partial<AssetRecord>) => createAsset(record),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AssetRecord> }) => updateAsset(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: invalidate,
  })

  return {
    assets: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove,
  }
}
