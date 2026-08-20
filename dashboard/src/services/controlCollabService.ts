// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Control collaboration — multi-user assignments, comments & recommendations,
// and the cross-framework crosswalk (control_links), all on org-scoped RLS
// tables (DB default fills org_id). Evidence linking reuses the existing
// `evidence.linked_controls` text[] column so the Evidence Vault and this
// module read the same truth. Every write throws on failure and audit-logs
// via logAction (EU AI Act Art. 12 traceability).

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — control collaboration is unavailable')
  }
  return supabase
}

// ── Assignments ────────────────────────────────────────────────────────────

export interface ControlAssignment {
  id: string
  controlId: string
  userId: string
  userName: string | null
  role: 'owner' | 'reviewer' | 'approver' | 'contributor'
  assignedBy: string | null
  createdAt: string
}

const mapAssignment = (r: any): ControlAssignment => ({
  id: r.id, controlId: r.control_id, userId: r.user_id, userName: r.user_name ?? null,
  role: r.role, assignedBy: r.assigned_by ?? null, createdAt: r.created_at,
})

export async function fetchAssignments(controlId: string): Promise<ControlAssignment[]> {
  const { data, error } = await client()
    .from('control_assignments').select('*')
    .eq('control_id', controlId).order('created_at', { ascending: true })
  if (error) throw new Error(`Assignments failed to load: ${error.message}`)
  return (data ?? []).map(mapAssignment)
}

export async function addAssignment(a: {
  controlId: string; userId: string; userName?: string; role: ControlAssignment['role']; assignedBy?: string
}): Promise<ControlAssignment> {
  const { data, error } = await client()
    .from('control_assignments')
    .insert({ control_id: a.controlId, user_id: a.userId, user_name: a.userName ?? null, role: a.role, assigned_by: a.assignedBy ?? null })
    .select().single()
  if (error) throw new Error(`Assignment did not persist: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: a.controlId, action: 'assign', newValues: { userId: a.userId, role: a.role } })
  return mapAssignment(data)
}

export async function removeAssignment(id: string, controlId: string): Promise<void> {
  const { error } = await client().from('control_assignments').delete().eq('id', id)
  if (error) throw new Error(`Unassign failed: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: controlId, action: 'unassign', oldValues: { assignmentId: id } })
}

// ── Comments & recommendations ─────────────────────────────────────────────

export interface ControlComment {
  id: string
  controlId: string
  kind: 'comment' | 'recommendation'
  body: string
  authorId: string | null
  authorName: string | null
  status: 'open' | 'resolved'
  createdAt: string
}

const mapComment = (r: any): ControlComment => ({
  id: r.id, controlId: r.control_id, kind: r.kind, body: r.body,
  authorId: r.author_id ?? null, authorName: r.author_name ?? null,
  status: r.status, createdAt: r.created_at,
})

export async function fetchComments(controlId: string): Promise<ControlComment[]> {
  const { data, error } = await client()
    .from('control_comments').select('*')
    .eq('control_id', controlId).order('created_at', { ascending: true })
  if (error) throw new Error(`Comments failed to load: ${error.message}`)
  return (data ?? []).map(mapComment)
}

export async function addComment(c: {
  controlId: string; kind: ControlComment['kind']; body: string; authorId?: string; authorName?: string
}): Promise<ControlComment> {
  const { data, error } = await client()
    .from('control_comments')
    .insert({ control_id: c.controlId, kind: c.kind, body: c.body, author_id: c.authorId ?? null, author_name: c.authorName ?? null })
    .select().single()
  if (error) throw new Error(`${c.kind === 'recommendation' ? 'Recommendation' : 'Comment'} did not persist: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: c.controlId, action: `add_${c.kind}` })
  return mapComment(data)
}

export async function setCommentStatus(id: string, controlId: string, status: 'open' | 'resolved'): Promise<void> {
  const { error } = await client().from('control_comments').update({ status }).eq('id', id)
  if (error) throw new Error(`Status change did not persist: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: controlId, action: `recommendation_${status}` })
}

// ── Crosswalk (control ↔ control) ──────────────────────────────────────────

