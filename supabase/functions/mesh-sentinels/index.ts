// deno-lint-ignore-file no-explicit-any
/**
 * mesh-sentinels (Supabase Edge Function)
 *
 * The always-on half of the Agentic Mesh: runs the 10 continuous sentinel
 * sweeps server-side with the service role, for every organization (or one
 * org when invoked with {"orgId": "..."}). Scheduled by pg_cron every 10
 * minutes (see 20260816000001_agentic_mesh_fleet.sql); also invocable from the
 * mesh UI ("Run server sweep").
 *
 * Writes the SAME ledgers as the browser runner
 * (dashboard/src/lib/governance/sentinelRunner.ts):
 *   agent_executions (event_type SENTINEL_SWEEP), mesh_agent_state
 *   heartbeats, and governance_events emissions that feed the cascades.
 *
 * NOTE: service role bypasses RLS — every query here MUST be explicitly
 * org-scoped: uuid tables via org_id, legacy tables via tenant_id (text).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getSupabase } from '../_shared/agentRunner.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Finding {
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  entityType?: string
  entityId?: string
}
interface SweepResult {
  status: 'succeeded' | 'failed' | 'skipped'
  findings: Finding[]
  summary: string
  error?: string
  metrics?: Record<string, number>
}
interface Ctx {
  sb: SupabaseClient
  orgId: string
  since: string
  emit: (type: string, payload: Record<string, unknown>, idempotencyKey: string) => Promise<void>
}
type Sweep = (ctx: Ctx) => Promise<SweepResult>

const day = () => new Date().toISOString().slice(0, 10)

// ─── The 10 sentinels (server ports of dashboard/src/agents/sentinels) ──────

const policyEnforcement: Sweep = async ({ sb, orgId, since, emit }) => {
  const { data, error } = await sb.from('trust_traces')
    .select('id, model_id, injection_detected, pii_detected, toxicity_detected, intent_violation')
    .eq('tenant_id', orgId).gte('created_at', since).limit(500)
  if (error) return { status: 'failed', findings: [], summary: 'trust_traces query failed', error: error.message }
  const flagged = (data ?? []).filter((t: any) => t.injection_detected || t.pii_detected || t.toxicity_detected || t.intent_violation)
  const findings: Finding[] = flagged.map((t: any) => ({
    title: 'Trace flagged by policy firewall', severity: t.injection_detected ? 'HIGH' : 'MEDIUM', entityType: 'trace', entityId: t.id,
  }))
  const byModel = new Map<string, number>()
  for (const t of flagged) if (t.model_id) byModel.set(t.model_id, (byModel.get(t.model_id) ?? 0) + 1)
  for (const [modelId, count] of byModel) {
    if (count < 3) continue
    await emit('RISK_DETECTED', {
      source: 'SECURITY', severity: 'HIGH', affectedModels: [modelId],
      title: `Policy firewall: ${count} flagged traces in sweep window`,
      detectedAt: new Date().toISOString(),
    }, `POLICY_BREACH:${modelId}:${day()}`)
  }
  return { status: 'succeeded', findings, summary: `Scanned ${(data ?? []).length} traces — ${flagged.length} flagged.`, metrics: { tracesScanned: (data ?? []).length, flagged: flagged.length } }
}

const driftDetection: Sweep = async ({ sb, orgId, emit }) => {
  const { data, error } = await sb.from('ai_models')
    .select('id, name, is_active, drift_status, drift_score').eq('org_id', orgId)
  if (error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: error.message }
  const active = (data ?? []).filter((m: any) => m.is_active !== false)
  const measured = active.filter((m: any) => m.drift_score !== null || (m.drift_status && m.drift_status !== ''))
  const drifting = measured.filter((m: any) =>
    (m.drift_status && !['stable', 'ok', 'none'].includes(String(m.drift_status).toLowerCase())) ||
    (m.drift_score !== null && m.drift_score >= 0.25))
  const findings: Finding[] = drifting.map((m: any) => ({
    title: `Drift on ${m.name}`, severity: (m.drift_score ?? 0) >= 0.5 ? 'HIGH' : 'MEDIUM', entityType: 'model', entityId: m.id,
  }))
  for (const m of drifting) {
    await emit('DRIFT_DETECTED', {
      source: 'DRIFT', severity: (m.drift_score ?? 0) >= 0.5 ? 'HIGH' : 'MEDIUM', affectedModels: [m.id],
      title: `Model drift detected: ${m.name}`,
      description: `drift_status=${m.drift_status ?? 'n/a'} drift_score=${m.drift_score ?? 'n/a'}`,
      detectedAt: new Date().toISOString(),
    }, `DRIFT:${m.id}:${day()}`)
  }
  return {
    status: 'succeeded', findings,
    summary: measured.length === 0
      ? `No drift telemetry recorded yet for ${active.length} active models.`
      : `Evaluated ${measured.length}/${active.length} models — ${drifting.length} drifting.`,
    metrics: { activeModels: active.length, drifting: drifting.length },
  }
}

const biasMonitor: Sweep = async ({ sb, orgId, emit }) => {
  const [modelsRes, auditsRes] = await Promise.all([
    sb.from('ai_models').select('id, name, is_active, fairness_score').eq('org_id', orgId),
    sb.from('bias_audits').select('model_id, status, created_at').eq('tenant_id', orgId).order('created_at', { ascending: false }).limit(1000),
  ])
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }
  const models = (modelsRes.data ?? []).filter((m: any) => m.is_active !== false)
  const audits = auditsRes.data ?? []
  const cutoff = Date.now() - 90 * 86400_000
  const latest = new Map<string, any>()
  const pending = new Set<string>()
  for (const a of audits as any[]) {
    if (!a.model_id) continue
    if (!latest.has(a.model_id)) latest.set(a.model_id, a)
    if (['queued', 'draft', 'in progress', 'running'].includes(String(a.status ?? '').toLowerCase())) pending.add(a.model_id)
  }
  const findings: Finding[] = []
  let queued = 0
  for (const m of models as any[]) {
    const low = m.fairness_score !== null && m.fairness_score < 0.8
    const last = latest.get(m.id)
    const stale = !last || new Date(last.created_at).getTime() < cutoff
    if (low) {
      findings.push({ title: `Fairness ${m.fairness_score} below 0.8 on ${m.name}`, severity: 'HIGH', entityType: 'model', entityId: m.id })
      await emit('RISK_DETECTED', {
        source: 'FAIRNESS', severity: 'HIGH', affectedModels: [m.id],
        title: `Fairness degradation on ${m.name}`, detectedAt: new Date().toISOString(),
      }, `FAIRNESS:${m.id}:${day()}`)
    } else if (stale) {
      findings.push({ title: `Bias audit coverage stale/missing on ${m.name}`, severity: 'MEDIUM', entityType: 'model', entityId: m.id })
    }
    if ((low || stale) && !pending.has(m.id)) {
      const ins = await sb.from('bias_audits').insert({
        tenant_id: orgId, model_id: m.id, status: 'Queued', triggered_by: 'mesh-sentinel:BiasMonitor',
      }).select('id').single()
      if (!ins.error) queued++
    }
  }
  return { status: 'succeeded', findings, summary: `Checked ${models.length} models — ${findings.length} gaps, ${queued} audits queued.`, metrics: { models: models.length, auditsQueued: queued } }
}

const dataLineage: Sweep = async ({ sb, orgId, emit }) => {
  const [dsRes, mRes] = await Promise.all([
    sb.from('datasets').select('id, name, contains_pii, last_audit_date, linked_models').eq('tenant_id', orgId),
    sb.from('ai_models').select('id, name, is_active').eq('org_id', orgId),
  ])
  if (dsRes.error) return { status: 'failed', findings: [], summary: 'datasets query failed', error: dsRes.error.message }
  const datasets = dsRes.data ?? []
  const models = (mRes.data ?? []).filter((m: any) => m.is_active !== false)
  const cutoff = Date.now() - 180 * 86400_000
  const findings: Finding[] = []
  for (const d of datasets as any[]) {
    if (!d.contains_pii) continue
    const ok = d.last_audit_date && new Date(d.last_audit_date).getTime() >= cutoff
    if (!ok) findings.push({ title: `PII dataset "${d.name}" lacks fresh audit`, severity: 'HIGH', entityType: 'dataset', entityId: d.id })
  }
  const linked = new Set<string>()
  for (const d of datasets as any[]) for (const v of (Array.isArray(d.linked_models) ? d.linked_models : [])) if (typeof v === 'string') linked.add(v)
  const orphaned = (models as any[]).filter((m) => !linked.has(m.id) && !linked.has(m.name))
  for (const m of orphaned) findings.push({ title: `No dataset lineage for model ${m.name}`, severity: 'MEDIUM', entityType: 'model', entityId: m.id })
  if (findings.length > 0) {
    await emit('DATA_GOVERNANCE_CHECK', {
      gaps: findings.length, lineageGaps: orphaned.map((m: any) => m.id), detectedAt: new Date().toISOString(),
    }, `LINEAGE:${orgId}:${day()}`)
  }
  return { status: 'succeeded', findings, summary: `Verified ${datasets.length} datasets / ${models.length} models — ${findings.length} gaps.` }
}

const incidentTriage: Sweep = async ({ sb, orgId, emit }) => {
  const { data, error } = await sb.from('incidents')
    .select('id, title, severity, status, incident_type, assignee, detected_at, created_at, affected_users_count')
    .eq('tenant_id', orgId).in('status', ['open', 'OPEN', 'investigating', 'triage']).limit(500)
  if (error) return { status: 'failed', findings: [], summary: 'incidents query failed', error: error.message }
  const findings: Finding[] = []
  let triaged = 0
  for (const inc of (data ?? []) as any[]) {
    if (!inc.severity || !inc.assignee) {
      const type = String(inc.incident_type ?? '').toLowerCase()
      let severity = 'medium'
      if (type.includes('breach') || (inc.affected_users_count ?? 0) > 10_000) severity = 'critical'
      else if (type.includes('security') || type.includes('model_failure')) severity = 'high'
      const assignee = severity === 'critical' ? 'ciso' : severity === 'high' ? 'head-of-risk' : 'incident-manager'
      const up = await sb.from('incidents').update({
        severity: inc.severity ?? severity, assignee: inc.assignee ?? assignee,
      }).eq('id', inc.id)
      if (!up.error) {
        triaged++
        findings.push({ title: `Triaged "${inc.title}"`, severity: 'INFO', entityType: 'incident', entityId: inc.id })
      }
    }
    const sev = String(inc.severity ?? '').toLowerCase()
    const sla = sev === 'critical' ? 4 : sev === 'high' ? 24 : 0
    if (sla) {
      const ageH = (Date.now() - new Date(inc.detected_at ?? inc.created_at).getTime()) / 3600_000
      if (ageH > sla) {
        findings.push({ title: `SLA breached on "${inc.title}" (${Math.round(ageH)}h)`, severity: sev === 'critical' ? 'CRITICAL' : 'HIGH', entityType: 'incident', entityId: inc.id })
        await emit('SLA_BREACHED', {
          source: 'VENDOR_SLA', severity: sev === 'critical' ? 'CRITICAL' : 'HIGH', affectedModels: [],
          title: `Incident SLA breached: ${inc.title}`, detectedAt: new Date().toISOString(), incidentId: inc.id,
        }, `INC_SLA:${inc.id}:${day()}`)
      }
    }
  }
  return { status: 'succeeded', findings, summary: `Reviewed ${(data ?? []).length} open incidents — ${triaged} triaged.`, metrics: { triaged } }
}

const complianceCheck: Sweep = async ({ sb, orgId, emit }) => {
  const [mRes, cRes] = await Promise.all([
    sb.from('ai_models').select('id, name, is_active, is_regulated, risk_tier').eq('org_id', orgId),
    sb.from('controls').select('id, framework, status, implementation_status').eq('tenant_id', orgId).limit(2000),
  ])
  if (mRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: mRes.error.message }
  const models = (mRes.data ?? []).filter((m: any) => m.is_active !== false)
  const controls = cRes.data ?? []
  const highTier = (models as any[]).filter((m) => {
    const tier = String(m.risk_tier ?? '').toLowerCase()
    return m.is_regulated === true || tier.includes('high') || tier.includes('1') || tier.includes('unacceptable')
  })
  const impl = new Set(['implemented', 'operating', 'effective', 'complete', 'completed'])
  const per = new Map<string, { total: number; implemented: number }>()
  for (const c of controls as any[]) {
    const fw = c.framework ?? 'UNMAPPED'
    const b = per.get(fw) ?? { total: 0, implemented: 0 }
    b.total++
    if (impl.has(String(c.implementation_status ?? c.status ?? '').toLowerCase())) b.implemented++
    per.set(fw, b)
  }
  const findings: Finding[] = []
  if (highTier.length > 0 && controls.length === 0) {
    findings.push({ title: `${highTier.length} high-tier models with no controls in register`, severity: 'CRITICAL' })
  }
  for (const [fw, { total, implemented }] of per) {
    if (total > 0 && implemented / total < 0.5) {
      findings.push({ title: `${fw}: ${implemented}/${total} controls implemented`, severity: highTier.length > 0 ? 'HIGH' : 'MEDIUM' })
    }
  }
  if (findings.length > 0) {
    await emit('CONTROL_GAP_FOUND', {
      gaps: findings.map((f) => f.title), highTierModels: highTier.map((m: any) => m.id), detectedAt: new Date().toISOString(),
    }, `CTRL_GAP:${orgId}:${day()}`)
  }
  return { status: 'succeeded', findings, summary: `Mapped ${highTier.length} high-tier models against ${controls.length} controls — ${findings.length} gaps.` }
}

const accessAudit: Sweep = async ({ sb, orgId, emit }) => {
  const [credsRes, agentsRes] = await Promise.all([
    sb.from('agent_gov_credentials').select('id, doc').eq('org_id', orgId).is('deleted_at', null).limit(1000),
    sb.from('agents').select('id, name, status, governance_status').eq('tenant_id', orgId).limit(1000),
  ])
  if (credsRes.error) return { status: 'failed', findings: [], summary: 'credentials query failed', error: credsRes.error.message }
  const findings: Finding[] = []
  for (const c of (credsRes.data ?? []) as any[]) {
    const d = c.doc ?? {}
    if (String(d.status ?? '').toLowerCase() !== 'active') continue
    if (d.expires && new Date(d.expires).getTime() < Date.now()) {
      findings.push({ title: `Expired credential still Active (${d.agentName ?? c.id})`, severity: 'HIGH', entityType: 'credential', entityId: c.id })
    }
    const scopes: string[] = d.scopes ?? []
    const roles: string[] = d.roles ?? []
    if (scopes.some((s) => s.trim() === '*' || s.trim().endsWith(':*')) || roles.some((r) => r.toLowerCase().includes('admin'))) {
      findings.push({ title: `Over-privileged credential (${d.agentName ?? c.id})`, severity: 'HIGH', entityType: 'credential', entityId: c.id })
    }
  }
  for (const a of (agentsRes.data ?? []) as any[]) {
    const live = ['active', 'confirmed', 'approved'].includes(String(a.status ?? '').toLowerCase())
    if (live && String(a.governance_status ?? 'pending').toLowerCase() === 'pending') {
      findings.push({ title: `Agent "${a.name}" active without governance review`, severity: 'MEDIUM', entityType: 'agent', entityId: a.id })
    }
  }
  const high = findings.filter((f) => f.severity === 'HIGH')
  if (high.length > 0) {
    await emit('RISK_DETECTED', {
      source: 'SECURITY', severity: 'HIGH', affectedModels: [],
      title: `Access audit: ${high.length} privilege findings`, detectedAt: new Date().toISOString(),
    }, `ACCESS_AUDIT:${orgId}:${day()}`)
  }
  return { status: 'succeeded', findings, summary: `Audited ${(credsRes.data ?? []).length} credentials, ${(agentsRes.data ?? []).length} agents — ${findings.length} findings.` }
}

const explainability: Sweep = async ({ sb, orgId, emit }) => {
  const [mRes, eRes] = await Promise.all([
    sb.from('ai_models').select('id, name, is_active, is_regulated, version').eq('org_id', orgId),
    sb.from('model_explanations').select('model_id, model_version, computed_at').eq('org_id', orgId).order('computed_at', { ascending: false }).limit(2000),
  ])
  if (mRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: mRes.error.message }
  const models = (mRes.data ?? []).filter((m: any) => m.is_active !== false)
  const latest = new Map<string, any>()
  for (const e of (eRes.data ?? []) as any[]) if (!latest.has(e.model_id)) latest.set(e.model_id, e)
  const cutoff = Date.now() - 180 * 86400_000
  const findings: Finding[] = []
  for (const m of models as any[]) {
    const last = latest.get(m.id)
    const fresh = last && new Date(last.computed_at).getTime() >= cutoff
    const versionMatch = !last?.model_version || !m.version || last.model_version === m.version
    if (!last || !fresh || !versionMatch) {
      findings.push({ title: `Explainability gap on ${m.name}`, severity: m.is_regulated ? 'HIGH' : 'MEDIUM', entityType: 'model', entityId: m.id })
      if (m.is_regulated) {
        await emit('RISK_DETECTED', {
          source: 'REGULATORY', severity: 'MEDIUM', affectedModels: [m.id],
          title: `Regulated model ${m.name} lacks current explainability record`,
          detectedAt: new Date().toISOString(),
        }, `XAI_GAP:${m.id}:${day()}`)
      }
    }
  }
  return { status: 'succeeded', findings, summary: `Checked ${models.length} models — ${findings.length} explainability gaps.` }
}

const changeDetection: Sweep = async ({ sb, orgId, emit }) => {
  const [mRes, fRes] = await Promise.all([
    sb.from('ai_models').select('id, name, version, provider, model_type').eq('org_id', orgId),
    sb.from('mesh_model_fingerprints').select('model_id, fingerprint, version_seen').eq('org_id', orgId),
  ])
  if (mRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: mRes.error.message }
  const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h.toString(36) }
  const known = new Map(((fRes.data ?? []) as any[]).map((p) => [p.model_id, p]))
  const findings: Finding[] = []
  let baselined = 0
  for (const m of (mRes.data ?? []) as any[]) {
    const fp = hash(`${m.version ?? ''}|${m.provider ?? ''}|${m.model_type ?? ''}`)
    const prior = known.get(m.id)
    if (!prior) {
      const ins = await sb.from('mesh_model_fingerprints').insert({ org_id: orgId, model_id: m.id, fingerprint: fp, version_seen: m.version })
      if (!ins.error) baselined++
      continue
    }
    if (prior.fingerprint !== fp) {
      findings.push({ title: `Model ${m.name} changed: ${prior.version_seen ?? '?'} → ${m.version ?? '?'}`, severity: 'HIGH', entityType: 'model', entityId: m.id })
      await sb.from('mesh_model_fingerprints').update({ fingerprint: fp, version_seen: m.version, seen_at: new Date().toISOString() })
        .eq('org_id', orgId).eq('model_id', m.id)
      await emit('MODEL_UPDATED', {
        modelId: m.id, modelName: m.name, previousVersion: prior.version_seen, newVersion: m.version,
        detectedBy: 'ChangeDetection', detectedAt: new Date().toISOString(),
      }, `CHANGE:${m.id}:${fp}`)
      await sb.from('bias_audits').insert({ tenant_id: orgId, model_id: m.id, status: 'Queued', triggered_by: 'mesh-sentinel:ChangeDetection' })
    }
  }
  return { status: 'succeeded', findings, summary: `Fingerprinted ${(mRes.data ?? []).length} models — ${baselined} baselined, ${findings.length} changes.` }
}

const reporting: Sweep = async ({ sb, orgId }) => {
  const windowStart = new Date(Date.now() - 20 * 3600_000).toISOString()
  const recent = await sb.from('notifications').select('id').eq('tenant_id', orgId)
    .eq('notification_type', 'mesh_digest').gte('created_at', windowStart).limit(1)
  if ((recent.data ?? []).length > 0) return { status: 'skipped', findings: [], summary: 'Digest already compiled in the last 20h.' }
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const [events, execs, risks, incidents, models] = await Promise.all([
    sb.from('governance_events').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', dayAgo),
    sb.from('agent_executions').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'failed').gte('started_at', dayAgo),
    sb.from('risks').select('id', { count: 'exact', head: true }).eq('tenant_id', orgId).in('status', ['open', 'OPEN']),
    sb.from('incidents').select('id', { count: 'exact', head: true }).eq('tenant_id', orgId).in('status', ['open', 'OPEN', 'investigating']),
    sb.from('ai_models').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ])
  const lines = [
    `Governance events (24h): ${events.count ?? 0}`,
    `Agent execution failures (24h): ${execs.count ?? 0}`,
    `Open risks: ${risks.count ?? 0}`,
    `Open incidents: ${incidents.count ?? 0}`,
    `Models under governance: ${models.count ?? 0}`,
  ]
  const content = lines.join(' · ')
  const notif = await sb.from('notifications').insert({
    tenant_id: orgId, title: 'AI governance daily digest', message: content,
    notification_type: 'mesh_digest', entity_type: 'mesh', is_read: false,
  })
  if (notif.error) return { status: 'failed', findings: [], summary: 'notifications write failed', error: notif.error.message }
  // Server-only: executive digest row (service-role write policy).
  await sb.from('executive_digests').insert({ org_id: orgId, content, model_used: 'mesh-reporting-sentinel' })
  return { status: 'succeeded', findings: [{ title: 'Compiled daily governance digest', severity: 'INFO' }], summary: `Digest compiled: ${content}.` }
}

const FLEET: { name: string; run: Sweep }[] = [
  { name: 'PolicyEnforcement', run: policyEnforcement },
  { name: 'DriftDetection', run: driftDetection },
  { name: 'BiasMonitor', run: biasMonitor },
  { name: 'DataLineage', run: dataLineage },
  { name: 'IncidentTriage', run: incidentTriage },
  { name: 'ComplianceCheck', run: complianceCheck },
  { name: 'AccessAudit', run: accessAudit },
  { name: 'Explainability', run: explainability },
  { name: 'ChangeDetection', run: changeDetection },
  { name: 'Reporting', run: reporting },
]

// ─── Runner ──────────────────────────────────────────────────────────────────

function hashKey(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h.toString(36)
}

async function sweepOrg(sb: SupabaseClient, orgId: string, only?: string[]) {
  const { data: stateRows } = await sb.from('mesh_agent_state')
    .select('agent_name, is_enabled, last_heartbeat_at, total_sweeps, consecutive_failures')
    .eq('org_id', orgId)
  const state = new Map((stateRows ?? []).map((r: any) => [r.agent_name, r]))
  const results: Record<string, unknown>[] = []

  for (const sentinel of FLEET) {
    if (only && !only.includes(sentinel.name)) continue
    const st = state.get(sentinel.name)
    if (st && !st.is_enabled && !only) continue

    // Respect per-sentinel sweep intervals when running on the cron schedule.
    const sinceMs = st?.last_heartbeat_at
      ? Math.max(new Date(st.last_heartbeat_at).getTime(), Date.now() - 24 * 3600_000)
      : Date.now() - 24 * 3600_000

    const emit = async (type: string, payload: Record<string, unknown>, idempotencyKey: string) => {
      await sb.from('governance_events').insert({
        org_id: orgId, event_type: type, source_module: `mesh-sentinel:${sentinel.name}`,
        payload, status: 'pending', cascade_depth: 0,
        idempotency_key: idempotencyKey ?? `${type}:${hashKey(JSON.stringify(payload))}:0`,
        trace_id: `mesh-${Date.now().toString(36)}`,
      })
    }

    const started = Date.now()
    let result: SweepResult
    try {
      result = await sentinel.run({ sb, orgId, since: new Date(sinceMs).toISOString(), emit })
    } catch (e) {
      result = { status: 'failed', findings: [], summary: 'Sweep crashed.', error: (e as Error).message }
    }
    const durationMs = Date.now() - started

    await sb.from('agent_executions').insert({
      org_id: orgId, agent_name: sentinel.name, event_type: 'SENTINEL_SWEEP',
      status: result.status, finished_at: new Date().toISOString(), duration_ms: durationMs,
      output: { summary: result.summary, findings: result.findings.slice(0, 50), metrics: result.metrics ?? {} },
      error: result.error ?? null, trace_id: `sweep-${started.toString(36)}`,
    })
    await sb.from('mesh_agent_state').upsert({
      org_id: orgId, agent_name: sentinel.name,
      last_heartbeat_at: new Date().toISOString(),
      last_sweep_status: result.status,
      last_findings_count: result.findings.length,
      total_sweeps: (st?.total_sweeps ?? 0) + 1,
      consecutive_failures: result.status === 'failed' ? (st?.consecutive_failures ?? 0) + 1 : 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,agent_name' })

    results.push({ agent: sentinel.name, status: result.status, findings: result.findings.length, durationMs })
  }
  return results
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = (await req.json().catch(() => ({}))) as { orgId?: string; agents?: string[] }
  const sb = getSupabase()

  try {
    let orgIds: string[]
    if (body.orgId) {
      orgIds = [body.orgId]
    } else {
      const { data, error } = await sb.from('organizations').select('id')
      if (error) throw new Error(error.message)
      orgIds = (data ?? []).map((o: any) => o.id)
    }

    const out: Record<string, unknown> = {}
    for (const orgId of orgIds) {
      out[orgId] = await sweepOrg(sb, orgId, body.agents)
    }
    return new Response(JSON.stringify({ ok: true, orgs: orgIds.length, results: out }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
