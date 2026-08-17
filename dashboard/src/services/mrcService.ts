// SPDX-License-Identifier: Apache-2.0
// Model Risk Committee (MRC) data layer — real, org-scoped persistence for
// meetings, agenda items (model reviews) and votes. Writes throw on failure;
// org_id filled by the DB default. Agenda items interlink to the model registry
// (model_id -> ai_models.id). The committee's decision on an item is derived
// from its recorded votes, not hand-authored.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'model-risk-committee'

export type VoteChoice = 'approve' | 'reject' | 'abstain'
export type Decision = 'pending' | 'approved' | 'rejected' | 'deferred' | 'conditional'

export interface MrcMeeting {
  id: string
  title: string
  meetingType: string
  scheduledAt: string
  status: string               // scheduled | completed | cancelled
  quorumRequired: number
  attendees: string[]
  minutes: string | null
  createdAt: string
}
export interface MrcAgendaItem {
  id: string
  meetingId: string | null
  title: string
  modelId: string | null
  modelName: string | null
  reviewType: string
  summary: string | null
  presenter: string | null
  decision: Decision
  decidedAt: string | null
  createdAt: string
}
export interface MrcVote {
  id: string
  agendaItemId: string
  agendaItemTitle: string | null
  modelId: string | null
  voterId: string
  voterName: string | null
  vote: VoteChoice
  rationale: string | null
  votedAt: string
}

