/**
 * Shared helpers for all governance agents.
 * All DB writes go through here so we have one place to add tenancy,
 * retries, error taxonomy, and audit-log enrichment.
 */

import { supabase, isSupabaseConfigured } from '../supabase'
import { statutoryWindowFor } from '../statutoryWindows'

// ---- Risk scoring ------------------------------------------------
export function calculateInitialRiskScore(p: {
  modelType: string
  dataSensitivity: string
  deploymentScope: string
  vendor?: string
  euAiActClass?: string
}): { likelihood: number; impact: number; severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW' } {
  let likelihood = 2
  let impact = 2
  if (p.modelType === 'GENERATIVE') likelihood += 1
  if (p.dataSensitivity === 'PII' || p.dataSensitivity === 'PHI') impact += 2
  if (p.dataSensitivity === 'CONFIDENTIAL') impact += 1
  if (p.deploymentScope === 'PROD') impact += 1
  if (p.vendor) likelihood += 1
  if (p.euAiActClass === 'HIGH' || p.euAiActClass === 'UNACCEPTABLE') {
    impact = Math.max(impact, 5)
    likelihood = Math.max(likelihood, 4)
  }
  likelihood = Math.min(5, likelihood)
  impact     = Math.min(5, impact)
  const score = likelihood * impact
  const severity = score >= 20 ? 'CRITICAL' : score >= 12 ? 'HIGH' : score >= 6 ? 'MEDIUM' : 'LOW'
  return { likelihood, impact, severity }
}

// ---- EU AI Act classification -----------------------------------
export function classifyEuAiAct(purpose: string, deploymentScope: string): 'UNACCEPTABLE'|'HIGH'|'LIMITED'|'MINIMAL' {
  const p = purpose.toLowerCase()
  if (/social scor|subliminal|manipulat|biometric mass/.test(p)) return 'UNACCEPTABLE'
  if (/credit|hiring|education|law enforcement|migration|medical|safety component|critical infrastructure/.test(p)) return 'HIGH'
  if (/chatbot|deepfake|emotion/.test(p)) return 'LIMITED'
  if (deploymentScope === 'PROD' && /decision|eligib|underwrit/.test(p)) return 'HIGH'
  return 'MINIMAL'
}

// ---- Carbon estimation -------------------------------------------
export function estimateCarbon(p: { modelType: string; estimatedParams?: number; expectedRequestsPerDay?: number }):
  { trainingCO2Kg: number; inferenceCO2KgPerDay: number; annualCO2Kg: number } {
  const params = p.estimatedParams ?? (p.modelType === 'GENERATIVE' ? 7_000_000_000 : 100_000_000)
  // ML CO2 Impact paper heuristic: ~0.2 kWh per GPU-hour * carbon intensity
  const trainingCO2Kg = (params / 1e9) * 320   // ~320 kg CO2 per billion params (rough)
  const perInference  = p.modelType === 'GENERATIVE' ? 0.00085 : 0.00005 // kg CO2
  const rps = p.expectedRequestsPerDay ?? 10_000
  const inferenceCO2KgPerDay = rps * perInference
  const annualCO2Kg = trainingCO2Kg + inferenceCO2KgPerDay * 365
  return { trainingCO2Kg, inferenceCO2KgPerDay, annualCO2Kg }
}

// ---- Severity-tier SLA -------------------------------------------
export function severitySla(severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'): { hours: number; label: string } {
  switch (severity) {
    case 'CRITICAL': return { hours: 4,   label: '4h' }
    case 'HIGH':     return { hours: 24,  label: '24h' }
    case 'MEDIUM':   return { hours: 168, label: '7d' }
    case 'LOW':      return { hours: 720, label: '30d' }
  }
}

// ---- Safe insert helper ------------------------------------------
export async function safeInsert<T>(
  table: string,
  row: Record<string, unknown>,
): Promise<T | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) { console.warn(`[safeInsert:${table}]`, error.message); return null }
    return data as T
  } catch (e) { console.warn(`[safeInsert:${table}]`, e); return null }
}

export async function safeUpdate<T>(
  table: string,
  patch: Record<string, unknown>,
  matcher: Record<string, unknown>,
): Promise<T | null> {
  if (!isSupabaseConfigured()) return null
  try {
    let q = supabase.from(table).update(patch)
    for (const [k, v] of Object.entries(matcher)) q = q.eq(k, v)
    const { data, error } = await q.select().single()
    if (error) { console.warn(`[safeUpdate:${table}]`, error.message); return null }
    return data as T
  } catch (e) { console.warn(`[safeUpdate:${table}]`, e); return null }
}

// ---- Strict insert helper ----------------------------------------
// For writes whose success the agent REPORTS (statutory filing drafts,
// narrative records): unlike safeInsert this throws on any failure, so the
// caller can never claim success for a row that did not persist.
export async function strictInsert<T>(
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error(`[strictInsert:${table}] Supabase is not configured — the write cannot persist`)
  }
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw new Error(`[strictInsert:${table}] ${error.message}`)
  return data as T
}

// ---- Multi-regulator notification templates --------------------
// deadlineHours comes from lib/statutoryWindows (one source of truth with the
// filing form and the Incident Log Art. 73 prompt); regulation carries the
// FILING_REGULATIONS vocabulary value the filing row will be CHECKed against.
export interface RegulatorTemplate { regulator: string; jurisdiction: string; deadlineHours: number; template: string; regulation: string }

function windowHours(regulation: string, fallback: number): number {
  return statutoryWindowFor(regulation)?.hours ?? fallback
}

export function regulatorTemplates(p: { severity: string; dataBreach: boolean; jurisdictions: string[] }): RegulatorTemplate[] {
  const out: RegulatorTemplate[] = []
  if (p.jurisdictions.includes('US') && p.severity === 'P0') {
    out.push({ regulator: 'SEC', jurisdiction: 'US', regulation: 'SEC-1.05', deadlineHours: windowHours('SEC-1.05', 96), template: 'Form 8-K Item 1.05 - Material Cybersecurity Incident disclosure' })
  }
  if (p.jurisdictions.includes('UK')) {
    out.push({ regulator: 'FCA', jurisdiction: 'UK', regulation: 'FCA', deadlineHours: windowHours('FCA', 72), template: 'SUP 15.3 Notification of material breach' })
  }
  if (p.dataBreach && p.jurisdictions.includes('EU')) {
    out.push({ regulator: 'ICO', jurisdiction: 'EU/UK', regulation: 'GDPR-33', deadlineHours: windowHours('GDPR-33', 72), template: 'GDPR Art.33 Personal Data Breach Notification' })
  }
  if (p.jurisdictions.includes('EU')) {
    // Art. 73 (not the pre-final-text Art. 62 numbering) — serious-incident
    // reporting for high-risk AI systems.
    out.push({ regulator: 'National AI Authority', jurisdiction: 'EU', regulation: 'EU-AI-Act-73', deadlineHours: windowHours('EU-AI-Act-73', 72), template: 'EU AI Act Art. 73 Serious Incident Report' })
  }
  return out
}
