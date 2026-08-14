// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Trust Engine domain — editable entities persisted via the generic doc-jsonb
// CRUD (evalsCrud.makeCrud). Telemetry views (traces, costs, tool calls,
// fallbacks) are read-only and remain on their existing data hooks.

export type GenAISeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type GenAIMitigationStatus = 'Implemented' | 'Partial' | 'Under Review' | 'Not Addressed'
export type GenAIGuardrailCoverage = 'None' | 'Partial' | 'Implemented'

/** A real, recorded mitigation event (stored in the profile doc). */
export interface GenAIMitigationEvent {
  date: string
  action: string
  user: string
}

/** NIST AI 600-1 GenAI risk profile per model. */
export interface GenAIRiskProfile {
  id: string
  /** Canonical registry link — ai_models.id (uuid). Absent on legacy rows keyed by name only. */
  modelId?: string
  /** Display-name snapshot; resolve the live name from the registry when modelId is set. */
  model: string
  riskCategory: string
  riskNumber: number
  severity: GenAISeverity
  guardrails: string
  guardrailCoverage: GenAIGuardrailCoverage
  mitigationStatus: GenAIMitigationStatus
  owner: string            // from central Users directory
  created: string
  /** Real mitigation events only — no synthesized timeline. */
  mitigationEvents?: GenAIMitigationEvent[]
  /** Optimistic-concurrency counter maintained by the doc CRUD. */
  version?: number
}
