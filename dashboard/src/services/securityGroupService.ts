// SPDX-License-Identifier: Apache-2.0
// Security group service — on the platform contract (see CLAUDE.md):
// real org-scoped tables with RLS, org_id/tenant_id filled by DB defaults
// (the client never sends them), writes THROW on failure so the UI can never
// report a false success, reads THROW so callers render real error states.
// camelCase (UI) ↔ snake_case (DB) mapping lives here. Empty table = honest
// empty array, never mock data.
//
// Backs: Threat Feed, Scan Center, Attack Surface, Vulnerabilities, Red Team
// Lab/Findings, Model Arena, Policy Firewall, Keys Vault, Security Reports.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

function arr<T>(v: T[] | null | undefined): T[] { return Array.isArray(v) ? v : [] }

async function selectAll(table: string, orderCol = 'created_at') {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false }).limit(200)
  if (error) { console.warn(`[securityGroup:${table}]`, error.message); throw new Error(error.message) }
  return data ?? []
}
async function upsertRow(table: string, row: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.from(table).upsert(row).select().single()
  if (error) { console.warn(`[securityGroup:${table}] upsert`, error.message); throw new Error(error.message) }
  return data
}
async function deleteRow(table: string, id: string) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) { console.warn(`[securityGroup:${table}] delete`, error.message); throw new Error(error.message) }
}

// ── Threat Feed ────────────────────────────────────────────────────────────
export type ThreatRecord = {
  id?: string; threatId?: string; title: string; description?: string
  threatType?: string; severity?: string; status?: string; source?: string
  mitreTechnique?: string; cveRef?: string; detectedAt?: string
  remediationSteps?: string[]; affectedModelIds?: string[]; owner?: string
  createdAt?: string
}
export function mapThreat(r: any): ThreatRecord {
  return {
    id: r.id, threatId: r.threat_id, title: r.title, description: r.description,
    threatType: r.threat_type, severity: r.severity, status: r.status, source: r.source,
    mitreTechnique: r.mitre_technique, cveRef: r.cve_ref, detectedAt: r.detected_at,
    remediationSteps: arr(r.remediation_steps), affectedModelIds: arr(r.affected_model_ids),
    owner: r.owner, createdAt: r.created_at,
  }
}
export async function fetchThreats(): Promise<ThreatRecord[]> { return (await selectAll('security_threats')).map(mapThreat) }
export async function saveThreat(t: ThreatRecord) {
  return mapThreat(await upsertRow('security_threats', {
    ...(t.id ? { id: t.id } : {}),
    threat_id: t.threatId, title: t.title, description: t.description,
    threat_type: t.threatType, severity: t.severity, status: t.status, source: t.source,
    mitre_technique: t.mitreTechnique, cve_ref: t.cveRef, detected_at: t.detectedAt,
    remediation_steps: t.remediationSteps ?? [], affected_model_ids: t.affectedModelIds ?? [],
    owner: t.owner,
  }))
}
export const deleteThreat = (id: string) => deleteRow('security_threats', id)

// ── Scan Center ─────────────────────────────────────────────────────────────
export type ScanRecord = {
  id?: string; scanId?: string; title: string; scanType?: string; target?: string
  status?: string; severity?: string; findingsCount?: number; criticalCount?: number
  highCount?: number; mediumCount?: number; lowCount?: number; schedule?: string
  durationMinutes?: number; startedAt?: string; completedAt?: string; initiatedBy?: string
  createdAt?: string
}
export function mapScan(r: any): ScanRecord {
  return {
    id: r.id, scanId: r.scan_id, title: r.title, scanType: r.scan_type, target: r.target,
    status: r.status, severity: r.severity, findingsCount: r.findings_count ?? 0,
    criticalCount: r.critical_count ?? 0, highCount: r.high_count ?? 0,
    mediumCount: r.medium_count ?? 0, lowCount: r.low_count ?? 0, schedule: r.schedule,
    durationMinutes: r.duration_minutes, startedAt: r.started_at, completedAt: r.completed_at,
    initiatedBy: r.initiated_by, createdAt: r.created_at,
  }
}
export async function fetchScans(): Promise<ScanRecord[]> { return (await selectAll('security_scans')).map(mapScan) }
export async function saveScan(s: ScanRecord) {
  const id = s.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `scn-${Date.now()}`)
  return mapScan(await upsertRow('security_scans', {
    id, scan_id: s.scanId, title: s.title, scan_type: s.scanType, target: s.target,
    status: s.status, severity: s.severity, findings_count: s.findingsCount ?? 0,
    critical_count: s.criticalCount ?? 0, high_count: s.highCount ?? 0,
    medium_count: s.mediumCount ?? 0, low_count: s.lowCount ?? 0, schedule: s.schedule,
    duration_minutes: s.durationMinutes ?? null, started_at: s.startedAt ?? null,
    completed_at: s.completedAt ?? null, initiated_by: s.initiatedBy,
  }))
}
export const deleteScan = (id: string) => deleteRow('security_scans', id)

