// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// React Query wrappers over vendorSlaService. Reads come from the
// vendor_sla_status view, so every row carries a derived status the UI can
// trust; there is deliberately no mutation that sets a status directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchVendorSlas, createVendorSla, updateVendorSla,
  recordSlaMeasurement, deleteVendorSla, type VendorSlaRecord,
} from '@/services/vendorSlaService'

export function useVendorSlas(vendorId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['vendor-slas', vendorId ?? 'all'],
    queryFn: () => fetchVendorSlas(vendorId),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor-slas'] })
  const fail = (fallback: string) => (e: unknown) =>
    toast.error(e instanceof Error ? e.message : fallback)

  const create = useMutation({
    mutationFn: (s: Partial<VendorSlaRecord>) => createVendorSla(s),
    onSuccess: () => { invalidate(); toast.success('SLA created') },
    onError: fail('Failed to create SLA'),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VendorSlaRecord> }) => updateVendorSla(id, patch),
    onSuccess: () => { invalidate(); toast.success('SLA updated') },
    onError: fail('Failed to update SLA'),
  })

  const measure = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => recordSlaMeasurement(id, value),
    onSuccess: (saved) => {
      invalidate()
      toast.success(`Measurement recorded — status is now ${saved.derivedStatus.replace(/_/g, ' ')}`)
    },
    onError: fail('Failed to record measurement'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorSla(id),
    onSuccess: () => { invalidate(); toast.success('SLA deleted') },
    onError: fail('Failed to delete SLA'),
  })

  return {
    slas: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, measure, remove,
  }
}
