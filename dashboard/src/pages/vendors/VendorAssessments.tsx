// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorAssessments — due-diligence assessments against `vendor_assessments`.
//
// This page previously sat on `vendorassessments_table (id, doc jsonb)`, a
// demo table whose RLS policy was `FOR ALL TO anon, authenticated USING(true)`
// with no org_id — i.e. every tenant could read and write every other
// tenant's vendor assessments, and the page seeded mock rows INTO that shared
// table on first load. It now uses the real org-scoped table.
//
// The other change that matters: an approval used to be one click that walked
// draft → approved with no approver, no audit entry and no human-oversight
// record. A decision now requires a named approver (and, for
// "approved with conditions", the conditions themselves) before it can be
// recorded, and it is written to the audit log.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardText, Plus, Export, CheckCircle, Warning, Clock } from '@phosphor-icons/react'
import { TemplateLibrary } from '@/components/vendors/TemplateLibrary'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendorAssessments } from '@/hooks/useVendorAssessments'
import { useVendorOptions } from '@/hooks/useVendorsData'
import { useVendorQuestionnaires } from '@/hooks/useVendorQuestionnaires'
import {
  ASSESSMENT_STATUSES, ASSESSMENT_TYPES, ASSESSMENT_FRAMEWORKS,
  type VendorAssessmentRecord,
} from '@/services/vendorAssessmentService'
import {
  Pill, LinkPill, FilterChip, Fact, assessmentTone, dash, fmtDate, daysUntil,
} from './vendorUi'

type FormState = {
  vendorId: string
  assessmentType: string
  framework: string
  scope: string
  owner: string
  dueAt: string
  nextReviewAt: string
  notes: string
}

const BLANK: FormState = {
  vendorId: '', assessmentType: 'initial', framework: 'SIG Lite',
  scope: '', owner: '', dueAt: '', nextReviewAt: '', notes: '',
}

type DecisionState = {
  decision: 'approved' | 'approved_with_conditions' | 'rejected'
  approver: string
  conditions: string
  residualRisk: string
  notes: string
}

const BLANK_DECISION: DecisionState = {
  decision: 'approved', approver: '', conditions: '', residualRisk: '', notes: '',
}

