/**
 * NotificationAgent — wildcard listener, fan-outs notifications & tasks.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

const IMPORTANT = new Set<string>([
  'MODEL_REGISTERED','RISK_DETECTED','INCIDENT_CREATED','CONTAINMENT_EXECUTED',
  'REGULATOR_NOTIFIED','HITL_REVIEW_REQUIRED','VENDOR_LINKED','CARBON_BUDGET_EXCEEDED',
])
export async function notificationAgent(ctx: AgentContext): Promise<AgentResult> {
  if (!IMPORTANT.has(ctx.event.event_type)) return { status: 'skipped' }
  const p = ctx.event.payload as Record<string, unknown>
  await safeInsert('notifications', {
    org_id: ctx.orgId,
    type: ctx.event.event_type,
    severity: (p.severity as string) ?? 'INFO',
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? 'auto'}`,
    body: JSON.stringify(p).slice(0, 500),
    is_read: false,
    link: p.modelId ? `/models/inventory?id=${p.modelId}` : null,
    created_at: new Date().toISOString(),
  })
  return { status: 'succeeded' }
}
