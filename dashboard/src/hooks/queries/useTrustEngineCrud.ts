// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Persistence hooks for Trust Engine editable entities, reusing the generic
// doc-jsonb CRUD + query-hook factory with seed fallback.

import { makeCrud } from '../../services/evalsCrud'
import { makeHooks } from './useEvalsCrud'
import { GENAI_RISK_SEED } from '../../data/genaiRiskSeed'
import type { GenAIRiskProfile } from '../../types/trustEngine'

export const genaiRiskCrud = makeCrud<GenAIRiskProfile>('genai_risk_profiles', 'genai-risks')
export const genaiRiskHooks = makeHooks<GenAIRiskProfile>(genaiRiskCrud, GENAI_RISK_SEED)
