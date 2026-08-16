// SPDX-License-Identifier: Apache-2.0
// Compliance-operations cluster on the platform contract (CLAUDE.md):
// real org-scoped tables (audits, audit_findings, compliance_calendar,
// control_tests) with camelCase↔snake_case mapping at this boundary, writes
// THROW on failure so the UI can never report a false success, and the client
// never sends the scoping column (DB defaults fill it under RLS).
//
// The compliance calendar is the aggregation point of the platform: manual
// rows live in compliance_calendar, while deadline events are DERIVED live
// from conformity_assessments, exceptions, tabletop_exercises,
// regulator_filings and ai_trainings — derived events are never persisted
// and carry a deep-link route back to their source module.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — compliance data is unavailable')
  }
  return supabase
}

async function selectAll<T>(table: string, mapper: (r: any) => T, order = 'created_at'): Promise<T[]> {
  const { data, error } = await client().from(table).select('*').order(order, { ascending: false })
  if (error) {
    console.warn('[complianceOpsService] fetch %s failed: %s', table, error.message)
    throw new Error(`Could not load ${table.replace(/_/g, ' ')}: ${error.message}`)
  }
  return (data ?? []).map(mapper)
}

async function upsertRow<T>(table: string, row: Record<string, unknown>, mapper: (r: any) => T): Promise<T> {
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from(table).upsert(row).select().single()
  if (error) {
    console.warn('[complianceOpsService] upsert %s failed: %s', table, error.message)
    throw new Error(`The write to ${table.replace(/_/g, ' ')} did not persist: ${error.message}`)
  }
  return mapper(data)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await client().from(table).delete().eq('id', id)
  if (error) {
    console.warn('[complianceOpsService] delete %s failed: %s', table, error.message)
    throw new Error(`Delete from ${table.replace(/_/g, ' ')} failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Audits (audits table — org_id defaults to current_user_org_id())
// ---------------------------------------------------------------------------
export interface AuditRecord {
  id?: string
  auditRef?: string
  title: string
  auditType?: string           // internal | external | certification | regulator
  framework?: string
  scope?: string
  auditor?: string
  leadAuditor?: string
  status: string               // planned | in_progress | completed | cancelled
  startDate?: string | null
  endDate?: string | null
  owner?: string | null
  findingsCount: number
  description?: string
  createdAt?: string
}

const mapAudit = (r: any): AuditRecord => ({
  id: r.id,
  auditRef: r.audit_ref ?? undefined,
  title: r.title ?? '',
  auditType: r.audit_type ?? undefined,
  framework: r.framework ?? undefined,
  scope: r.scope ?? undefined,
  auditor: r.auditor ?? undefined,
  leadAuditor: r.lead_auditor ?? undefined,
  status: (r.status ?? 'planned').toLowerCase(),
  startDate: r.start_date ?? null,
  endDate: r.end_date ?? null,
  owner: r.owner ?? null,
  findingsCount: Number(r.findings_count ?? 0),
  description: r.description ?? undefined,
  createdAt: r.created_at,
})

export const fetchAudits = () => selectAll('audits', mapAudit)
export const saveAudit = (a: AuditRecord) =>
  upsertRow('audits', {
    id: a.id,
    audit_ref: a.auditRef,
    title: a.title,
    audit_type: a.auditType,
    framework: a.framework,
    scope: a.scope,
    auditor: a.auditor,
    lead_auditor: a.leadAuditor,
    status: a.status?.toLowerCase(),
    start_date: a.startDate,
    end_date: a.endDate,
    owner: a.owner,
    findings_count: a.findingsCount,
    description: a.description,
  }, mapAudit)
export const deleteAudit = (id: string) => deleteRow('audits', id)

// ---------------------------------------------------------------------------
// Audit findings (audit_findings.audit_id → audits.id;
// linked_control_id → controls.id, text in this era)
// ---------------------------------------------------------------------------
export interface AuditFindingRecord {
  id?: string
  auditId: string              // → audits.id
  findingRef?: string
  title: string
  description?: string
  severity?: string            // minor | moderate | major | critical
  status: string               // open | in_remediation | closed
  linkedControlId?: string | null // → controls.id
  dueDate?: string | null
  owner?: string | null
  createdAt?: string
}

const mapFinding = (r: any): AuditFindingRecord => ({
  id: r.id,
  auditId: r.audit_id,
  findingRef: r.finding_ref ?? undefined,
  title: r.title ?? '',
  description: r.description ?? undefined,
  severity: r.severity ?? undefined,
  status: (r.status ?? 'open').toLowerCase(),
  linkedControlId: r.linked_control_id ?? null,
  dueDate: r.due_date ?? null,
  owner: r.owner ?? null,
  createdAt: r.created_at,
})

export async function fetchFindings(auditId?: string): Promise<AuditFindingRecord[]> {
  let q = client().from('audit_findings').select('*').order('created_at', { ascending: false })
  if (auditId) q = q.eq('audit_id', auditId)
  const { data, error } = await q
  if (error) {
    console.warn('[complianceOpsService] fetch %s failed: %s', 'audit_findings', error.message)
    throw new Error(`Could not load audit findings: ${error.message}`)
  }
  return (data ?? []).map(mapFinding)
}

// Saving a finding does NOT recalculate audits.findings_count client-side —
// counts are display data owned by the backend/seeds, never invented here.
export const saveFinding = (f: AuditFindingRecord) =>
  upsertRow('audit_findings', {
    id: f.id,
    audit_id: f.auditId,
    finding_ref: f.findingRef,
    title: f.title,
    description: f.description,
    severity: f.severity,
    status: f.status?.toLowerCase(),
    linked_control_id: f.linkedControlId || null,
    due_date: f.dueDate,
    owner: f.owner,
  }, mapFinding)
export const deleteFinding = (id: string) => deleteRow('audit_findings', id)

// ---------------------------------------------------------------------------
// Compliance calendar — manual rows + live-derived deadline events.
// ---------------------------------------------------------------------------
export interface CalendarEventRecord {
  id?: string                  // uuid for manual rows; synthetic for derived
  title: string
  description?: string
  status?: string
  type?: string
  severity?: string
  owner?: string | null
  dueAt: string | null
  frameworkRef?: string | null
  sourceType: string           // manual | conformity | exception | tabletop | filing | training
  sourceId?: string | null     // id of the source record for derived events
  route?: string | null        // deep link into the source module
  isDerived: boolean           // derived events are never persisted
  createdAt?: string
}

const mapManualEvent = (r: any): CalendarEventRecord => ({
  id: r.id,
  title: r.title ?? r.name ?? '',
  description: r.description ?? undefined,
  status: r.status ?? undefined,
  type: r.type ?? undefined,
  severity: r.severity ?? undefined,
  owner: r.owner ?? null,
  dueAt: r.due_at ?? null,
  frameworkRef: r.framework_ref ?? null,
  sourceType: r.source_type ?? 'manual',
  sourceId: r.source_id ?? null,
  route: null,
  isDerived: false,
  createdAt: r.created_at,
})

async function derivedRows(table: string, columns: string): Promise<any[]> {
  const { data, error } = await client().from(table).select(columns)
  if (error) {
    console.warn('[complianceOpsService] derive from %s failed: %s', table, error.message)
    throw new Error(`Could not derive calendar events from ${table.replace(/_/g, ' ')}: ${error.message}`)
  }
  return data ?? []
}

const OPEN_FILING_STATUSES_EXCLUDED = new Set(['submitted', 'acknowledged', 'closed'])

// Merges manual compliance_calendar rows with deadline events derived live
// from the governed source tables. Derived events are computed at read time
// and never written back — deleting/saving only applies to manual rows.
export async function fetchCalendarEvents(): Promise<CalendarEventRecord[]> {
  const nowIso = new Date().toISOString()
  const today = nowIso.slice(0, 10)

  const [manual, conformity, exceptions, tabletops, filings, trainings] = await Promise.all([
    derivedRows('compliance_calendar', '*'),
    derivedRows('conformity_assessments', 'id, title, status, owner, valid_until, framework_id'),
    derivedRows('exceptions', 'id, title, status, severity, owner, expiry_date'),
    derivedRows('tabletop_exercises', 'id, name, status, facilitator, scheduled_at'),
    derivedRows('regulator_filings', 'id, title, status, regulation, deadline'),
    derivedRows('ai_trainings', 'id, name, status, owner_name, ends_on, is_deleted'),
  ])

  const events: CalendarEventRecord[] = manual.map(mapManualEvent)

  for (const r of conformity) {
    if (!r.valid_until) continue
    events.push({
      id: `conformity:${r.id}`,
      title: r.title ? `Conformity assessment expires: ${r.title}` : 'Conformity assessment expires',
      status: r.status ?? undefined,
      type: 'deadline',
      owner: r.owner ?? null,
      dueAt: r.valid_until,
      frameworkRef: r.framework_id ?? null,
      sourceType: 'conformity',
      sourceId: String(r.id),
      route: `/conformity?open=${r.id}`,
      isDerived: true,
    })
  }
  for (const r of exceptions) {
    if (!r.expiry_date) continue
    events.push({
      id: `exception:${r.id}`,
      title: r.title ? `Exception expires: ${r.title}` : 'Exception expires',
      status: r.status ?? undefined,
      type: 'deadline',
      severity: r.severity ?? undefined,
      owner: r.owner ?? null,
      dueAt: r.expiry_date,
      sourceType: 'exception',
      sourceId: String(r.id),
      route: `/exceptions?open=${r.id}`,
      isDerived: true,
    })
  }
  for (const r of tabletops) {
    if (!r.scheduled_at || r.scheduled_at <= nowIso) continue
    events.push({
      id: `tabletop:${r.id}`,
      title: r.name ? `Tabletop exercise: ${r.name}` : 'Tabletop exercise',
      status: r.status ?? undefined,
      type: 'exercise',
      owner: r.facilitator ?? null,
      dueAt: r.scheduled_at,
      sourceType: 'tabletop',
      sourceId: String(r.id),
      route: '/tabletop',
      isDerived: true,
    })
  }
  for (const r of filings) {
    if (!r.deadline) continue
    if (OPEN_FILING_STATUSES_EXCLUDED.has(String(r.status ?? '').toLowerCase())) continue
    events.push({
      id: `filing:${r.id}`,
      title: r.title ? `Filing due: ${r.title}` : 'Filing due',
      status: r.status ?? undefined,
      type: 'deadline',
      dueAt: r.deadline,
      frameworkRef: r.regulation ?? null,
      sourceType: 'filing',
      sourceId: String(r.id),
      route: `/regulator-filings?open=${r.id}`,
      isDerived: true,
    })
  }
  for (const r of trainings) {
    if (r.is_deleted) continue
    if (!r.ends_on || String(r.ends_on) <= today) continue
    events.push({
      id: `training:${r.id}`,
      title: r.name ? `Training window closes: ${r.name}` : 'Training window closes',
      status: r.status ?? undefined,
      type: 'deadline',
      owner: r.owner_name ?? null,
      dueAt: r.ends_on,
      sourceType: 'training',
      sourceId: String(r.id),
      route: '/ai-literacy',
      isDerived: true,
    })
  }

  // Soonest deadline first; undated manual entries sink to the bottom.
  return events.sort((a, b) => {
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0
  })
}

// Manual rows only — derived events live in their source modules.
export function saveCalendarEvent(e: CalendarEventRecord): Promise<CalendarEventRecord> {
  if (e.isDerived) {
    return Promise.reject(new Error('Derived calendar events are managed in their source module'))
  }
  return upsertRow('compliance_calendar', {
    id: e.id,
    name: e.title,
    title: e.title,
    description: e.description,
    status: e.status,
    type: e.type,
    severity: e.severity,
    owner: e.owner,
    due_at: e.dueAt,
    framework_ref: e.frameworkRef,
    source_type: 'manual',
    source_id: e.sourceId,
    updated_at: new Date().toISOString(),
  }, mapManualEvent)
}
export function deleteCalendarEvent(id: string): Promise<void> {
  if (id.includes(':')) {
    return Promise.reject(new Error('Derived calendar events cannot be deleted — resolve them in their source module'))
  }
  return deleteRow('compliance_calendar', id)
}

// ---------------------------------------------------------------------------
// Control tests (control_tests.control_id → controls.id, text in this era)
// ---------------------------------------------------------------------------
export interface ControlTestRecord {
  id?: string
  controlId: string            // → controls.id
  result: string               // pass | fail | partial | not_tested
  tester?: string | null
  notes?: string | null
  testedAt?: string
}

const mapControlTest = (r: any): ControlTestRecord => ({
  id: r.id,
  controlId: r.control_id,
  result: r.result ?? 'not_tested',
  tester: r.tester ?? null,
  notes: r.notes ?? null,
  testedAt: r.tested_at,
})

export async function fetchControlTests(controlId?: string): Promise<ControlTestRecord[]> {
  let q = client().from('control_tests').select('*').order('tested_at', { ascending: false })
  if (controlId) q = q.eq('control_id', controlId)
  const { data, error } = await q
  if (error) {
    console.warn('[complianceOpsService] fetch %s failed: %s', 'control_tests', error.message)
    throw new Error(`Could not load control tests: ${error.message}`)
  }
  return (data ?? []).map(mapControlTest)
}

// Records the test AND reflects it on the control row (last_tested_at /
// test_result) — both writes are checked; a half-applied result throws.
export async function saveControlTest(t: ControlTestRecord): Promise<ControlTestRecord> {
  const testedAt = t.testedAt ?? new Date().toISOString()
  const saved = await upsertRow('control_tests', {
    id: t.id,
    control_id: t.controlId,
    result: t.result,
    tester: t.tester,
    notes: t.notes,
    tested_at: testedAt,
  }, mapControlTest)
  const { error } = await client()
    .from('controls')
    .update({ last_tested_at: testedAt, test_result: t.result, updated_at: new Date().toISOString() })
    .eq('id', t.controlId)
  if (error) {
    console.warn('[complianceOpsService] control test backfill failed: %s', error.message)
    throw new Error(`The test was recorded but the control row was not updated: ${error.message}`)
  }
  return saved
}

// ---------------------------------------------------------------------------
// Gap analysis — DERIVED, never persisted, never invented. Gaps come from
// (a) controls whose status/implementation_status is not implemented or
// effective, joined client-side to frameworks for display names, and
// (b) real gap strings recorded on compliance_scores rows by the mesh.
// ---------------------------------------------------------------------------
export interface GapRecord {
  frameworkName: string
  controlId?: string | null    // → controls.id when the gap is a control
  controlRef?: string | null
  title: string
  status: string
  severity?: string | null
  owner?: string | null
  remediationDeadline?: string | null
}

const HEALTHY_CONTROL_STATUSES = new Set(['implemented', 'effective'])

export async function fetchGaps(): Promise<GapRecord[]> {
  const [controls, frameworks, scores] = await Promise.all([
    derivedRows('controls', 'id, control_id, control_ref, name, title, framework, framework_id, status, implementation_status, severity, risk_level, priority, owner, remediation_deadline, is_deleted'),
    derivedRows('frameworks', 'id, name, short_name, code'),
    derivedRows('compliance_scores', 'framework, status, gaps'),
  ])

  const frameworkName = (c: any): string => {
    const f = frameworks.find((fw) =>
      fw.id === c.framework_id || fw.id === c.framework ||
      fw.code === c.framework || fw.name === c.framework || fw.short_name === c.framework)
    return f?.name ?? c.framework ?? 'Unmapped framework'
  }

  const gaps: GapRecord[] = []
  for (const c of controls) {
    if (c.is_deleted) continue
    const status = String(c.status ?? '').toLowerCase()
    const impl = String(c.implementation_status ?? '').toLowerCase()
    if (HEALTHY_CONTROL_STATUSES.has(status) || HEALTHY_CONTROL_STATUSES.has(impl)) continue
    gaps.push({
      frameworkName: frameworkName(c),
      controlId: c.id != null ? String(c.id) : null,
      controlRef: c.control_ref ?? c.control_id ?? null,
      title: c.name ?? c.title ?? 'Untitled control',
      status: impl || status || 'not_started',
      severity: c.severity ?? c.risk_level ?? c.priority ?? null,
      owner: c.owner ?? null,
      remediationDeadline: c.remediation_deadline ?? null,
    })
  }

  // Mesh-recorded gap strings (compliance_scores.gaps is a jsonb string array).
  const seen = new Set(gaps.map((g) => `${g.frameworkName}::${g.title}`))
  for (const row of scores) {
    const entries: unknown[] = Array.isArray(row.gaps) ? row.gaps : []
    for (const entry of entries) {
      if (typeof entry !== 'string' || !entry) continue
      const fw = String(row.framework ?? 'Unmapped framework').replace(/_/g, ' ')
      const key = `${fw}::${entry}`
      if (seen.has(key)) continue
      seen.add(key)
      gaps.push({
        frameworkName: fw,
        controlId: null,
        controlRef: null,
        title: entry,
        status: String(row.status ?? 'gap_identified').toLowerCase(),
        severity: null,
        owner: null,
        remediationDeadline: null,
      })
    }
  }
  return gaps
}