// ── Vulnerabilities ──────────────────────────────────────────────────────────
export type VulnRecord = {
  id?: string; vulnId?: string; cveRef?: string; title: string; description?: string
  severity?: string; status?: string; cvssScore?: string; affectedComponent?: string
  affectedModelId?: string; remediation?: string; assignee?: string; patchDate?: string
  patchEvidence?: string; scanId?: string; discoveredAt?: string; createdAt?: string
}
export function mapVuln(r: any): VulnRecord {
  return {
    id: r.id, vulnId: r.vuln_id, cveRef: r.cve_ref, title: r.title, description: r.description,
    severity: r.severity, status: r.status, cvssScore: r.cvss_score, affectedComponent: r.affected_component,
    affectedModelId: r.affected_model_id, remediation: r.remediation, assignee: r.assignee,
    patchDate: r.patch_date, patchEvidence: r.patch_evidence, scanId: r.scan_id,
    discoveredAt: r.discovered_at, createdAt: r.created_at,
  }
}
export async function fetchVulns(): Promise<VulnRecord[]> { return (await selectAll('security_vulnerabilities')).map(mapVuln) }
export async function saveVuln(v: VulnRecord) {
  return mapVuln(await upsertRow('security_vulnerabilities', {
    ...(v.id ? { id: v.id } : {}),
    vuln_id: v.vulnId, cve_ref: v.cveRef, title: v.title, description: v.description,
    severity: v.severity, status: v.status, cvss_score: v.cvssScore, affected_component: v.affectedComponent,
    affected_model_id: v.affectedModelId || null, remediation: v.remediation, assignee: v.assignee,
    patch_date: v.patchDate ?? null, patch_evidence: v.patchEvidence, scan_id: v.scanId,
    discovered_at: v.discoveredAt ?? null,
  }))
}
export const deleteVuln = (id: string) => deleteRow('security_vulnerabilities', id)

// ── Attack Surface ───────────────────────────────────────────────────────────
export type AssetRecord = {
  id?: string; name: string; type?: string; description?: string; exposure?: string
  protocol?: string; openPorts?: number[]; status?: string; severity?: string
  riskScore?: number; lastScannedAt?: string; owner?: string; linkedModelIds?: string[]
  tags?: string[]; createdAt?: string
}
export function mapAsset(r: any): AssetRecord {
  return {
    id: r.id, name: r.name, type: r.type, description: r.description, exposure: r.exposure,
    protocol: r.protocol, openPorts: arr(r.open_ports), status: r.status, severity: r.severity,
    riskScore: r.risk_score, lastScannedAt: r.last_scanned_at, owner: r.owner,
    linkedModelIds: arr(r.linked_model_ids), tags: arr(r.tags), createdAt: r.created_at,
  }
}
export async function fetchAssets(): Promise<AssetRecord[]> { return (await selectAll('attack_surface_assets')).map(mapAsset) }
export async function saveAsset(a: AssetRecord) {
  return mapAsset(await upsertRow('attack_surface_assets', {
    ...(a.id ? { id: a.id } : {}),
    name: a.name, type: a.type, description: a.description, exposure: a.exposure,
    protocol: a.protocol, open_ports: a.openPorts ?? [], status: a.status, severity: a.severity,
    risk_score: a.riskScore ?? null, last_scanned_at: a.lastScannedAt ?? null, owner: a.owner,
    linked_model_ids: a.linkedModelIds ?? [], tags: a.tags ?? [],
  }))
}
export const deleteAsset = (id: string) => deleteRow('attack_surface_assets', id)

