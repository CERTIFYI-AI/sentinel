// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the AIBOM Registry. Reads are cached and shared;
// mutations invalidate the affected queries so the UI reflects the real
// backend. The services throw on failure — nothing here converts a failed
// write into a resolved promise, so callers can only fire a success toast
// after a write has genuinely resolved.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAibomRecords, fetchAibomRecord, fetchAibomComponents, fetchAibomVulnerabilities,
  createAibomRecord, updateAibomRecord, deleteAibomRecord,
  createAibomComponent, deleteAibomComponent,
  type AibomRecord, type AibomComponent, type AibomVulnerability,
} from '@/services/aibomService'

const RECORDS = ['aibom-records']
const COMPONENTS = ['aibom-components']
const VULNS = ['aibom-vulnerabilities']

export function useAibomRecords(filters: { modelId?: string } = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...RECORDS, filters.modelId ?? 'all'],
    queryFn: () => fetchAibomRecords(filters),
    staleTime: 20_000,
  })

  const invalidate = () => { qc.invalidateQueries({ queryKey: RECORDS }) }

  const create = useMutation({
    mutationFn: (record: Partial<AibomRecord>) => createAibomRecord(record),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AibomRecord> }) => updateAibomRecord(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAibomRecord(id),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: COMPONENTS }); qc.invalidateQueries({ queryKey: VULNS }) },
  })

  return {
    records: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove,
  }
}

export function useAibomRecord(id: string | undefined) {
  const q = useQuery({
    queryKey: [...RECORDS, 'one', id],
    queryFn: () => fetchAibomRecord(id!),
    enabled: !!id,
  })
  return { record: q.data ?? null, isLoading: q.isLoading, error: q.error as Error | null }
}

/** Components for one AIBOM, or every component in the org when id is omitted. */
export function useAibomComponents(aibomId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...COMPONENTS, aibomId ?? 'all'],
    queryFn: () => fetchAibomComponents(aibomId),
    staleTime: 20_000,
  })
  const invalidate = () => { qc.invalidateQueries({ queryKey: COMPONENTS }) }

  const create = useMutation({
    mutationFn: (component: Partial<AibomComponent>) => createAibomComponent(component),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAibomComponent(id),
    onSuccess: invalidate,
  })

  return {
    components: (list.data ?? []) as AibomComponent[],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    create, remove,
  }
}

/**
 * Vulnerabilities are rows written by a scanner, never a UI tally. When the
 * owning record has `lastScannedAt === null` the correct reading is "never
 * scanned" — see `openCveCount`, which returns null so the UI renders an
 * em-dash rather than a reassuring 0.
 */
export function useAibomVulnerabilities(aibomId?: string) {
  const q = useQuery({
    queryKey: [...VULNS, aibomId ?? 'all'],
    queryFn: () => fetchAibomVulnerabilities(aibomId),
    staleTime: 20_000,
  })
  return {
    vulnerabilities: (q.data ?? []) as AibomVulnerability[],
    isLoading: q.isLoading,
    error: q.error as Error | null,
  }
}
