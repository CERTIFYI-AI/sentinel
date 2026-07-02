// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Persistence hooks for Agent Registry + Agent IAM, reusing the generic
// doc-jsonb CRUD (evalsCrud.makeCrud) and query-hook factory with seed
// fallback — same contract as the Validation & Evals modules.

import { makeCrud } from '../../services/evalsCrud'
import { makeHooks } from './useEvalsCrud'
import { AGENT_REGISTRY_SEED, AGENT_IAM_SEED } from '../../data/agentGovSeed'
import type { AgentRecord, AgentCredential } from '../../types/agentGov'

export const agentRecordsCrud = makeCrud<AgentRecord>('agent_gov_registry', 'agent-registry')
export const agentCredentialsCrud = makeCrud<AgentCredential>('agent_gov_credentials', 'agent-iam')

export const agentRecordHooks = makeHooks<AgentRecord>(agentRecordsCrud, AGENT_REGISTRY_SEED)
export const agentCredentialHooks = makeHooks<AgentCredential>(agentCredentialsCrud, AGENT_IAM_SEED)
