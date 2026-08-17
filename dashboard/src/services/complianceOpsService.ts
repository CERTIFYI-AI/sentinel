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
import { logAction } from '../lib/auditLogger'

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
export const saveAudit = async (a: AuditRecord): Promise<AuditRecord> => {
  const saved = await upsertRow('audits', {
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
  // EU AI Act Art. 12 traceability — fire-and-forget, after the write resolved.
  void logAction({ module: 'compliance', entityType: 'audits', entityId: saved.id, entityName: saved.auditRef ?? saved.title, action: a.id ? 'update' : 'create' })
  return saved
}
export const deleteAudit = async (id: string): Promise<void> => {
  await deleteRow('audits', id)
  void logAction({ module: 'compliance', entityType: 'audits', entityId: id, action: 'delete' })
}

// ---------------------------------------------------------------------------
// Audit findings (audit_findings.audit_id → audits.id;
// linked_control_id → controls.id, text in this era;
// linked_risk_id → risks.id, uuid)
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
  linkedRiskId?: string | null    // → risks.id
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
  linkedRiskId: r.linked_risk_id ?? null,
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
// the UI derives counts from loaded findings, never from a stored column.
export const saveFinding = async (f: AuditFindingRecord): Promise<AuditFindingRecord> => {
  const saved = await upsertRow('audit_findings', {
    id: f.id,
    audit_id: f.auditId,
    finding_ref: f.findingRef,
    title: f.title,
    description: f.description,
    severity: f.severity,
    status: f.status?.toLowerCase(),
    linked_control_id: f.linkedControlId || null,
    linked_risk_id: f.linkedRiskId || null,
    due_date: f.dueDate,
    owner: f.owner,
  }, mapFinding)
  void logAction({ module: 'compliance', entityType: 'audit_findings', entityId: saved.id, entityName: saved.findingRef ?? saved.title, action: f.id ? 'update' : 'create' })
  return saved
}
export const deleteFinding = async (id: string): Promise<void> => {
  await deleteRow('audit_findings', id)
  void logAction({ module: 'compliance', entityType: 'audit_findings', entityId: id, action: 'delete' })
}

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
  sourceType: string           // manual | conformity | exception | tabletop | filing | training | audit | control_test
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

  const [manual, conformity, exceptions, tabletops, filings, trainings, audits, controls] = await Promise.all([
    derivedRows('compliance_calendar', '*'),
    derivedRows('conformity_assessments', 'id, title, status, owner, valid_until, framework_id'),
    derivedRows('exceptions', 'id, title, status, severity, owner, expiry_date'),
    derivedRows('tabletop_exercises', 'id, name, status, facilitator, scheduled_at'),
    derivedRows('regulator_filings', 'id, title, status, regulation, deadline'),
    derivedRows('ai_trainings', 'id, name, status, owner_name, ends_on, is_deleted'),
    derivedRows('audits', 'id, title, audit_ref, status, owner, start_date, framework'),
    derivedRows('controls', 'id, name, title, control_ref, framework, owner, next_test_at, implementation_status, status, is_deleted'),
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
    // A denied or already-expired exception has no upcoming deadline.
    const st = String(r.status ?? '').toLowerCase()
    if (st === 'denied' || st === 'expired') continue
    if (String(r.expiry_date) < today) continue
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
    if (['cancelled', 'completed'].includes(String(r.status ?? '').toLowerCase())) continue
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
  // Planned/in-progress audits with a start date ahead of us — completed and
  // cancelled audits have no upcoming calendar obligation.
  for (const r of audits) {
    if (!r.start_date || String(r.start_date) < today) continue
    const st = String(r.status ?? '').toLowerCase()
    if (st === 'completed' || st === 'cancelled') continue
    events.push({
      id: `audit:${r.id}`,
      title: r.title ? `Audit begins: ${r.title}` : 'Audit begins',
      status: r.status ?? undefined,
      type: 'audit',
      owner: r.owner ?? null,
      dueAt: r.start_date,
      frameworkRef: r.framework ?? null,
      sourceType: 'audit',
      sourceId: String(r.id),
      route: `/audits?open=${r.id}`,
      isDerived: true,
    })
  }
  // Control tests coming due (controls.next_test_at). Overdue tests are kept —
  // an overdue test is still an open obligation, mirroring how conformity
  // expiries surface. Not-applicable controls carry no test cadence.
  for (const r of controls) {
    if (r.is_deleted || !r.next_test_at) continue
    const impl = String(r.implementation_status ?? r.status ?? '').toLowerCase()
    if (impl === 'not_applicable') continue
    const name = r.name ?? r.title ?? r.control_ref ?? 'control'
    events.push({
      id: `control_test:${r.id}`,
      title: `Control test due: ${name}`,
      status: r.implementation_status ?? r.status ?? undefined,
      type: 'deadline',
      owner: r.owner ?? null,
      dueAt: r.next_test_at,
      frameworkRef: r.framework ?? null,
      sourceType: 'control_test',
      sourceId: String(r.id),
      route: `/compliance/controls?open=${r.id}`,
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
export async function saveCalendarEvent(e: CalendarEventRecord): Promise<CalendarEventRecord> {
  if (e.isDerived) {
    throw new Error('Derived calendar events are managed in their source module')
  }
  const saved = await upsertRow('compliance_calendar', {
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
  void logAction({ module: 'compliance', entityType: 'compliance_calendar', entityId: saved.id, entityName: saved.title, action: e.id ? 'update' : 'create' })
  return saved
}
export async function deleteCalendarEvent(id: string): Promise<void> {
  if (id.includes(':')) {
    throw new Error('Derived calendar events cannot be deleted — resolve them in their source module')
  }
  await deleteRow('compliance_calendar', id)
  void logAction({ module: 'compliance', entityType: 'compliance_calendar', entityId: id, action: 'delete' })
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

// controls.test_frequency vocabulary as seeded (monthly | quarterly |
// semiannual | annual) → months to the next test. Unknown/absent frequencies
// return null so we never invent a cadence the control does not declare.
const TEST_FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
}

function nextTestFrom(testedAt: string, frequency?: string | null): string | null {
  const months = TEST_FREQUENCY_MONTHS[(frequency ?? '').trim().toLowerCase()]
  if (!months) return null
  const d = new Date(testedAt)
  if (isNaN(d.getTime())) return null
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

// Records the test AND reflects it on the control row (last_tested_at /
// test_result, plus next_test_at advanced by the control's own
// test_frequency) — all writes are checked; a half-applied result throws.
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
  // Read the control's declared cadence so the next due date advances with
  // the recorded test — checked read, same failure contract as the update.
  const { data: controlRow, error: readError } = await client()
    .from('controls')
    .select('test_frequency')
    .eq('id', t.controlId)
    .maybeSingle()
  if (readError) {
    console.warn('[complianceOpsService] control frequency read failed: %s', readError.message)
    throw new Error(`The test was recorded but the control row was not updated: ${readError.message}`)
  }
  const nextTestAt = nextTestFrom(testedAt, controlRow?.test_frequency)
  const patch: Record<string, unknown> = {
    last_tested_at: testedAt,
    test_result: t.result,
    updated_at: new Date().toISOString(),
  }
  if (nextTestAt) patch.next_test_at = nextTestAt // no declared cadence → leave the schedule untouched
  const { error } = await client()
    .from('controls')
    .update(patch)
    .eq('id', t.controlId)
  if (error) {
    console.warn('[complianceOpsService] control test backfill failed: %s', error.message)
    throw new Error(`The test was recorded but the control row was not updated: ${error.message}`)
  }
  void logAction({ module: 'compliance', entityType: 'control_tests', entityId: saved.id, entityName: `Control test (${t.result})`, action: 'create' })
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

/** Per-framework implementation rollup, derived live from `controls` —
 *  never stored. `total` counts in-scope controls only (not_applicable
 *  controls are out of scope and are not gaps). */
export interface FrameworkRollup {
  frameworkName: string
  implemented: number          // implemented or effective
  total: number                // in-scope controls mapped to the framework
  coveragePct: number | null   // null when the framework has no in-scope controls
}

export interface GapAnalysisResult {
  gaps: GapRecord[]
  rollups: FrameworkRollup[]
}

const HEALTHY_CONTROL_STATUSES = new Set(['implemented', 'effective'])

export async function fetchGaps(): Promise<GapAnalysisResult> {
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
  const rollupByFw = new Map<string, { implemented: number; total: number }>()
  for (const c of controls) {
    if (c.is_deleted) continue
    const status = String(c.status ?? '').toLowerCase()
    const impl = String(c.implementation_status ?? '').toLowerCase()
    // A control marked not applicable is out of scope — it is not a gap and
    // does not count toward framework coverage.
    if (status === 'not_applicable' || impl === 'not_applicable') continue
    const healthy = HEALTHY_CONTROL_STATUSES.has(status) || HEALTHY_CONTROL_STATUSES.has(impl)
    const fw = frameworkName(c)
    const roll = rollupByFw.get(fw) ?? { implemented: 0, total: 0 }
    roll.total += 1
    if (healthy) roll.implemented += 1
    rollupByFw.set(fw, roll)
    if (healthy) continue
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

  const rollups: FrameworkRollup[] = Array.from(rollupByFw.entries())
    .map(([fw, r]) => ({
      frameworkName: fw,
      implemented: r.implemented,
      total: r.total,
      coveragePct: r.total > 0 ? Math.round((r.implemented / r.total) * 100) : null,
    }))
    .sort((a, b) => a.frameworkName.localeCompare(b.frameworkName))

  return { gaps, rollups }
}
