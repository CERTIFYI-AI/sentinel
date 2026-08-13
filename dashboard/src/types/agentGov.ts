// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Agent governance domain — registry records and IAM credentials.
// Aggregate roots persisted via the generic doc-jsonb CRUD (evalsCrud.makeCrud):
// agent → permissions (credentials) → runtime traces (Trust Engine).

export type AgentStatus = 'Active' | 'Suspended' | 'Quarantined' | 'Decommissioned' | 'Pending Approval'
export type AgentType = 'Autonomous' | 'Semi-Autonomous' | 'Tool-Using' | 'Multi-Modal' | 'Orchestrator' | 'Worker'
export type AgentRiskTier = 'Critical' | 'High' | 'Medium' | 'Low'

export interface AgentRecord {
  id: string
  /** Human-readable code shown in the UI (e.g. AGT-3F2A91B0); `id` is the storage key. */
  displayId?: string
  name: string
  /** Semantic version of the agent build. Named to avoid the CRUD envelope's optimistic-lock `version` counter. */
  agentVersion: string
  type: AgentType
  status: AgentStatus
  riskTier: AgentRiskTier
  owner: string            // from central Users directory
  team: string
  purpose: string
  tools: string[]
  permissions: string[]    // coarse capability grants; credentials live in AgentCredential
  /** Canonical ai_models.id (uuid) — the platform id-space. Resolve the name at render time. */
  modelId?: string
  /** Display fallback for the underlying model (legacy free-text records predate modelId). */
  model: string
  maxBudget: number
  dailyCallCount: number
  lastActivity: string
  registeredDate: string
  approvedBy: string       // from central Users directory
  /** Declared by the owning team at registration — NOT computed by the platform. */
  trustScore: number
  escalationPolicy: string
  killSwitchEnabled: boolean
  totalCallsLifetime: number
  avgLatencyMs: number
}

export type CredentialStatus = 'Active' | 'Revoked' | 'Expired' | 'Pending Rotation'
export type PrincipalType = 'Service Account' | 'API Key' | 'OAuth Client' | 'mTLS Certificate'

export interface AgentCredential {
  id: string
  /** Human-readable code shown in the UI (e.g. IAM-8C41D2E9); `id` is the storage key. */
  displayId?: string
  agentId: string          // → AgentRecord.id (cross-module link)
  agentName: string
  principalType: PrincipalType
  principalId: string
  roles: string[]
  scopes: string[]
  created: string
  expires: string
  lastUsed: string
  status: CredentialStatus
  mfaRequired: boolean
  ipAllowlist: string[]
  rotationPolicy: string
  auditRequired: boolean
  approvedBy?: string      // credential issuance approver, from Users directory
}
