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
  // Real notifications columns only (tenant_id/title/message/notification_type/
  // entity_*/is_read from core_grc; url_path from phase-4). The previous shape
  // (type/severity/body/link) matched no column and every insert was lost.
  await safeInsert('notifications', {
    org_id: ctx.orgId,
    tenant_id: ctx.orgId,
    // Explicit broadcast marker: the org-broadcast read policy
    // (notifications_org_broadcast_read) makes user_id='system' rows readable
    // org-wide — never rely on the column default here.
    user_id: 'system',
    notification_type: ctx.event.event_type,
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? p.summary ?? 'auto'}`,
    message: JSON.stringify(p).slice(0, 500),
    entity_type: p.incidentId ? 'incident' : p.modelId ? 'model' : 'event',
    entity_id: (p.incidentId as string) ?? (p.modelId as string) ?? null,
    is_read: false,
    url_path: p.modelId ? `/models/inventory/${p.modelId}` : p.incidentId ? `/risk/incidents?open=${p.incidentId}` : null,
  })
  return { status: 'succeeded' }
}