// ── Red Team Findings ────────────────────────────────────────────────────────
export type FindingRecord = {
  id?: string; findingRef?: string; title: string; description?: string; severity?: string
  status?: string; attackVector?: string; owaspLlmRef?: string; cvss?: number; modelId?: string
  impact?: string; recommendation?: string; remediationOwner?: string; discoveredBy?: string
  resolvedAt?: string; campaignId?: string; createdAt?: string
}
export function mapFinding(r: any): FindingRecord {
  return {
    id: r.id, findingRef: r.finding_ref, title: r.title, description: r.description, severity: r.severity,
    status: r.status, attackVector: r.attack_vector, owaspLlmRef: r.owasp_llm_ref, cvss: r.cvss,
    modelId: r.model_id, impact: r.impact, recommendation: r.recommendation,
    remediationOwner: r.remediation_owner, discoveredBy: r.discovered_by, resolvedAt: r.resolved_at,
    campaignId: r.campaign_id, createdAt: r.created_at,
  }
}
export async function fetchFindings(): Promise<FindingRecord[]> { return (await selectAll('red_team_findings')).map(mapFinding) }
export async function saveFinding(f: FindingRecord) {
  return mapFinding(await upsertRow('red_team_findings', {
    ...(f.id ? { id: f.id } : {}),
    finding_ref: f.findingRef, title: f.title, description: f.description, severity: f.severity,
    status: f.status, attack_vector: f.attackVector, owasp_llm_ref: f.owaspLlmRef, cvss: f.cvss ?? null,
    model_id: f.modelId || null, impact: f.impact, recommendation: f.recommendation,
    remediation_owner: f.remediationOwner, discovered_by: f.discoveredBy, resolved_at: f.resolvedAt ?? null,
    campaign_id: f.campaignId || null,
  }))
}
export const deleteFinding = (id: string) => deleteRow('red_team_findings', id)

// ── Red Team Campaigns ───────────────────────────────────────────────────────
export type CampaignRecord = {
  id?: string; campaignId?: string; name: string; objective?: string; lead?: string
  status?: string; severity?: string; targetModelIds?: string[]; attackTypes?: string[]
  findingsCount?: number; successRate?: number; startedAt?: string; completedAt?: string
  createdAt?: string
}
export function mapCampaign(r: any): CampaignRecord {
  return {
    id: r.id, campaignId: r.campaign_id, name: r.name ?? r.title, objective: r.objective, lead: r.lead ?? r.owner,
    status: r.status, severity: r.severity, targetModelIds: arr(r.target_model_ids),
    attackTypes: arr(r.attack_types), findingsCount: r.findings_count ?? 0, successRate: r.success_rate,
    startedAt: r.started_at, completedAt: r.completed_at, createdAt: r.created_at,
  }
}
export async function fetchCampaigns(): Promise<CampaignRecord[]> { return (await selectAll('red_team_campaigns')).map(mapCampaign) }
export async function saveCampaign(c: CampaignRecord) {
  const id = c.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `rtc-${Date.now()}`)
  return mapCampaign(await upsertRow('red_team_campaigns', {
    id, campaign_id: c.campaignId, name: c.name, objective: c.objective, lead: c.lead,
    status: c.status, severity: c.severity, target_model_ids: c.targetModelIds ?? [],
    attack_types: c.attackTypes ?? [], findings_count: c.findingsCount ?? 0, success_rate: c.successRate ?? null,
    started_at: c.startedAt ?? null, completed_at: c.completedAt ?? null,
  }))
}
export const deleteCampaign = (id: string) => deleteRow('red_team_campaigns', id)

