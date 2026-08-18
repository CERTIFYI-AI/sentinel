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
  // Live notifications columns: org_id, title, message, type, source_module,
  // entity_ref, action_url, is_read. `type` is CHECK-constrained to a SEVERITY
  // vocabulary (info/success/warning/error/critical) — NOT an event name — so
  // the event name travels in source_module, matching the edge dispatcher.
  // The previous shape (notification_type/entity_type/entity_id/url_path/
  // tenant_id/user_id) matched no column and every insert was lost.
  const sev = String(p.severity ?? '').toUpperCase()
  const type = sev === 'CRITICAL' ? 'critical' : sev === 'HIGH' ? 'error'
    : sev === 'MEDIUM' ? 'warning' : 'info'
  await safeInsert('notifications', {
    org_id: ctx.orgId,
    type,
    source_module: `governance-mesh:${ctx.event.event_type}`,
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? p.summary ?? 'auto'}`,
    message: JSON.stringify(p).slice(0, 500),
    entity_ref: (p.incidentId as string) ?? (p.modelId as string) ?? null,
    action_url: p.modelId ? `/models/inventory/${p.modelId}` : p.incidentId ? `/risk/incidents?open=${p.incidentId}` : null,
    is_read: false,
  })
  return { status: 'succeeded' }
}
