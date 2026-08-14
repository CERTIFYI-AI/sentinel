// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Persistence hooks for Trust Engine editable entities, reusing the generic
// doc-jsonb CRUD + query-hook factory with seed fallback.

import { makeCrud } from '../../services/evalsCrud'
import { makeHooks } from './useEvalsCrud'
import type { GenAIRiskProfile } from '../../types/trustEngine'

// No seed fallback: an empty org renders an honest empty state, and a failed
// read renders a real error state (demo data lives in the database, org-scoped).
export const genaiRiskCrud = makeCrud<GenAIRiskProfile>('genai_risk_profiles', 'genai-risks')
export const genaiRiskHooks = makeHooks<GenAIRiskProfile>(genaiRiskCrud)

// Trust Engine configuration — a single settings document (id 'default').
// TrustConfig manages its own local state, so it calls this CRUD directly
// rather than through the react-query hook factory.
export interface TrustConfigDoc {
  id: string
  guardrails: unknown[]
  costLimits: unknown[]
  fallbackChains: unknown[]
  alertThresholds: unknown[]
}
export const trustConfigCrud = makeCrud<TrustConfigDoc>('trust_config', 'trust-config')
