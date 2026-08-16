// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MCP gateway registries: `mcp_servers` (backend Model Context Protocol
// servers agents may connect to) and `mcp_tools` (the individual tools each
// server exposes, with risk tier, approval state and the agents allowed to
// call them). Org-scoped via RLS with the tenant column defaulted DB-side;
// writes throw so the UI can never report a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type McpStatus = 'healthy' | 'degraded' | 'offline' | 'unknown'
export type McpApproval = 'approved' | 'under_review' | 'restricted' | 'blocked'
export type McpSensitivity = 'public' | 'internal' | 'confidential' | 'restricted'
export type McpTransport = 'https' | 'stdio' | 'sse' | 'websocket'
export type McpAuth = 'bearer_token' | 'mtls' | 'oauth2' | 'basic' | 'none'
export type McpToolCategory = 'read' | 'write' | 'execute' | 'admin'
export type McpRiskTier = 'low' | 'medium' | 'high' | 'critical'

export interface McpServerRecord {
  id: string
  name: string
  url: string
  description?: string
  transport: McpTransport
  authMethod: McpAuth
  status: McpStatus
  environment: string
  ownerName?: string
  dataSensitivity: McpSensitivity
  integrationId?: string | null
  approvalState: McpApproval
  lastPingAt?: string | null
  lastError?: string | null
  config: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface McpToolRecord {
  id: string
  serverId: string
  name: string
  description?: string
  category: McpToolCategory
  riskTier: McpRiskTier
  approvalState: McpApproval
  requiresHitl: boolean
  sideEffects: boolean
  inputSchema: Record<string, unknown>
  scopes: string[]
  allowedAgentIds: string[]
  invocations30d?: number | null
  lastInvokedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

function serverFromRow(r: Record<string, any>): McpServerRecord {
  return {
    id: r.id,
    name: r.name ?? '',
    url: r.url ?? '',
    description: r.description ?? undefined,
    transport: (r.transport ?? 'https') as McpTransport,
    authMethod: (r.auth_method ?? 'bearer_token') as McpAuth,
    status: (r.status ?? 'unknown') as McpStatus,
    environment: r.environment ?? 'production',
    ownerName: r.owner_name ?? undefined,
    dataSensitivity: (r.data_sensitivity ?? 'internal') as McpSensitivity,
    integrationId: r.integration_id ?? null,
    approvalState: (r.approval_state ?? 'under_review') as McpApproval,
    lastPingAt: r.last_ping_at ?? null,
    lastError: r.last_error ?? null,
    config: (r.config ?? {}) as Record<string, unknown>,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function serverToRow(s: Partial<McpServerRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (s.name !== undefined) row.name = s.name
  if (s.url !== undefined) row.url = s.url
  if (s.description !== undefined) row.description = s.description ?? null
  if (s.transport !== undefined) row.transport = s.transport
  if (s.authMethod !== undefined) row.auth_method = s.authMethod
  if (s.status !== undefined) row.status = s.status
  if (s.environment !== undefined) row.environment = s.environment
  if (s.ownerName !== undefined) row.owner_name = s.ownerName ?? null
  if (s.dataSensitivity !== undefined) row.data_sensitivity = s.dataSensitivity
  if (s.integrationId !== undefined) row.integration_id = s.integrationId || null
  if (s.approvalState !== undefined) row.approval_state = s.approvalState
  if (s.lastPingAt !== undefined) row.last_ping_at = s.lastPingAt || null
  if (s.lastError !== undefined) row.last_error = s.lastError ?? null
  if (s.config !== undefined) row.config = s.config
  return row
}

function toolFromRow(r: Record<string, any>): McpToolRecord {
  return {
    id: r.id,
    serverId: r.server_id,
    name: r.name ?? '',
    description: r.description ?? undefined,
    category: (r.category ?? 'read') as McpToolCategory,
    riskTier: (r.risk_tier ?? 'low') as McpRiskTier,
    approvalState: (r.approval_state ?? 'under_review') as McpApproval,
    requiresHitl: !!r.requires_hitl,
    sideEffects: !!r.side_effects,
    inputSchema: (r.input_schema ?? {}) as Record<string, unknown>,
    scopes: Array.isArray(r.scopes) ? r.scopes : [],
    allowedAgentIds: Array.isArray(r.allowed_agent_ids) ? r.allowed_agent_ids : [],
    invocations30d: r.invocations_30d ?? null,
    lastInvokedAt: r.last_invoked_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toolToRow(t: Partial<McpToolRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (t.serverId !== undefined) row.server_id = t.serverId
  if (t.name !== undefined) row.name = t.name
  if (t.description !== undefined) row.description = t.description ?? null
  if (t.category !== undefined) row.category = t.category
  if (t.riskTier !== undefined) row.risk_tier = t.riskTier
  if (t.approvalState !== undefined) row.approval_state = t.approvalState
  if (t.requiresHitl !== undefined) row.requires_hitl = t.requiresHitl
  if (t.sideEffects !== undefined) row.side_effects = t.sideEffects
  if (t.inputSchema !== undefined) row.input_schema = t.inputSchema
  if (t.scopes !== undefined) row.scopes = t.scopes
  if (t.allowedAgentIds !== undefined) row.allowed_agent_ids = t.allowedAgentIds
  return row
}

// ── Servers ─────────────────────────────────────────────────────────────────

export async function fetchMcpServers(): Promise<McpServerRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('mcp_servers').select('*').eq('is_deleted', false).order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(serverFromRow)
}

export async function createMcpServer(s: Partial<McpServerRecord>): Promise<McpServerRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('mcp_servers').insert(serverToRow(s)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_servers', entityId: data.id, action: 'create' })
  return serverFromRow(data)
}

export async function updateMcpServer(id: string, patch: Partial<McpServerRecord>): Promise<McpServerRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('mcp_servers')
    .update({ ...serverToRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_servers', entityId: id, action: 'update' })
  return serverFromRow(data)
}

export async function softDeleteMcpServer(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('mcp_servers')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_servers', entityId: id, action: 'delete' })
}

// ── Tools ───────────────────────────────────────────────────────────────────

export async function fetchMcpTools(): Promise<McpToolRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('mcp_tools').select('*').eq('is_deleted', false).order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(toolFromRow)
}

export async function createMcpTool(t: Partial<McpToolRecord>): Promise<McpToolRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('mcp_tools').insert(toolToRow(t)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_tools', entityId: data.id, action: 'create' })
  return toolFromRow(data)
}

export async function updateMcpTool(id: string, patch: Partial<McpToolRecord>): Promise<McpToolRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('mcp_tools')
    .update({ ...toolToRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_tools', entityId: id, action: 'update' })
  return toolFromRow(data)
}

export async function softDeleteMcpTool(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('mcp_tools')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'mcp-gateway', entityType: 'mcp_tools', entityId: id, action: 'delete' })
}
