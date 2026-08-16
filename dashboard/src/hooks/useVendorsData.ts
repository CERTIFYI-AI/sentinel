// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// React Query wrappers over vendorService.
//
// The previous version fired `toast.success('Vendor saved')` from onSuccess
// while the service swallowed every failure and resolved with `null` — so a
// rejected write showed a green toast. The service now throws, which puts the
// failure on onError where it belongs. Toasts fire only after a real resolve.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchAllVendors, fetchVendorById, fetchVendorOptions, fetchVendorConcentration,
  createVendor, updateVendor, deleteVendor as deleteVendorRow,
  type VendorRecord,
} from '@/services/vendorService'

const KEY = ['vendors'] as const

export function useVendorsData() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: KEY, queryFn: () => fetchAllVendors(), staleTime: 30_000 })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: ['vendor-options'] })
    qc.invalidateQueries({ queryKey: ['vendor-concentration'] })
  }

  const create = useMutation({
    mutationFn: (v: Partial<VendorRecord>) => createVendor(v),
    onSuccess: () => { invalidate(); toast.success('Vendor registered') },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to register vendor'),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VendorRecord> }) => updateVendor(id, patch),
    onSuccess: (saved) => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['vendor', saved.id] })
      toast.success('Vendor updated')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to update vendor'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorRow(id),
    onSuccess: () => { invalidate(); toast.success('Vendor removed') },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to remove vendor'),
  })

  return {
    vendors: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove,
    // mutateAsync handles kept for callers that await the write (dialogs that
    // must stay open until it resolves).
    createVendor: create.mutateAsync,
    updateVendor: update.mutateAsync,
    deleteVendor: remove.mutateAsync,
  }
}

/** Single vendor by uuid — powers the detail route. */
export function useVendor(id?: string) {
  const q = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => fetchVendorById(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
  return {
    vendor: q.data ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
  }
}

/** id → name, for resolving interlinks and populating pickers. */
export function useVendorOptions() {
  const q = useQuery({ queryKey: ['vendor-options'], queryFn: fetchVendorOptions, staleTime: 60_000 })
  const options = q.data ?? []
  const byId = new Map(options.map((o) => [o.id, o.name]))
  return {
    options,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    /** Never returns a raw uuid — "Unavailable" when the id does not resolve. */
    resolveName: (id?: string | null) => (id ? (byId.get(id) ?? 'Unavailable') : 'Unavailable'),
  }
}

/** Real vendor concentration over the governed model estate. */
export function useVendorConcentration() {
  const q = useQuery({
    queryKey: ['vendor-concentration'],
    queryFn: fetchVendorConcentration,
    staleTime: 60_000,
  })
  return {
    slices: q.data?.slices ?? [],
    attributedModels: q.data?.attributedModels ?? 0,
    totalModels: q.data?.totalModels ?? 0,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
  }
}