// The committee roster — quorum (SR 11-7 §IV.C) is counted from this, not from
// a hardcoded list in the page. Backed by mrc_committee_members
// (20260825000001_last_demo_table_retirement.sql), which replaces the
// modelriskcommittee_table demo table.
export interface MrcMember {
  id: string
  userId: string | null            // user_profiles.id — the real person
  memberName: string
  committeeRole: string
  department: string | null
  isChair: boolean
  countsTowardQuorum: boolean
  appointedAt: string | null
  createdAt: string
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

const meetingFromRow = (r: Record<string, any>): MrcMeeting => ({
  id: r.id, title: r.title ?? '', meetingType: r.meeting_type ?? 'Regular',
  scheduledAt: r.scheduled_at, status: r.status ?? 'scheduled',
  quorumRequired: Number(r.quorum_required ?? 4), attendees: asArr<string>(r.attendees),
  minutes: r.minutes ?? null, createdAt: r.created_at,
})
const agendaFromRow = (r: Record<string, any>): MrcAgendaItem => ({
  id: r.id, meetingId: r.meeting_id ?? null, title: r.title ?? '',
  modelId: r.model_id ?? null, modelName: r.model_name ?? null,
  reviewType: r.review_type ?? 'Model Review', summary: r.summary ?? null,
  presenter: r.presenter ?? null, decision: (r.decision ?? 'pending') as Decision,
  decidedAt: r.decided_at ?? null, createdAt: r.created_at,
})
const voteFromRow = (r: Record<string, any>): MrcVote => ({
  id: r.id, agendaItemId: r.agenda_item_id, agendaItemTitle: r.agenda_item_title ?? null,
  modelId: r.model_id ?? null, voterId: r.voter_id, voterName: r.voter_name ?? null,
  vote: (r.vote ?? 'abstain') as VoteChoice, rationale: r.rationale ?? null, votedAt: r.voted_at,
})

// ── Reads ─────────────────────────────────────────────────────────────────
export async function fetchMeetings(): Promise<MrcMeeting[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('mrc_meetings').select('*').order('scheduled_at', { ascending: false })
  if (error) { console.warn('[mrc] meetings:', error.message); throw new Error(error.message) }
  return (data ?? []).map(meetingFromRow)
}
export async function fetchAgendaItems(): Promise<MrcAgendaItem[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('mrc_agenda_items').select('*').order('created_at', { ascending: false })
  if (error) { console.warn('[mrc] agenda:', error.message); throw new Error(error.message) }
  return (data ?? []).map(agendaFromRow)
}
export async function fetchVotes(): Promise<MrcVote[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('mrc_votes').select('*').order('voted_at', { ascending: false })
  if (error) { console.warn('[mrc] votes:', error.message); throw new Error(error.message) }
  return (data ?? []).map(voteFromRow)
}

// ── Writes (throw on failure) ───────────────────────────────────────────────
export async function createMeeting(m: Partial<MrcMeeting>): Promise<MrcMeeting> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot schedule meeting.')
  const row: Record<string, any> = {
    title: m.title, meeting_type: m.meetingType ?? 'Regular', scheduled_at: m.scheduledAt,
    status: m.status ?? 'scheduled', quorum_required: m.quorumRequired ?? 4, attendees: m.attendees ?? [],
    minutes: m.minutes ?? null,
  }
  const { data, error } = await supabase.from('mrc_meetings').insert(row).select().single()
  if (error) { console.warn('[mrc] createMeeting:', error.message); throw new Error(error.message) }
  const saved = meetingFromRow(data)
  void logAction({ module: MODULE, entityType: 'mrc_meeting', entityId: saved.id, entityName: saved.title, action: 'create', newValues: row })
  return saved
}
export async function createAgendaItem(a: Partial<MrcAgendaItem>): Promise<MrcAgendaItem> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot add agenda item.')
  const row: Record<string, any> = {
    meeting_id: a.meetingId ?? null, title: a.title, model_id: a.modelId ?? null, model_name: a.modelName ?? null,
    review_type: a.reviewType ?? 'Model Review', summary: a.summary ?? null, presenter: a.presenter ?? null,
    decision: a.decision ?? 'pending',
  }
  const { data, error } = await supabase.from('mrc_agenda_items').insert(row).select().single()
  if (error) { console.warn('[mrc] createAgenda:', error.message); throw new Error(error.message) }
  const saved = agendaFromRow(data)
  void logAction({ module: MODULE, entityType: 'mrc_agenda_item', entityId: saved.id, entityName: saved.title, action: 'create', newValues: row })
  return saved
}
export async function setAgendaDecision(id: string, decision: Decision): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record decision.')
  const { error } = await supabase.from('mrc_agenda_items')
    .update({ decision, decided_at: decision === 'pending' ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { console.warn('[mrc] setDecision:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'mrc_agenda_item', entityId: id, action: 'decision', newValues: { decision } })
}
export async function castVote(v: Partial<MrcVote>): Promise<MrcVote> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record vote.')
  const row: Record<string, any> = {
    agenda_item_id: v.agendaItemId, agenda_item_title: v.agendaItemTitle ?? null, model_id: v.modelId ?? null,
    voter_id: v.voterId, voter_name: v.voterName ?? null, vote: v.vote, rationale: v.rationale ?? null,
  }
  const { data, error } = await supabase.from('mrc_votes').insert(row).select().single()
  if (error) { console.warn('[mrc] castVote:', error.message); throw new Error(error.message) }
  const saved = voteFromRow(data)
  void logAction({ module: MODULE, entityType: 'mrc_vote', entityId: saved.id, entityName: saved.agendaItemTitle ?? saved.id, action: 'vote', newValues: row })
  return saved
}

// ── Committee roster (quorum source of truth) ───────────────────────────────
const memberFromRow = (r: Record<string, any>): MrcMember => ({
  id: r.id, userId: r.user_id ?? null, memberName: r.member_name ?? '',
  committeeRole: r.committee_role ?? 'Committee Member', department: r.department ?? null,
  isChair: !!r.is_chair, countsTowardQuorum: r.counts_toward_quorum !== false,
  appointedAt: r.appointed_at ?? null, createdAt: r.created_at,
})

export async function fetchCommitteeMembers(): Promise<MrcMember[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('mrc_committee_members').select('*').order('created_at', { ascending: true })
  if (error) { console.warn('[mrc] members:', error.message); throw new Error(error.message) }
  return (data ?? []).map(memberFromRow)
}
export async function addCommitteeMember(m: Partial<MrcMember>): Promise<MrcMember> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot add committee member.')
  const row: Record<string, any> = {
    user_id: m.userId ?? null, member_name: m.memberName, committee_role: m.committeeRole ?? 'Committee Member',
    department: m.department ?? null, is_chair: m.isChair ?? false, counts_toward_quorum: m.countsTowardQuorum ?? true,
    appointed_at: m.appointedAt ?? null,
  }
  const { data, error } = await supabase.from('mrc_committee_members').insert(row).select().single()
  if (error) { console.warn('[mrc] addMember:', error.message); throw new Error(error.message) }
  const saved = memberFromRow(data)
  void logAction({ module: MODULE, entityType: 'mrc_committee_member', entityId: saved.id, entityName: saved.memberName, action: 'create', newValues: row })
  return saved
}
export async function removeCommitteeMember(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot remove committee member.')
  const { error } = await supabase.from('mrc_committee_members').delete().eq('id', id)
  if (error) { console.warn('[mrc] removeMember:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'mrc_committee_member', entityId: id, action: 'delete' })
}

// Derive an item's approve/reject/abstain tally from its recorded votes.
export function tallyVotes(votes: MrcVote[]): { approve: number; reject: number; abstain: number; total: number } {
  const t = { approve: 0, reject: 0, abstain: 0, total: votes.length }
  for (const v of votes) t[v.vote]++
  return t
}
