// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// integrationFindingsService — the collected evidence and its control links.
//
// An integration sync produces `integration_findings` (one row per check, e.g.
// 'github.org.mfa_required'). The Python mapper
// (`sentinel/integrations/control_mapping.py`) then writes
// `control_finding_evidence`, linking a finding to the org controls it
// evidences.
//
// Both tables are written server-side only (service-role RLS); the browser
// READS them. That separation is deliberate: automated evidence must not be
// authorable from the UI, or it stops being evidence.
//
// `control_finding_evidence` is kept apart from `controls.status` on purpose —
// automated evidence is a signal about a control, not a human's assertion
// about it. A FAILED finding does not silently flip a control the owner has
// marked implemented; it surfaces the contradiction so a person resolves it.
//
// Reads THROW so a failure renders an error state, never "no evidence".

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type FindingStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_AVAILABLE'
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

/** One automated check result collected from a connected integration. */
export interface IntegrationFinding {
  id: string
  integrationId: string
  /** Stable check identifier, e.g. 'github.org.mfa_required'. */
  checkId: string
  title: string
  description: string
  remediation: string
  status: FindingStatus
  severity: FindingSeverity
  /** Drives the control mapping. */
  checkCategory: string
  collectedAt: string | null
}

const mapFinding = (r: Record<string, any>): IntegrationFinding => ({
  id: String(r.id),
  integrationId: r.integration_id ?? '',
  checkId: r.check_id ?? '',
  title: r.title ?? '',
  description: r.description ?? '',
  remediation: r.remediation ?? '',
  status: (r.status as FindingStatus) ?? 'NOT_AVAILABLE',
  severity: (r.severity as FindingSeverity) ?? 'INFO',
  checkCategory: r.check_category ?? '',
  collectedAt: r.collected_at ?? null,
})

const FINDING_COLUMNS =
  'id, integration_id, check_id, title, description, remediation, status, severity, check_category, collected_at'

/** Findings collected by one connected integration, newest first. */
export async function fetchFindingsForIntegration(
  integrationId: string,
): Promise<IntegrationFinding[]> {
  if (!isSupabaseConfigured() || !supabase || !integrationId) return []
  const { data, error } = await supabase
    .from('integration_findings')
    .select(FINDING_COLUMNS)
    .eq('integration_id', integrationId)
    .order('collected_at', { ascending: false })
  if (error) {
    console.warn('[integrationFindingsService] byIntegration:', error.message)
    throw new Error(error.message)
  }
  return (data ?? []).map(mapFinding)
}

/**
 * The automated evidence supporting one control.
 *
 * Resolved through `control_finding_evidence`, which the server-side mapper
 * populates. A control with no automated evidence returns an empty array —
 * the UI says so plainly rather than implying the control is unevidenced
 * overall (it may well have human-attached evidence in the vault).
 */
export async function fetchEvidenceForControl(
  controlId: string,
): Promise<IntegrationFinding[]> {
  if (!isSupabaseConfigured() || !supabase || !controlId) return []
  const { data, error } = await supabase
    .from('control_finding_evidence')
    .select(`integration_finding_id, mapped_at, integration_findings ( ${FINDING_COLUMNS} )`)
    .eq('control_id', controlId)
    .order('mapped_at', { ascending: false })
  if (error) {
    console.warn('[integrationFindingsService] byControl:', error.message)
    throw new Error(error.message)
  }
  return (data ?? [])
    .map((row: Record<string, any>) => row.integration_findings)
    .filter(Boolean)
    .map(mapFinding)
}

/** How many controls this integration's findings currently evidence. */
export async function countControlsEvidencedBy(integrationId: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase || !integrationId) return 0
  const { data, error } = await supabase
    .from('integration_findings')
    .select('control_finding_evidence ( control_id )')
    .eq('integration_id', integrationId)
  if (error) {
    console.warn('[integrationFindingsService] countControls:', error.message)
    throw new Error(error.message)
  }
  const ids = new Set<string>()
  for (const row of data ?? []) {
    for (const link of ((row as Record<string, any>).control_finding_evidence ?? [])) {
      if (link?.control_id) ids.add(String(link.control_id))
    }
  }
  return ids.size
}

// ── Pure helpers (no I/O; unit tested) ──────────────────────────────────────

/** Severity order, worst first — drives display ranking. */
const SEVERITY_RANK: Record<FindingSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
}

/** Sort findings worst-first: failures before warnings, then by severity. */
export function rankFindings(findings: IntegrationFinding[]): IntegrationFinding[] {
  const statusRank: Record<FindingStatus, number> = {
    FAILED: 0,
    WARNING: 1,
    NOT_AVAILABLE: 2,
    PASSED: 3,
  }
  return [...findings].sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.title.localeCompare(b.title),
  )
}

/**
 * Evidence posture for a set of findings.
 *
 * `null` when there are no findings at all — meaning "nothing collected",
 * which must render as "—" rather than as a passing or failing verdict.
 */
export function evidencePosture(
  findings: IntegrationFinding[],
): 'failing' | 'attention' | 'passing' | null {
  if (findings.length === 0) return null
  if (findings.some(f => f.status === 'FAILED')) return 'failing'
  if (findings.some(f => f.status === 'WARNING')) return 'attention'
  if (findings.some(f => f.status === 'PASSED')) return 'passing'
  return null
}

/** Counts by status, for a compact summary line. */
export function countByStatus(findings: IntegrationFinding[]): Record<FindingStatus, number> {
  const out: Record<FindingStatus, number> = {
    PASSED: 0,
    FAILED: 0,
    WARNING: 0,
    NOT_AVAILABLE: 0,
  }
  for (const f of findings) out[f.status] += 1
  return out
}
