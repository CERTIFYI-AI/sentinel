// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the statutory compliance record modules migrated off
// demo tables: the control library, GDPR Art. 30 RoPA, and Chapter V transfer
// impact assessments. Mutations invalidate; errors surface from the services.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createControl, deleteControl, fetchControls, updateControl,
  type ControlRecord,
} from '@/services/complianceControlsService'
import {
  createRopaRecord, deleteRopaRecord, fetchRopaRecords, updateRopaRecord,
  createTiaRecord, deleteTiaRecord, fetchTiaRecords, updateTiaRecord,
  type RopaRecord, type TiaRecord,
} from '@/services/privacyRecordsService'

export function useControls() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['controls'], queryFn: fetchControls, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['controls'] })
  const create = useMutation({ mutationFn: (c: Partial<ControlRecord>) => createControl(c), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ControlRecord> }) => updateControl(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteControl(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

export function useRopaRecords() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['ropa_records'], queryFn: fetchRopaRecords, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['ropa_records'] })
  const create = useMutation({ mutationFn: (r: Partial<RopaRecord>) => createRopaRecord(r), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RopaRecord> }) => updateRopaRecord(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteRopaRecord(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

export function useTiaRecords() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['transfer_impact_assessments'], queryFn: fetchTiaRecords, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['transfer_impact_assessments'] })
  const create = useMutation({ mutationFn: (t: Partial<TiaRecord>) => createTiaRecord(t), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TiaRecord> }) => updateTiaRecord(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteTiaRecord(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}