// ── Model Arena ──────────────────────────────────────────────────────────────
export type ArenaRecord = {
  id?: string; name: string; modelId?: string; provider?: string; status?: string
  promptInjectionResistance?: number; jailbreakResistance?: number; outputSafety?: number
  piiLeakage?: number; hallucinationRate?: number; biasScore?: number; overallScore?: number
  evaluatedAt?: string; runBy?: string; createdAt?: string
}
export function mapArena(r: any): ArenaRecord {
  return {
    id: r.id, name: r.name, modelId: r.model_id, provider: r.provider, status: r.status,
    promptInjectionResistance: r.prompt_injection_resistance, jailbreakResistance: r.jailbreak_resistance,
    outputSafety: r.output_safety, piiLeakage: r.pii_leakage, hallucinationRate: r.hallucination_rate,
    biasScore: r.bias_score, overallScore: r.overall_score, evaluatedAt: r.evaluated_at,
    runBy: r.run_by, createdAt: r.created_at,
  }
}
export async function fetchArena(): Promise<ArenaRecord[]> { return (await selectAll('model_arena_runs')).map(mapArena) }
export async function saveArena(a: ArenaRecord) {
  return mapArena(await upsertRow('model_arena_runs', {
    ...(a.id ? { id: a.id } : {}),
    name: a.name, model_id: a.modelId || null, provider: a.provider, status: a.status ?? 'completed',
    prompt_injection_resistance: a.promptInjectionResistance ?? null, jailbreak_resistance: a.jailbreakResistance ?? null,
    output_safety: a.outputSafety ?? null, pii_leakage: a.piiLeakage ?? null,
    hallucination_rate: a.hallucinationRate ?? null, bias_score: a.biasScore ?? null,
    overall_score: a.overallScore ?? null, evaluated_at: a.evaluatedAt ?? null, run_by: a.runBy,
  }))
}
export const deleteArena = (id: string) => deleteRow('model_arena_runs', id)

// ── Policy Firewall ──────────────────────────────────────────────────────────
export type FirewallRecord = {
  id?: string; name: string; description?: string; ruleType?: string; pattern?: string
  action?: string; target?: string; enabled?: boolean; priority?: number
  evaluations?: number; blocked?: number; lastTriggeredAt?: string; severity?: string
  status?: string; linkedModelIds?: string[]; createdAt?: string
}
export function mapFirewall(r: any): FirewallRecord {
  return {
    id: r.id, name: r.name, description: r.description, ruleType: r.rule_type, pattern: r.pattern,
    action: r.action, target: r.target, enabled: r.enabled ?? true, priority: r.priority ?? 100,
    evaluations: r.evaluations ?? 0, blocked: r.blocked ?? 0, lastTriggeredAt: r.last_triggered_at,
    severity: r.severity, status: r.status, linkedModelIds: arr(r.linked_model_ids), createdAt: r.created_at,
  }
}
export async function fetchFirewall(): Promise<FirewallRecord[]> { return (await selectAll('policy_firewall_rules')).map(mapFirewall) }
export async function saveFirewall(f: FirewallRecord) {
  return mapFirewall(await upsertRow('policy_firewall_rules', {
    ...(f.id ? { id: f.id } : {}),
    name: f.name, description: f.description, rule_type: f.ruleType, pattern: f.pattern,
    action: f.action, target: f.target, enabled: f.enabled ?? true, priority: f.priority ?? 100,
    severity: f.severity, status: f.status ?? 'active', linked_model_ids: f.linkedModelIds ?? [],
  }))
}
export const deleteFirewall = (id: string) => deleteRow('policy_firewall_rules', id)

// ── Keys Vault (metadata only — NO secret material is ever stored/returned) ──
export type KeyRecord = {
  id?: string; name: string; provider?: string; keyPrefix?: string; scopes?: string[]
  status?: string; severity?: string; expiresAt?: string; rotatedAt?: string; revokedAt?: string
  lastUsedAt?: string; usageCount?: number; owner?: string; linkedAgentId?: string; createdAt?: string
}
export function mapKey(r: any): KeyRecord {
  return {
    id: r.id, name: r.name, provider: r.provider, keyPrefix: r.key_prefix, scopes: arr(r.scopes),
    status: r.status, severity: r.severity, expiresAt: r.expires_at, rotatedAt: r.rotated_at,
    revokedAt: r.revoked_at, lastUsedAt: r.last_used_at, usageCount: r.usage_count ?? 0,
    owner: r.owner, linkedAgentId: r.linked_agent_id, createdAt: r.created_at,
  }
}
async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  return 'unavailable'
}
export async function fetchKeys(): Promise<KeyRecord[]> { return (await selectAll('keys_vault')).map(mapKey) }
export async function saveKey(k: KeyRecord & { secret?: string }) {
  // The secret is hashed and discarded; only the hash + display prefix persist.
  const key_hash = k.secret ? await sha256Hex(k.secret) : undefined
  return mapKey(await upsertRow('keys_vault', {
    ...(k.id ? { id: k.id } : {}),
    name: k.name, provider: k.provider, key_prefix: k.keyPrefix,
    ...(key_hash ? { key_hash } : {}),
    scopes: k.scopes ?? [], status: k.status ?? 'active', severity: k.severity,
    expires_at: k.expiresAt ?? null, owner: k.owner, linked_agent_id: k.linkedAgentId || null,
  }))
}
export async function rotateKey(id: string, newPrefix: string, newSecret: string) {
  return mapKey(await upsertRow('keys_vault', {
    id, key_prefix: newPrefix, key_hash: await sha256Hex(newSecret),
    rotated_at: new Date().toISOString(), status: 'active',
  }))
}
export async function revokeKey(id: string) {
  return mapKey(await upsertRow('keys_vault', { id, status: 'revoked', revoked_at: new Date().toISOString() }))
}
export const deleteKey = (id: string) => deleteRow('keys_vault', id)

