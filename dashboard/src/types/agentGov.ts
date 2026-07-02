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
  model: string
  maxBudget: number
  dailyCallCount: number
  lastActivity: string
  registeredDate: string
  approvedBy: string       // from central Users directory
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