export default function VendorAssessments() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const vendorParam = params.get('vendor')
  const openParam = params.get('open')

  const { assessments, isLoading, isError, error, refetch, create, update, decide, remove } =
    useVendorAssessments(vendorParam ?? undefined)
  const { options: vendorOptions, resolveName } = useVendorOptions()
  const { questionnaires } = useVendorQuestionnaires(vendorParam ?? undefined)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VendorAssessmentRecord | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<VendorAssessmentRecord | null>(null)
  const [decisionFor, setDecisionFor] = useState<VendorAssessmentRecord | null>(null)
  const [decision, setDecision] = useState<DecisionState>(BLANK_DECISION)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setD = <K extends keyof DecisionState>(k: K, v: DecisionState[K]) =>
    setDecision((d) => ({ ...d, [k]: v }))

  const selected = openParam ? assessments.find((a) => a.id === openParam) ?? null : null

  // ── KPIs. Only computed over records that carry the underlying date. ──────
  const pending = assessments.filter((a) =>
    ['draft', 'in_progress', 'submitted', 'under_review'].includes(a.status)).length
  const approved = assessments.filter((a) =>
    ['approved', 'approved_with_conditions'].includes(a.status)).length
  const withCriticalFindings = assessments.filter((a) => a.findingsCritical > 0).length
  const withReviewDate = assessments.filter((a) => !!a.nextReviewAt)
  const dueSoon = withReviewDate.filter((a) => {
    const d = daysUntil(a.nextReviewAt)
    return d !== null && d >= 0 && d <= 60
  }).length

  const kpis: StatCardRowItem[] = [
    { label: 'Assessments', value: assessments.length, icon: <ClipboardText size={18} /> },
    { label: 'In flight', value: pending || '—', icon: <Clock size={18} />, description: `${pending} not yet decided` },
    { label: 'Decided', value: approved || '—', icon: <CheckCircle size={18} />, description: `${approved} approved or approved with conditions` },
    {
      label: 'Review due < 60d',
      value: withReviewDate.length ? dueSoon : '—',
      icon: <Warning size={18} />,
      description: withReviewDate.length
        ? `${dueSoon} of ${withReviewDate.length} assessments with a review date`
        : 'No assessment carries a next-review date',
    },
  ]

  const filtered = useMemo(() => assessments.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (typeFilter && a.assessmentType !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${resolveName(a.vendorId)} ${a.assessmentType ?? ''} ${a.framework ?? ''} ${a.owner ?? ''} ${a.scope ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [assessments, statusFilter, typeFilter, search, resolveName])

  function clearVendorFilter() {
    const next = new URLSearchParams(params)
    next.delete('vendor')
    setParams(next, { replace: true })
  }
  function openRecord(a: VendorAssessmentRecord) {
    const next = new URLSearchParams(params)
    next.set('open', a.id)
    setParams(next, { replace: true })
  }
  function closeRecord() {
    const next = new URLSearchParams(params)
    next.delete('open')
    setParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, vendorId: vendorParam ?? '' })
    setFormOpen(true)
  }
  function openEdit(a: VendorAssessmentRecord) {
    setEditing(a)
    setForm({
      vendorId: a.vendorId ?? '',
      assessmentType: a.assessmentType ?? 'initial',
      framework: a.framework ?? 'SIG Lite',
      scope: a.scope ?? '',
      owner: a.owner ?? '',
      dueAt: a.dueAt ?? '',
      nextReviewAt: a.nextReviewAt ?? '',
      notes: a.notes ?? '',
    })
    setFormOpen(true)
  }

  function submit() {
    const patch: Partial<VendorAssessmentRecord> = {
      vendorId: form.vendorId,
      assessmentType: form.assessmentType,
      framework: form.framework,
      scope: form.scope || null,
      owner: form.owner || null,
      // Empty date inputs become NULL, never '' — an empty string parsed to
      // NaN and made new records invisible to the "due for review" filter.
      dueAt: form.dueAt || null,
      nextReviewAt: form.nextReviewAt || null,
      notes: form.notes || null,
    }
    if (editing) {
      update.mutate({ id: editing.id, patch }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate({ ...patch, status: 'draft' }, { onSuccess: () => setFormOpen(false) })
    }
  }

  function submitDecision() {
    if (!decisionFor) return
    decide.mutate(
      {
        id: decisionFor.id,
        decision: decision.decision,
        approver: decision.approver,
        conditions: decision.conditions || undefined,
        residualRisk: decision.residualRisk || undefined,
        notes: decision.notes || undefined,
      },
      { onSuccess: () => { setDecisionFor(null); setDecision(BLANK_DECISION) } },
    )
  }

  function handleExport() {
    const header = ['id', 'vendor', 'type', 'framework', 'status', 'approver', 'score', 'due_at', 'next_review_at']
    const csv = [
      header.join(','),
      ...filtered.map((a) => [
        a.id, JSON.stringify(resolveName(a.vendorId)), a.assessmentType ?? '', a.framework ?? '',
        a.status, JSON.stringify(a.approver ?? ''), a.score ?? '', a.dueAt ?? '', a.nextReviewAt ?? '',
      ].join(',')),
    ].join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `vendor-assessments-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
  }

  const columns: Column<VendorAssessmentRecord>[] = [
    {
      key: 'vendor', header: 'Vendor', sortable: true,
      render: (a) => {
        const name = a.vendorId ? resolveName(a.vendorId) : 'Unavailable'
        return a.vendorId && name !== 'Unavailable'
          ? <LinkPill to={`/vendors/${a.vendorId}`}>{name}</LinkPill>
          : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
      },
    },
    { key: 'assessmentType', header: 'Type', sortable: true, render: (a) => (
      <span className="text-xs capitalize" style={{ color: 'hsl(var(--text-2))' }}>
        {(a.assessmentType ?? '—').replace(/_/g, ' ')}
      </span>
    ) },
    { key: 'framework', header: 'Framework', sortable: true, render: (a) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.framework || '—'}</span>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (a) => (
      <Pill tone={assessmentTone(a.status)}>{a.status.replace(/_/g, ' ')}</Pill>
    ) },
    { key: 'score', header: 'Score', sortable: true, render: (a) => (
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{dash(a.score)}</span>
    ) },
    { key: 'findings', header: 'Findings (C/H)', render: (a) => (
      <span className="text-xs" style={{ color: a.findingsCritical > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}>
        {a.findingsCritical} / {a.findingsHigh}
      </span>
    ) },
    { key: 'owner', header: 'Owner', sortable: true, render: (a) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner || '—'}</span>
    ) },
    { key: 'approver', header: 'Approver', sortable: true, render: (a) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.approver || '—'}</span>
    ) },
    { key: 'dueAt', header: 'Due', sortable: true, render: (a) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fmtDate(a.dueAt)}</span>
    ) },
  ]

  if (isLoading) return <PageSkeleton title="Vendor Assessments" rows={8} />

  const decisionValid = decision.approver.trim().length > 0
    && (decision.decision !== 'approved_with_conditions' || decision.conditions.trim().length > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Assessments"
        subtitle="Third-party due diligence, decisions and evidence"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: 'Assessments' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>Registry</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/tprm')}>TPRM Workspace</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Export size={14} /> Export CSV</Button>
            <Button size="sm" onClick={openCreate} disabled={vendorOptions.length === 0}>
              <Plus size={14} /> New assessment
            </Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState title="Could not load assessments" error={error} subject="vendor assessments" onRetry={() => refetch()} />
      ) : (
        <>
          <StatCardRow cards={kpis} />

          {/* Built-in questionnaire packs (vendor_assessment_templates) */}
          <TemplateLibrary />

          {vendorParam && (
            <FilterChip label="Vendor" value={resolveName(vendorParam)} onClear={clearVendorFilter} />
          )}

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by vendor, framework, owner…"
            filters={[
              {
                key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter,
                options: ASSESSMENT_STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
              },
              {
                key: 'type', label: 'Type', value: typeFilter, onChange: setTypeFilter,
                options: ASSESSMENT_TYPES.map((t) => ({ label: t.replace(/_/g, ' '), value: t })),
              },
            ]}
            activeFilterCount={[statusFilter, typeFilter].filter(Boolean).length}
            onClearAll={() => { setSearch(''); setStatusFilter(''); setTypeFilter('') }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {filtered.length} of {assessments.length}
              </span>
            }
          />

          {vendorOptions.length === 0 ? (
            <EmptyState
              icon={<ClipboardText size={32} weight="duotone" />}
              title="Register a vendor first"
              description="An assessment must reference a vendor by id. Add a vendor to the registry and the assessment can hang off it."
              action={<Button size="sm" onClick={() => navigate('/vendors')}>Open the vendor registry</Button>}
            />
          ) : assessments.length === 0 ? (
            <EmptyState
              icon={<ClipboardText size={32} weight="duotone" />}
              title="No assessments yet"
              description="Record the due-diligence you perform on third parties: scope, findings, the decision and who made it."
              action={<Button size="sm" onClick={openCreate}><Plus size={14} /> New assessment</Button>}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchKey="assessmentType"
              onRowClick={openRecord}
              onView={openRecord}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              emptyMessage="No assessments match the current filters."
            />
          )}
        </>
      )}

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeRecord() }}>
        <SheetContent style={{ borderRadius: 0, width: 620, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle>
              {selected?.assessmentType ? selected.assessmentType.replace(/_/g, ' ') : 'Assessment'}
              {selected?.framework ? ` · ${selected.framework}` : ''}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 h-[calc(100vh-140px)] space-y-5 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={assessmentTone(selected.status)}>{selected.status.replace(/_/g, ' ')}</Pill>
                {selected.vendorId && resolveName(selected.vendorId) !== 'Unavailable' && (
                  <LinkPill to={`/vendors/${selected.vendorId}`}>{resolveName(selected.vendorId)}</LinkPill>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Fact label="Owner" value={selected.owner} />
                <Fact label="Approver" value={selected.approver} hint="who signed the decision" />
                <Fact label="Score" value={dash(selected.score)} />
                <Fact label="Residual risk" value={selected.residualRisk} />
                <Fact label="Due" value={fmtDate(selected.dueAt)} />
                <Fact label="Next review" value={fmtDate(selected.nextReviewAt)} />
                <Fact label="Submitted" value={fmtDate(selected.submittedAt)} />
                <Fact label="Decided" value={fmtDate(selected.reviewedAt)} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                  Findings
                </p>
                <div className="mt-1 flex gap-4 text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                  <span>Critical {selected.findingsCritical}</span>
                  <span>High {selected.findingsHigh}</span>
                  <span>Medium {selected.findingsMedium}</span>
                  <span>Low {selected.findingsLow}</span>
                </div>
              </div>

              {selected.scope && <Fact label="Scope" value={selected.scope} />}
              {selected.conditions && <Fact label="Conditions" value={selected.conditions} />}
              {selected.notes && <Fact label="Notes" value={selected.notes} />}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                  Evidence
                </p>
                {selected.evidenceIds.length === 0 ? (
                  <p className="mt-1 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                    No evidence is attached to this assessment.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selected.evidenceIds.map((eid) => (
                      <LinkPill key={eid} to={`/evidence-vault?open=${eid}`}>Evidence record</LinkPill>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                  Questionnaire
                </p>
                {(() => {
                  const q = questionnaires.find((x) => x.id === selected.questionnaireId)
                    ?? questionnaires.find((x) => x.assessmentId === selected.id)
                  if (!q) {
                    return (
                      <p className="mt-1 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                        No questionnaire is linked to this assessment.
                      </p>
                    )
                  }
                  return (
                    <div className="mt-1">
                      <LinkPill to={`/vendors/${q.vendorUuid}/questionnaire?open=${q.id}`}>
                        {q.template ?? 'Questionnaire'} {q.templateVersion ?? ''}
                      </LinkPill>
                    </div>
                  )
                })()}
              </div>

              {!['approved', 'approved_with_conditions', 'rejected'].includes(selected.status) && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => { setDecision(BLANK_DECISION); setDecisionFor(selected) }}
                  >
                    Record a decision
                  </Button>
                  <p className="mt-1 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                    A decision requires a named approver and is written to the audit log.
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit assessment' : 'New vendor assessment'}
        submitLabel={editing ? 'Save changes' : 'Create assessment'}
        busy={create.isPending || update.isPending}
        disabled={!form.vendorId}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor" required hint="Stored as the vendor's id, not its name.">
            <Select value={form.vendorId} onValueChange={(v) => set('vendorId', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name || 'Unnamed vendor'}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.assessmentType} onValueChange={(v) => set('assessmentType', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSESSMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Framework">
            <Select value={form.framework} onValueChange={(v) => set('framework', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSESSMENT_FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner">
            <Input value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />
          </Field>
          <Field label="Next review" hint="Drives the review-due KPI. Left blank, the record is excluded rather than counted.">
            <Input type="date" value={form.nextReviewAt} onChange={(e) => set('nextReviewAt', e.target.value)} />
          </Field>
        </div>
        <Field label="Scope" hint="Which services and data flows this assessment covers.">
          <Input value={form.scope} onChange={(e) => set('scope', e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className="h-20 w-full resize-none p-2 text-xs"
            style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          />
        </Field>
      </FormDialog>

      {/* ── Decision (human oversight, EU AI Act Art. 14) ─────────────────── */}
      <FormDialog
        open={!!decisionFor}
        onOpenChange={(o) => { if (!o) setDecisionFor(null) }}
        title="Record assessment decision"
        description="The approver is recorded on the assessment and in the audit log. A decision cannot be saved anonymously."
        submitLabel="Record decision"
        busy={decide.isPending}
        disabled={!decisionValid}
        onSubmit={submitDecision}
      >
        <Field label="Decision" required>
          <Select value={decision.decision} onValueChange={(v) => setD('decision', v as DecisionState['decision'])}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approve</SelectItem>
              <SelectItem value="approved_with_conditions">Approve with conditions</SelectItem>
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Approver" required hint="The person accountable for this decision.">
          <Input value={decision.approver} onChange={(e) => setD('approver', e.target.value)} placeholder="Full name" />
        </Field>
        {decision.decision === 'approved_with_conditions' && (
          <Field label="Conditions" required hint="An unstated condition is unenforceable.">
            <textarea
              value={decision.conditions}
              onChange={(e) => setD('conditions', e.target.value)}
              className="h-20 w-full resize-none p-2 text-xs"
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
            />
          </Field>
        )}
        <Field label="Residual risk" hint="Risk remaining after agreed remediation.">
          <Input value={decision.residualRisk} onChange={(e) => setD('residualRisk', e.target.value)} />
        </Field>
        <Field label="Notes">
          <Input value={decision.notes} onChange={(e) => setD('notes', e.target.value)} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete this assessment?"
        description="The assessment and its recorded decision are removed. This cannot be undone."
        confirmLabel="Delete assessment"
        type="danger"
        onConfirm={async () => {
          if (!deleteTarget) return false
          await remove.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
