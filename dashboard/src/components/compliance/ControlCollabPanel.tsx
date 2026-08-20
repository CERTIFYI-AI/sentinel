// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ControlCollabPanel — the collaboration surface of a control's detail sheet:
// multi-user assignees (assign / reassign / unassign, role-typed), comments
// and recommendations (recommendations carry open/resolved), linked evidence
// (shared truth with the Evidence Vault via evidence.linked_controls), and
// the cross-framework crosswalk (control_links) with add/remove. All writes
// go through useControlCollab hooks: services throw, hooks toast, and every
// mutation is audit-logged.

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, ChatCircleText, Lightbulb, Paperclip, ArrowsLeftRight, X, Plus, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { useUserOptions } from '@/hooks/useUserOptions'
import { useAuthStore } from '@/store/authStore'
import { fetchAllEvidences } from '@/services/evidenceService'
import {
  useControlAssignments, useAddAssignment, useRemoveAssignment,
  useControlComments, useAddComment, useSetCommentStatus,
  useControlLinks, useAddLink, useRemoveLink,
  useControlEvidence, useLinkEvidence, useUnlinkEvidence,
} from '@/hooks/queries/useControlCollab'
import type { ControlRecord } from '@/services/controlService'

const ROLES = ['owner', 'reviewer', 'approver', 'contributor'] as const
const RELATIONS = ['equivalent', 'supports', 'overlaps'] as const

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-3))' }}>
      <Icon size={13} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
      {children}
    </p>
  )
}