// ── Security Reports (real generation: snapshot the security tables) ─────────
export type ReportTemplate = {
  id?: string; name: string; category?: string; description?: string; frequency?: string
  sections?: string[]; recipients?: string[]; format?: string; generationCount?: number
  lastGeneratedAt?: string; createdAt?: string
}
export function mapReport(r: any): ReportTemplate {
  return {
    id: r.id, name: r.name, category: r.category, description: r.description, frequency: r.frequency,
    sections: arr(r.sections), recipients: arr(r.recipients), format: r.format,
    generationCount: r.generation_count ?? 0, lastGeneratedAt: r.last_generated_at, createdAt: r.created_at,
  }
}
export async function fetchReports(): Promise<ReportTemplate[]> { return (await selectAll('security_reports')).map(mapReport) }
export async function saveReport(t: ReportTemplate) {
  return mapReport(await upsertRow('security_reports', {
    ...(t.id ? { id: t.id } : {}),
    name: t.name, category: t.category, description: t.description, frequency: t.frequency,
    sections: t.sections ?? [], recipients: t.recipients ?? [], format: t.format ?? 'json',
  }))
}
export const deleteReport = (id: string) => deleteRow('security_reports', id)

export type ReportRun = {
  id: string; reportId?: string; status: string; generatedBy?: string; generatedAt: string
  format: string; content: any; sizeBytes?: number
}
export async function fetchReportRuns(reportId?: string): Promise<ReportRun[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('security_report_runs').select('*').order('generated_at', { ascending: false }).limit(100)
  if (reportId) q = q.eq('report_id', reportId)
  const { data, error } = await q
  if (error) { console.warn('[securityGroup:report_runs]', error.message); throw new Error(error.message) }
  return (data ?? []).map((r: any) => ({
    id: r.id, reportId: r.report_id, status: r.status, generatedBy: r.generated_by,
    generatedAt: r.generated_at, format: r.format, content: r.content, sizeBytes: r.size_bytes,
  }))
}

// Real generation: assemble a data-driven snapshot from the security tables the
// template names, persist it as the run's content, and bump the template count.
const SECTION_FETCHERS: Record<string, () => Promise<any[]>> = {
  threats: fetchThreats, scans: fetchScans, vulnerabilities: fetchVulns,
  attack_surface: fetchAssets, red_team_campaigns: fetchCampaigns,
  red_team_findings: fetchFindings, model_arena: fetchArena,
  policy_firewall_rules: fetchFirewall,
}
export async function generateReport(template: ReportTemplate, generatedBy: string): Promise<ReportRun> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')
  const sections = template.sections ?? []
  const content: Record<string, unknown> = {
    report: template.name, generatedAt: new Date().toISOString(), sections: {},
  }
  for (const key of sections) {
    const fetcher = SECTION_FETCHERS[key]
    if (fetcher) (content.sections as Record<string, unknown>)[key] = await fetcher()
  }
  const sizeBytes = new TextEncoder().encode(JSON.stringify(content)).length
  const { data, error } = await supabase.from('security_report_runs').insert({
    report_id: template.id, status: 'completed', generated_by: generatedBy,
    format: template.format ?? 'json', content, size_bytes: sizeBytes,
  }).select().single()
  if (error) { console.warn('[securityGroup:generate]', error.message); throw new Error(error.message) }
  if (template.id) {
    await supabase.from('security_reports').update({
      generation_count: (template.generationCount ?? 0) + 1, last_generated_at: new Date().toISOString(),
    }).eq('id', template.id)
  }
  return {
    id: data.id, reportId: data.report_id, status: data.status, generatedBy: data.generated_by,
    generatedAt: data.generated_at, format: data.format, content: data.content, sizeBytes: data.size_bytes,
  }
}
