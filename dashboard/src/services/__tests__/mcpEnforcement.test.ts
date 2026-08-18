// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Tests for the read side of the MCP enforcement plane.
//
// The load-bearing assertion is that `pending_approval` is never folded into
// "denied". A call held for a human is one policy PERMITTED and paused (EU AI
// Act Art. 14); rendering it as refused would misreport what the platform did,
// and would hide the review queue from the person who has to clear it.

import { describe, it, expect } from 'vitest'

import {
  countDecisions,
  countsByTool,
  topReasons,
  reasonLabel,
  decisionTone,
  ungrantedTools,
  type PolicyDecision,
  type DecisionKind,
  type ReasonCode,
} from '../mcpEnforcementService'

const decision = (over: Partial<PolicyDecision> = {}): PolicyDecision => ({
  id: crypto.randomUUID(),
  agentId: 'agent-1',
  agentRef: 'agent-1',
  toolId: 'tool-1',
  serverId: 'server-1',
  toolRef: 'create_ticket',
  decision: 'allowed',
  reasonCode: 'allowed',
  reason: 'approved and granted',
  hitlItemId: null,
  invocationId: null,
  decidedAt: '2026-08-18T05:00:00Z',
  ...over,
})

describe('countDecisions', () => {
  it('counts each outcome separately', () => {
    const c = countDecisions([
      decision(),
      decision({ decision: 'denied', reasonCode: 'agent_not_granted' }),
      decision({ decision: 'denied', reasonCode: 'rate_limited' }),
      decision({ decision: 'pending_approval', reasonCode: 'approval_required' }),
    ])
    expect(c).toEqual({ total: 4, allowed: 1, denied: 2, pending: 1, open: 3 })
  })

  it('does not count a pending approval as a denial', () => {
    const c = countDecisions([decision({ decision: 'pending_approval', reasonCode: 'approval_required' })])
    expect(c.denied).toBe(0)
    expect(c.pending).toBe(1)
    // It IS open — someone must act on it — just not refused.
    expect(c.open).toBe(1)
  })

  it('reports zeroes for an empty feed rather than throwing', () => {
    expect(countDecisions([])).toEqual({ total: 0, allowed: 0, denied: 0, pending: 0, open: 0 })
  })
})

describe('countsByTool', () => {
  it('groups by tool id, not by name', () => {
    // Two tools can share a display name across servers; the id is the one
    // id-space, so grouping on the name would merge unrelated tools.
    const rows = [
      decision({ toolId: 'a', toolRef: 'search' }),
      decision({ toolId: 'b', toolRef: 'search', decision: 'denied', reasonCode: 'tool_blocked' }),
      decision({ toolId: 'a', toolRef: 'search', decision: 'denied', reasonCode: 'rate_limited' }),
    ]
    const by = countsByTool(rows)
    expect(by.get('a')).toMatchObject({ total: 2, allowed: 1, denied: 1 })
    expect(by.get('b')).toMatchObject({ total: 1, allowed: 0, denied: 1 })
  })

  it('omits decisions with no tool id instead of bucketing them together', () => {
    // An unknown-tool denial has nothing to attribute the count to; silently
    // grouping them under one key would invent a tool.
    const by = countsByTool([decision({ toolId: null, decision: 'denied', reasonCode: 'unknown_tool' })])
    expect(by.size).toBe(0)
  })
})

describe('topReasons', () => {
  it('ranks only the reasons calls did NOT proceed', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => decision()),
      ...Array.from({ length: 3 }, () => decision({ decision: 'denied', reasonCode: 'agent_not_granted' })),
      decision({ decision: 'denied', reasonCode: 'rate_limited' }),
      decision({ decision: 'pending_approval', reasonCode: 'approval_required' }),
    ]
    const top = topReasons(rows)
    expect(top[0]).toEqual({ code: 'agent_not_granted', count: 3 })
    expect(top.map(r => r.code)).not.toContain('allowed')
    // A pending approval is a reason a call has not proceeded, so it belongs.
    expect(top.map(r => r.code)).toContain('approval_required')
  })

  it('is stable when counts tie, so the chip order does not jitter', () => {
    const rows = [
      decision({ decision: 'denied', reasonCode: 'tool_blocked' }),
      decision({ decision: 'denied', reasonCode: 'rate_limited' }),
    ]
    expect(topReasons(rows).map(r => r.code)).toEqual(['rate_limited', 'tool_blocked'])
  })
})

describe('labels and tone', () => {
  it('labels every reason code the gateway can emit', () => {
    // Kept in step with the CHECK constraint in 20260831000002 and with
    // sentinel/gateway/policy.py. An unlabelled code renders as a raw slug.
    const codes: ReasonCode[] = [
      'allowed', 'unknown_agent', 'unknown_tool', 'server_blocked',
      'server_restricted', 'tool_blocked', 'tool_not_approved',
      'agent_not_granted', 'rate_limited', 'approval_required',
    ]
    for (const c of codes) {
      expect(reasonLabel(c), c).not.toBe(c)
      expect(reasonLabel(c).length).toBeGreaterThan(2)
    }
  })

  it('gives a pending approval its own tone', () => {
    const tones: Record<DecisionKind, string> = {
      allowed: decisionTone('allowed'),
      denied: decisionTone('denied'),
      pending_approval: decisionTone('pending_approval'),
    }
    expect(tones.allowed).toBe('ok')
    expect(tones.denied).toBe('bad')
    expect(tones.pending_approval).toBe('warn')
    expect(tones.pending_approval).not.toBe(tones.denied)
  })
})

describe('ungrantedTools', () => {
  const tool = (over: Partial<{ id: string; allowedAgentIds: string[]; approvalState: string }> = {}) => ({
    id: 't', allowedAgentIds: ['a'], approvalState: 'approved', ...over,
  })

  it('flags an approved tool no agent can call', () => {
    // Empty grants mean NOBODY — matching sentinel/gateway/policy.py. This is
    // almost always unfinished configuration, and it fails silently until
    // someone tries the tool.
    const out = ungrantedTools([tool({ id: 'open', allowedAgentIds: [] }), tool({ id: 'fine' })])
    expect(out.map(t => t.id)).toEqual(['open'])
  })

  it('does not flag a tool that is not approved anyway', () => {
    // An unapproved tool with no grants is refused twice over; listing it as
    // a configuration gap would be noise.
    const out = ungrantedTools([tool({ allowedAgentIds: [], approvalState: 'under_review' })])
    expect(out).toEqual([])
  })
})
