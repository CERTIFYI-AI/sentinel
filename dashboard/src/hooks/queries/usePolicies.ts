// SPDX-License-Identifier: Apache-2.0
// React Query hooks for policies on the platform contract: the service throws
// on failure so onError is reachable, and these hooks OWN the success/error
// toasts — pages must not fire their own success toasts on top (no
// double-toasting, no fake success).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllPolicies, upsertPolicy, deletePolicy,
  submitPolicyForApproval, publishPolicy, archivePolicy,
  fetchPolicyAcks, requestPolicyAcks, acknowledgePolicy,
  fetchPolicyBacklinks,
  type PolicyRecord,
} from '../../services/policyService'
import { toast } from 'sonner'

const QUERY_KEY = ['policies']
const ACKS_KEY = 'policy-acks'

export function usePolicies() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllPolicies(),
    staleTime: 30_000,
  })
}

export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: PolicyRecord) => upsertPolicy(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save policy'),
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete policy'),
  })
}

/** Submit for approval — creates the oversight queue entry (bound to the
 *  active policy_change workflow) and moves the policy to in_review. The
 *  service refuses duplicate pending requests. */
export function useSubmitPolicyForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { policy: PolicyRecord; requestedBy?: string | null }) =>
      submitPolicyForApproval(v.policy, v.requestedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['ri-approvals'] })
      toast.success('Submitted for approval — the policy is now in review')
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to submit for approval'),
  })
}

export function usePublishPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; approver?: string | null }) => publishPolicy(v.id, v.approver),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy published') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to publish policy'),
  })
}

export function useArchivePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archivePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy archived') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to archive policy'),
  })
}

// ── Acknowledgments ─────────────────────────────────────────────────────────

export function usePolicyAcks(policyId?: string) {
  return useQuery({
    queryKey: [ACKS_KEY, policyId ?? 'none'],
    queryFn: () => fetchPolicyAcks(policyId!),
    enabled: !!policyId,
    staleTime: 15_000,
  })
}

export function useRequestPolicyAcks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { policyId: string; version: string | null; people: { name: string; email?: string }[] }) =>
      requestPolicyAcks(v.policyId, v.version, v.people),
    onSuccess: (rows, v) => {
      qc.invalidateQueries({ queryKey: [ACKS_KEY, v.policyId] })
      toast.success(`Acknowledgment requested from ${rows.length} ${rows.length === 1 ? 'person' : 'people'}`)
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to request acknowledgments'),
  })
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { ackId: string; byName?: string; policyId: string }) =>
      acknowledgePolicy(v.ackId, v.byName),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [ACKS_KEY, v.policyId] })
      toast.success('Acknowledgment recorded')
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to record acknowledgment'),
  })
}

// ── Inbound interlinks (trainings, AI apps, documents, controls) ────────────

export function usePolicyBacklinks(policyId?: string) {
  return useQuery({
    queryKey: ['policy-backlinks', policyId ?? 'none'],
    queryFn: () => fetchPolicyBacklinks(policyId!),
    enabled: !!policyId,
    staleTime: 30_000,
  })
}
