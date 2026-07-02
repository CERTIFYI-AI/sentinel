// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Trust Engine domain — editable entities persisted via the generic doc-jsonb
// CRUD (evalsCrud.makeCrud). Telemetry views (traces, costs, tool calls,
// fallbacks) are read-only and remain on their existing data hooks.

export type GenAISeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type GenAIMitigationStatus = 'Implemented' | 'Partial' | 'Under Review' | 'Not Addressed'
export type GenAIGuardrailCoverage = 'None' | 'Partial' | 'Implemented'

/** NIST AI 600-1 GenAI risk profile per model. */
export interface GenAIRiskProfile {
  id: string
  model: string
  riskCategory: string
  riskNumber: number
  severity: GenAISeverity
  guardrails: string
  guardrailCoverage: GenAIGuardrailCoverage
  mitigationStatus: GenAIMitigationStatus
  owner: string            // from central Users directory
  created: string
}
