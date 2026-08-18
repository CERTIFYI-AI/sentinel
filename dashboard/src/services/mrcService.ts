// SPDX-License-Identifier: Apache-2.0
// Model Risk Committee (MRC) data layer — real, org-scoped persistence for
// meetings, agenda items (model reviews) and votes. Writes throw on failure;
// org_id filled by the DB default. Agenda items interlink to the model registry
// (model_id -> ai_models.id). The committee's decision on an item is derived
// from its recorded votes, not hand-authored.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
  return meetingFromRow(data)
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
  return agendaFromRow(data)
}
export async function setAgendaDecision(id: string, decision: Decision): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record decision.')
  const { error } = await supabase.from('mrc_agenda_items')
    .update({ decision, decided_at: decision === 'pending' ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { console.warn('[mrc] setDecision:', error.message); throw new Error(error.message) }
}
export async function castVote(v: Partial<MrcVote>): Promise<MrcVote> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record vote.')
  const row: Record<string, any> = {
    agenda_item_id: v.agendaItemId, agenda_item_title: v.agendaItemTitle ?? null, model_id: v.modelId ?? null,
    voter_id: v.voterId, voter_name: v.voterName ?? null, vote: v.vote, rationale: v.rationale ?? null,
  }
  const { data, error } = await supabase.from('mrc_votes').insert(row).select().single()
  if (error) { console.warn('[mrc] castVote:', error.message); throw new Error(error.message) }
  return voteFromRow(data)
}

// Derive an item's approve/reject/abstain tally from its recorded votes.
export function tallyVotes(votes: MrcVote[]): { approve: number; reject: number; abstain: number; total: number } {
  const t = { approve: 0, reject: 0, abstain: 0, total: votes.length }
  for (const v of votes) t[v.vote]++
  return t
}

// ── Committee members (mrc_members, canonical since 20260825000003) ─────────
//
// The roster quorum is computed from. Previously the one MRC concern still on
// the modelriskcommittee_table demo table; `chair`/`quorum` names are kept on
// the client type so the page's quorum math reads unchanged.

export interface MrcMember {
  id: string
  name: string
  role?: string
  department?: string
  chair: boolean
  quorum: boolean
}

function memberFromRow(r: Record<string, any>): MrcMember {
  return {
    id: r.id, name: r.name ?? '', role: r.role ?? undefined,
    department: r.department ?? undefined,
    chair: !!r.is_chair, quorum: !!r.counts_toward_quorum,
  }
}

export async function fetchMrcMembers(): Promise<MrcMember[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('mrc_members')
    .select('*').eq('is_active', true).order('is_chair', { ascending: false }).order('name')
  if (error) { console.warn('[mrc] fetchMembers:', error.message); throw new Error(error.message) }
  return (data ?? []).map(memberFromRow)
}

export async function addMrcMember(m: Partial<MrcMember>): Promise<MrcMember> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot add member.')
  const { data, error } = await supabase.from('mrc_members').insert({
    name: m.name, role: m.role ?? null, department: m.department ?? null,
    is_chair: m.chair ?? false, counts_toward_quorum: m.quorum ?? true,
  }).select().single()
  if (error) { console.warn('[mrc] addMember:', error.message); throw new Error(error.message) }
  return memberFromRow(data)
}

export async function removeMrcMember(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot remove member.')
  const { error } = await supabase.from('mrc_members')
    .update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) { console.warn('[mrc] removeMember:', error.message); throw new Error(error.message) }
}
