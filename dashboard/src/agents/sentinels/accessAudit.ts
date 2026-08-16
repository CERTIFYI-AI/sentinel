/**
 * AccessAudit sentinel — reviews agent credentials for expiry, wildcard
 * scopes and admin roles, and catches active agents that skipped
 * governance review — before those agents act.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface CredentialDoc {
  agentName?: string
  status?: string
  expires?: string
  scopes?: string[]
  roles?: string[]
  mfaRequired?: boolean
}
interface CredRow { id: string; doc: CredentialDoc | null }
interface AgentRow { id: string; name: string; status: string | null; governance_status: string | null }

export async function accessAuditSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [credsRes, agentsRes] = await Promise.all([
    supabase.from('agent_gov_credentials').select('id, doc').is('deleted_at', null).limit(1000),
    supabase.from('agents').select('id, name, status, governance_status').limit(1000),
  ])
  if (credsRes.error) return { status: 'failed', findings: [], summary: 'agent_gov_credentials query failed', error: credsRes.error.message }

  const creds = (credsRes.data ?? []) as CredRow[]
  const agents = (agentsRes.data ?? []) as AgentRow[]
  const findings: SentinelFinding[] = []
  const now = ctx.now()

  for (const c of creds) {
    const d = c.doc ?? {}
    const active = (d.status ?? '').toLowerCase() === 'active'
    if (!active) continue

    if (d.expires && new Date(d.expires).getTime() < now) {
      findings.push({
        title: `Expired credential still Active${d.agentName ? ` (${d.agentName})` : ''}`,
        severity: 'HIGH',
        entityType: 'credential',
        entityId: c.id,
      })
    }
    const scopes = d.scopes ?? []
    const roles = d.roles ?? []
    if (scopes.some((s) => s.trim() === '*' || s.trim().endsWith(':*')) || roles.some((r) => r.toLowerCase().includes('admin'))) {
      findings.push({
        title: `Over-privileged credential${d.agentName ? ` (${d.agentName})` : ''}: ${[...scopes, ...roles].slice(0, 4).join(', ')}`,
        severity: 'HIGH',
        entityType: 'credential',
        entityId: c.id,
      })
    }
  }

  // Agents operating without completed governance review.
  for (const a of agents) {
    const live = ['active', 'confirmed', 'approved'].includes((a.status ?? '').toLowerCase())
    const ungoverned = (a.governance_status ?? 'pending').toLowerCase() === 'pending'
    if (live && ungoverned) {
      findings.push({
        title: `Agent "${a.name}" active without governance review`,
        severity: 'MEDIUM',
        entityType: 'agent',
        entityId: a.id,
      })
    }
  }

  const escalations = findings.filter((f) => f.severity === 'HIGH')
  if (escalations.length > 0) {
    const day = new Date().toISOString().slice(0, 10)
    await ctx.emit(
      'RISK_DETECTED',
      {
        source: 'SECURITY',
        severity: 'HIGH',
        affectedModels: [],
        title: `Access audit: ${escalations.length} privilege findings`,
        description: escalations.map((f) => f.title).slice(0, 5).join('; '),
        detectedAt: new Date().toISOString(),
      },
      { idempotencyKey: `ACCESS_AUDIT:${ctx.orgId}:${day}` },
    )
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Audited ${creds.length} credentials and ${agents.length} registered agents — ${findings.length} findings.`,
    metrics: { credentials: creds.length, agents: agents.length, findings: findings.length },
  }
}
