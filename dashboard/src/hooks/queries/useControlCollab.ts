// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrappers for control collaboration (assignments, comments &
// recommendations, crosswalk links, linked evidence). Services throw; these
// hooks own the toasts and invalidate per-control keys on mutation.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchAssignments, addAssignment, removeAssignment,
  fetchComments, addComment, setCommentStatus,
  fetchLinks, fetchAllLinks, addLink, removeLink,
  fetchLinkedEvidence, linkEvidence, unlinkEvidence,
  type ControlAssignment, type ControlComment, type ControlLink,
} from '../../services/controlCollabService'

const keys = {
  assignments: (id: string) => ['control-assignments', id] as const,
  comments: (id: string) => ['control-comments', id] as const,
  links: (id: string) => ['control-links', id] as const,
  evidence: (id: string) => ['control-evidence', id] as const,
}

export function useControlAssignments(controlId: string | null) {
  return useQuery({
    queryKey: keys.assignments(controlId ?? ''),
    queryFn: () => fetchAssignments(controlId!),
    enabled: !!controlId,
  })
}

export function useAddAssignment(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: Omit<Parameters<typeof addAssignment>[0], 'controlId'>) =>
      addAssignment({ ...a, controlId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.assignments(controlId) }); toast.success('Assigned') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveAssignment(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeAssignment(id, controlId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.assignments(controlId) }); toast.success('Unassigned') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useControlComments(controlId: string | null) {
  return useQuery({
    queryKey: keys.comments(controlId ?? ''),
    queryFn: () => fetchComments(controlId!),
    enabled: !!controlId,
  })
}

export function useAddComment(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Omit<Parameters<typeof addComment>[0], 'controlId'>) =>
      addComment({ ...c, controlId }),
    onSuccess: (created: ControlComment) => {
      qc.invalidateQueries({ queryKey: keys.comments(controlId) })
      toast.success(created.kind === 'recommendation' ? 'Recommendation added' : 'Comment added')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSetCommentStatus(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; status: 'open' | 'resolved' }) =>
      setCommentStatus(p.id, controlId, p.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.comments(controlId) }),
    onError: (e: Error) => toast.error(e.message),
  })
}

/** Org-wide crosswalk for the Frameworks → Mapping tab. */
export function useAllControlLinks() {
  return useQuery({ queryKey: ['control-links-all'], queryFn: fetchAllLinks, staleTime: 30_000 })
}

/** Remove a link from the org-wide view (invalidates the global key). */
export function useRemoveLinkGlobal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; controlId: string }) => removeLink(p.id, p.controlId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['control-links-all'] }); toast.success('Mapping removed') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useControlLinks(controlId: string | null) {
  return useQuery({
    queryKey: keys.links(controlId ?? ''),
    queryFn: () => fetchLinks(controlId!),
    enabled: !!controlId,
  })
}

export function useAddLink(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (l: Omit<Parameters<typeof addLink>[0], 'controlId'>) =>
      addLink({ ...l, controlId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.links(controlId) }); toast.success('Control mapped') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveLink(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeLink(id, controlId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.links(controlId) }); toast.success('Mapping removed') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useControlEvidence(controlId: string | null) {
  return useQuery({
    queryKey: keys.evidence(controlId ?? ''),
    queryFn: () => fetchLinkedEvidence(controlId!),
    enabled: !!controlId,
  })
}

export function useLinkEvidence(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (evidenceId: string) => linkEvidence(evidenceId, controlId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.evidence(controlId) }); toast.success('Evidence linked') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUnlinkEvidence(controlId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (evidenceId: string) => unlinkEvidence(evidenceId, controlId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.evidence(controlId) }); toast.success('Evidence unlinked') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export type { ControlAssignment, ControlComment, ControlLink }
