// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the supply-chain attestation register. Reads come from
// the `supply_chain_attestation_status` view so `derivedValidity` is computed
// in the database from valid_until / revoked_at; writes go to the real
// org-scoped table. Renewal and revocation are real records, not toasts.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAttestations, createAttestation, updateAttestation, deleteAttestation,
  revokeAttestation, renewAttestation, type Attestation,
} from '@/services/attestationService'
import { fetchAllEvidences } from '@/services/evidenceService'
import { fetchAllControls } from '@/services/controlService'

const KEY = ['supply-chain-attestations']

export function useAttestations(filters: { modelId?: string; vendorId?: string } = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...KEY, filters.modelId ?? 'all', filters.vendorId ?? 'all'],
    queryFn: () => fetchAttestations(filters),
    staleTime: 20_000,
  })

  const invalidate = () => { qc.invalidateQueries({ queryKey: KEY }) }

  const create = useMutation({
    mutationFn: (a: Partial<Attestation>) => createAttestation(a),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, patch, previous }: { id: string; patch: Partial<Attestation>; previous?: Attestation }) =>
      updateAttestation(id, patch, previous),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAttestation(id),
    onSuccess: invalidate,
  })
  const revoke = useMutation({
    mutationFn: ({ attestation, reason }: { attestation: Attestation; reason: string }) =>
      revokeAttestation(attestation, reason),
    onSuccess: invalidate,
  })
  const renew = useMutation({
    mutationFn: ({ previous, validUntil }: { previous: Attestation; validUntil: string }) =>
      renewAttestation(previous, validUntil),
    onSuccess: invalidate,
  })

  return {
    attestations: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove, revoke, renew,
  }
}

/**
 * Real evidence records for the attestation evidence picker. An attestation
 * used to carry unlinked filename strings whose click handler fired
 * `toast.info('Opening …')`; evidence is now `evidence_ids uuid[]` pointing at
 * rows in the Evidence Vault, resolved here so the UI renders titles and can
 * deep-link to `/evidence-vault?open=<id>`.
 */
export function useEvidenceOptions() {
  const q = useQuery({
    queryKey: ['evidence-options'],
    queryFn: async () => (await fetchAllEvidences()).map(e => ({ id: e.id, title: e.title })),
    staleTime: 60_000,
  })
  const options = q.data ?? []
  return {
    options,
    loading: q.isLoading,
    /** Title for an evidence id, or null when the id does not resolve. */
    resolve: (id: string) => options.find(e => e.id === id)?.title ?? null,
  }
}

/** Framework controls an attestation can cite (controls.id → control code/name). */
export function useControlOptions() {
  const q = useQuery({
    queryKey: ['control-options'],
    queryFn: async () => (await fetchAllControls())
      .filter(c => !!c.id)
      .map(c => ({ id: c.id as string, label: c.controlCode ? `${c.controlCode} — ${c.name}` : c.name })),
    staleTime: 60_000,
  })
  const options = q.data ?? []
  return {
    options,
    loading: q.isLoading,
    resolve: (id: string) => options.find(c => c.id === id)?.label ?? null,
  }
}