export function ControlCollabPanel({
  control, allControls, canEdit,
}: {
  control: ControlRecord
  allControls: ControlRecord[]
  canEdit: boolean
}) {
  const controlId = control.id!
  const me = useAuthStore((s) => s.user)
  const { options: people } = useUserOptions()

  // ── Assignees ──
  const assignments = useControlAssignments(controlId)
  const addAssign = useAddAssignment(controlId)
  const rmAssign = useRemoveAssignment(controlId)
  const [pickUser, setPickUser] = useState('')
  const [pickRole, setPickRole] = useState<(typeof ROLES)[number]>('contributor')
  const personName = (userId: string, fallback: string | null) =>
    people.find((p) => p.id === userId)?.name ?? fallback ?? 'Unavailable'

  // ── Comments & recommendations ──
  const comments = useControlComments(controlId)
  const addCmt = useAddComment(controlId)
  const setCmtStatus = useSetCommentStatus(controlId)
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<'comment' | 'recommendation'>('comment')

  // ── Evidence ──
  const linkedEvidence = useControlEvidence(controlId)
  const linkEv = useLinkEvidence(controlId)
  const unlinkEv = useUnlinkEvidence(controlId)
  const allEvidence = useQuery({ queryKey: ['evidence-picker'], queryFn: () => fetchAllEvidences(), staleTime: 60_000 })
  const [pickEvidence, setPickEvidence] = useState('')
  const linkedIds = useMemo(() => new Set((linkedEvidence.data ?? []).map((e) => e.id)), [linkedEvidence.data])

  // ── Crosswalk ──
  const links = useControlLinks(controlId)
  const addMap = useAddLink(controlId)
  const rmMap = useRemoveLink(controlId)
  const [pickControl, setPickControl] = useState('')
  const [pickRelation, setPickRelation] = useState<(typeof RELATIONS)[number]>('equivalent')
  const controlById = useMemo(() => new Map(allControls.map((c) => [c.id, c])), [allControls])
  const controlLabel = (id: string) => {
    const c = controlById.get(id)
    return c ? `${c.controlRef || '—'} · ${c.name || c.title || ''}${c.framework ? ` (${c.framework})` : ''}` : 'Unavailable'
  }
  const mappableControls = useMemo(() => {
    const mapped = new Set((links.data ?? []).flatMap((l) => [l.controlId, l.relatedControlId]))
    return allControls.filter((c) => c.id && c.id !== controlId && !mapped.has(c.id))
  }, [allControls, links.data, controlId])

  return (
    <div className="space-y-5">
      {/* ── Assignees (multi-user; reassign = add/remove) ── */}
      <div>
        <SectionTitle icon={Users}>Assignees</SectionTitle>
        {assignments.isLoading ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading…</p>
        ) : (assignments.data ?? []).length === 0 ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No one is assigned yet.</p>
        ) : (
          <div className="space-y-1">
            {(assignments.data ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1.5 px-2" style={{ border: '1px solid hsl(var(--border))' }}>
                <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                  {personName(a.userId, a.userName)}
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{a.role}</span>
                </span>
                {canEdit && (
                  <button aria-label={`Unassign ${personName(a.userId, a.userName)}`} onClick={() => rmAssign.mutate(a.id)}
                    className="cursor-pointer" style={{ color: 'hsl(var(--text-4))' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="mt-2 flex gap-2">
            <Select value={pickUser || undefined} onValueChange={setPickUser}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select person…" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pickRole} onValueChange={(v) => setPickRole(v as (typeof ROLES)[number])}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!pickUser || addAssign.isPending}
              onClick={() => {
                const p = people.find((x) => x.id === pickUser)
                addAssign.mutate(
                  { userId: pickUser, userName: p?.name, role: pickRole, assignedBy: me?.name },
                  { onSuccess: () => setPickUser('') },
                )
              }}>
              <Plus size={12} /> Assign
            </Button>
          </div>
        )}
      </div>

      {/* ── Comments & recommendations ── */}
      <div>
        <SectionTitle icon={ChatCircleText}>Comments &amp; recommendations</SectionTitle>
        {comments.isLoading ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading…</p>
        ) : (comments.data ?? []).length === 0 ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No discussion yet.</p>
        ) : (
          <div className="space-y-2">
            {(comments.data ?? []).map((c) => (
              <div key={c.id} className="px-2 py-1.5" style={{ border: '1px solid hsl(var(--border))', borderLeft: c.kind === 'recommendation' ? '3px solid hsl(var(--brand))' : '1px solid hsl(var(--border))' }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-medium" style={{ color: 'hsl(var(--text-2))' }}>
                    {c.kind === 'recommendation' && <Lightbulb size={11} className="inline mr-1" style={{ color: 'hsl(var(--brand))' }} />}
                    {c.authorName || 'Unavailable'}
                    <span className="ml-2 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                  {c.kind === 'recommendation' && (
                    c.status === 'resolved' ? (
                      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'hsl(var(--s-ok-tx))' }}>
                        <CheckCircle size={11} weight="fill" /> Resolved
                      </span>
                    ) : canEdit ? (
                      <button className="text-[10px] underline cursor-pointer" style={{ color: 'hsl(var(--text-3))' }}
                        onClick={() => setCmtStatus.mutate({ id: c.id, status: 'resolved' })}>
                        Mark resolved
                      </button>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'hsl(var(--s-wn-tx))' }}>Open</span>
                    )
                  )}
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="mt-2 space-y-2">
            <Textarea rows={2} value={draft} placeholder="Add a comment or recommendation…"
              onChange={(e) => setDraft(e.target.value)} />
            <div className="flex gap-2">
              <Select value={draftKind} onValueChange={(v) => setDraftKind(v as 'comment' | 'recommendation')}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!draft.trim() || addCmt.isPending}
                onClick={() => addCmt.mutate(
                  { kind: draftKind, body: draft.trim(), authorId: me?.id, authorName: me?.name },
                  { onSuccess: () => setDraft('') },
                )}>
                <Plus size={12} /> Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Evidence (shared truth with the Evidence Vault) ── */}
      <div>
        <SectionTitle icon={Paperclip}>Evidence</SectionTitle>
        {linkedEvidence.isLoading ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading…</p>
        ) : (linkedEvidence.data ?? []).length === 0 ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No evidence linked yet.</p>
        ) : (
          <div className="space-y-1">
            {(linkedEvidence.data ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-1.5 px-2" style={{ border: '1px solid hsl(var(--border))' }}>
                <InterlinkChip label={e.title} to={`/evidence-vault?open=${e.id}`} />
                {canEdit && (
                  <button aria-label={`Unlink ${e.title}`} onClick={() => unlinkEv.mutate(e.id)}
                    className="cursor-pointer" style={{ color: 'hsl(var(--text-4))' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="mt-2 flex gap-2">
            <Select value={pickEvidence || undefined} onValueChange={setPickEvidence}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder={allEvidence.isLoading ? 'Loading evidence…' : 'Link existing evidence…'} />
              </SelectTrigger>
              <SelectContent>
                {(allEvidence.data ?? []).filter((e: any) => !linkedIds.has(e.id)).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!pickEvidence || linkEv.isPending}
              onClick={() => linkEv.mutate(pickEvidence, { onSuccess: () => setPickEvidence('') })}>
              <Plus size={12} /> Link
            </Button>
          </div>
        )}
      </div>

      {/* ── Cross-framework mappings (crosswalk) ── */}
      <div>
        <SectionTitle icon={ArrowsLeftRight}>Cross-framework mappings</SectionTitle>
        {links.isLoading ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading…</p>
        ) : (links.data ?? []).length === 0 ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            No mappings yet. Mapping this control to its counterparts in other frameworks lets one
            implementation satisfy several obligations.
          </p>
        ) : (
          <div className="space-y-1">
            {(links.data ?? []).map((l) => {
              const otherId = l.controlId === controlId ? l.relatedControlId : l.controlId
              return (
                <div key={l.id} className="flex items-center justify-between gap-2 py-1.5 px-2" style={{ border: '1px solid hsl(var(--border))' }}>
                  <div className="min-w-0">
                    <InterlinkChip label={controlLabel(otherId)} to={`/compliance/controls?open=${otherId}`} />
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }}>{l.relation}</span>
                      {l.note && <span className="truncate text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{l.note}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <button aria-label="Remove mapping" onClick={() => rmMap.mutate(l.id)}
                      className="shrink-0 cursor-pointer" style={{ color: 'hsl(var(--text-4))' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {canEdit && (
          <div className="mt-2 flex gap-2">
            <Select value={pickControl || undefined} onValueChange={setPickControl}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Map to a control…" /></SelectTrigger>
              <SelectContent>
                {mappableControls.slice(0, 400).map((c) => (
                  <SelectItem key={c.id} value={c.id!}>{controlLabel(c.id!)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pickRelation} onValueChange={(v) => setPickRelation(v as (typeof RELATIONS)[number])}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!pickControl || addMap.isPending}
              onClick={() => addMap.mutate(
                { relatedControlId: pickControl, relation: pickRelation },
                { onSuccess: () => setPickControl('') },
              )}>
              <Plus size={12} /> Map
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
