// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Policy decisions made by the MCP gateway — the read side of the enforcement
// plane (`sentinel/gateway/`).
//
// Read-only by design. `mcp_policy_decisions` has no client insert policy: a
// decision is the gateway's statement about what it did, and a browser able to
// write one would make the evidence worthless. Every function here selects.
//
// The denied and pending rows are the valuable ones. A denial never becomes a
// `tool_call_logs` entry — the call did not happen — so this table is the only
// place the control's operation is recorded.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type DecisionKind = 'allowed' | 'denied' | 'pending_approval'

export type ReasonCode =
  | 'allowed'
  | 'unknown_agent'
  | 'unknown_tool'
  | 'server_blocked'
  | 'server_restricted'
  | 'tool_blocked'
  | 'tool_not_approved'
  | 'agent_not_granted'
  | 'rate_limited'
  | 'approval_required'

export interface PolicyDecision {
  id: string
  agentId: string | null
  /** What the caller presented. Kept so an unknown agent is still traceable. */
  agentRef: string | null
  toolId: string | null
  serverId: string | null
  /** Tool name at decision time, or the raw id when the tool was unknown. */
  toolRef: string | null
  decision: DecisionKind
  reasonCode: ReasonCode
  reason: string
  hitlItemId: string | null
  invocationId: string | null
  decidedAt: string
}

const mapRow = (r: Record<string, any>): PolicyDecision => ({
  id: String(r.id),
  agentId: r.agent_id ?? null,
  agentRef: r.agent_ref ?? null,
  toolId: r.tool_id ?? null,
  serverId: r.server_id ?? null,
  toolRef: r.tool_ref ?? null,
  decision: (r.decision as DecisionKind) ?? 'denied',
  reasonCode: (r.reason_code as ReasonCode) ?? 'unknown_tool',
  reason: r.reason ?? '',
  hitlItemId: r.hitl_item_id ?? null,
  invocationId: r.invocation_id ?? null,
  decidedAt: r.decided_at,
})

/**
 * Recent decisions, newest first.
 *
 * `request_fingerprint` is deliberately not selected: it is retained for the
 * audit trail and answers "was this the same call again?", which no screen
 * asks. Nothing here can surface tool arguments, because none are stored.
 */
export async function fetchPolicyDecisions(limit = 200): Promise<PolicyDecision[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('mcp_policy_decisions')
    .select('id, agent_id, agent_ref, tool_id, server_id, tool_ref, decision, reason_code, reason, hitl_item_id, invocation_id, decided_at')
    .order('decided_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Could not load policy decisions: ${error.message}`)
  return (data ?? []).map(mapRow)
}

/** Human label for a reason code. Grouping is on the code, never on prose. */
export const reasonLabel = (code: ReasonCode): string =>
  ({
    allowed: 'Allowed',
    unknown_agent: 'Unknown agent',
    unknown_tool: 'Unknown tool',
    server_blocked: 'Server blocked',
    server_restricted: 'Server restricted',
    tool_blocked: 'Tool blocked',
    tool_not_approved: 'Tool not approved',
    agent_not_granted: 'No grant for this agent',
    rate_limited: 'Rate limited',
    approval_required: 'Awaiting human approval',
  })[code] ?? code

/**
 * `pending_approval` is NOT a denial. It is a call policy permits, paused for a
 * person (EU AI Act Art. 14), and rendering it as refused would misreport what
 * the platform did.
 */
export const decisionTone = (d: DecisionKind): 'ok' | 'warn' | 'bad' =>
  d === 'allowed' ? 'ok' : d === 'pending_approval' ? 'warn' : 'bad'

export interface DecisionCounts {
  total: number
  allowed: number
  denied: number
  pending: number
  /** Denials and pending approvals — what an operator opens the page for. */
  open: number
}

export function countDecisions(rows: PolicyDecision[]): DecisionCounts {
  const allowed = rows.filter(r => r.decision === 'allowed').length
  const denied = rows.filter(r => r.decision === 'denied').length
  const pending = rows.filter(r => r.decision === 'pending_approval').length
  return { total: rows.length, allowed, denied, pending, open: denied + pending }
}

/** Decision counts per tool id, for the tool catalogue's enforcement column. */
export function countsByTool(rows: PolicyDecision[]): Map<string, DecisionCounts> {
  const byTool = new Map<string, PolicyDecision[]>()
  for (const r of rows) {
    if (!r.toolId) continue
    const list = byTool.get(r.toolId)
    if (list) list.push(r)
    else byTool.set(r.toolId, [r])
  }
  const out = new Map<string, DecisionCounts>()
  byTool.forEach((list, id) => out.set(id, countDecisions(list)))
  return out
}

/** Why calls are being refused, most frequent first. */
export function topReasons(rows: PolicyDecision[], take = 5): Array<{ code: ReasonCode; count: number }> {
  const tally = new Map<ReasonCode, number>()
  for (const r of rows) {
    if (r.decision === 'allowed') continue
    tally.set(r.reasonCode, (tally.get(r.reasonCode) ?? 0) + 1)
  }
  return [...tally.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, take)
}

/**
 * Tools that no agent can call: an empty grant list means NOBODY, matching
 * `sentinel/gateway/policy.py`. Surfaced because a tool registered, approved
 * and granted to no one is almost always an unfinished configuration rather
 * than a deliberate one — and it fails silently until someone tries.
 */
export function ungrantedTools<T extends { id: string; allowedAgentIds: string[]; approvalState: string }>(
  tools: T[],
): T[] {
  return tools.filter(t => t.approvalState === 'approved' && t.allowedAgentIds.length === 0)
}