export interface ControlLink {
  id: string
  controlId: string
  relatedControlId: string
  relation: 'equivalent' | 'supports' | 'overlaps'
  note: string | null
  createdAt: string
}

const mapLink = (r: any): ControlLink => ({
  id: r.id, controlId: r.control_id, relatedControlId: r.related_control_id,
  relation: r.relation, note: r.note ?? null, createdAt: r.created_at,
})

/** Every crosswalk link in the org — the Frameworks → Mapping tab's data. */
export async function fetchAllLinks(): Promise<ControlLink[]> {
  const { data, error } = await client()
    .from('control_links').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Crosswalk failed to load: ${error.message}`)
  return (data ?? []).map(mapLink)
}

/** Links where the control appears on either end — the crosswalk is symmetric to read. */
export async function fetchLinks(controlId: string): Promise<ControlLink[]> {
  const { data, error } = await client()
    .from('control_links').select('*')
    .or(`control_id.eq.${controlId},related_control_id.eq.${controlId}`)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Crosswalk failed to load: ${error.message}`)
  return (data ?? []).map(mapLink)
}

export async function addLink(l: {
  controlId: string; relatedControlId: string; relation: ControlLink['relation']; note?: string
}): Promise<ControlLink> {
  const { data, error } = await client()
    .from('control_links')
    .insert({ control_id: l.controlId, related_control_id: l.relatedControlId, relation: l.relation, note: l.note ?? null })
    .select().single()
  if (error) throw new Error(`Mapping did not persist: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: l.controlId, action: 'map_control', newValues: { relatedControlId: l.relatedControlId, relation: l.relation } })
  return mapLink(data)
}

export async function removeLink(id: string, controlId: string): Promise<void> {
  const { error } = await client().from('control_links').delete().eq('id', id)
  if (error) throw new Error(`Unmap failed: ${error.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: controlId, action: 'unmap_control', oldValues: { linkId: id } })
}

// ── Evidence linking (shared truth with the Evidence Vault) ───────────────

export interface LinkedEvidence {
  id: string
  title: string
  type: string | null
  collectionDate: string | null
  freshnessStatus: string | null
}

export async function fetchLinkedEvidence(controlId: string): Promise<LinkedEvidence[]> {
  const { data, error } = await client()
    .from('evidence')
    .select('id, title, type, collection_date, freshness_status')
    .contains('linked_controls', [controlId])
    .eq('is_deleted', false)
  if (error) throw new Error(`Linked evidence failed to load: ${error.message}`)
  return (data ?? []).map((r: any) => ({
    id: r.id, title: r.title, type: r.type ?? null,
    collectionDate: r.collection_date ?? null, freshnessStatus: r.freshness_status ?? null,
  }))
}

export async function linkEvidence(evidenceId: string, controlId: string): Promise<void> {
  const c = client()
  const { data, error } = await c.from('evidence').select('linked_controls').eq('id', evidenceId).single()
  if (error) throw new Error(`Evidence lookup failed: ${error.message}`)
  const cur: string[] = data?.linked_controls ?? []
  if (cur.includes(controlId)) return
  const { error: upErr } = await c.from('evidence')
    .update({ linked_controls: [...cur, controlId] }).eq('id', evidenceId)
  if (upErr) throw new Error(`Evidence link did not persist: ${upErr.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: controlId, action: 'link_evidence', newValues: { evidenceId } })
}

export async function unlinkEvidence(evidenceId: string, controlId: string): Promise<void> {
  const c = client()
  const { data, error } = await c.from('evidence').select('linked_controls').eq('id', evidenceId).single()
  if (error) throw new Error(`Evidence lookup failed: ${error.message}`)
  const cur: string[] = data?.linked_controls ?? []
  const { error: upErr } = await c.from('evidence')
    .update({ linked_controls: cur.filter((x) => x !== controlId) }).eq('id', evidenceId)
  if (upErr) throw new Error(`Evidence unlink did not persist: ${upErr.message}`)
  void logAction({ module: 'compliance', entityType: 'control', entityId: controlId, action: 'unlink_evidence', oldValues: { evidenceId } })
}
