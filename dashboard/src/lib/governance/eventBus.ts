/**
 * Governance Event Bus - Autonomous agent orchestration layer.
 * Emits events to Supabase (if connected) and processes frontend agents.
 * Never breaks existing functionality - adds event layer on top.
 */
import { supabase, isSupabaseConfigured } from '../supabase'

export type GovernanceEventType =
  | 'MODEL_REGISTERED' | 'MODEL_UPDATED' | 'MODEL_DELETED'
  | 'RISK_CREATED' | 'RISK_UPDATED' | 'RISK_DETECTED'
  | 'INCIDENT_CREATED' | 'COMPLIANCE_UPDATED' | 'VENDOR_LINKED'
  | 'HITL_REQUIRED' | 'EVIDENCE_COLLECTED' | 'BIAS_SCAN_QUEUED'
  | 'AGENT_TRIGGERED' | 'CICD_GATED' | 'CARBON_ESTIMATED'

export interface GovernanceEvent {
  id?: string
  org_id: string
  event_type: GovernanceEventType
  source_module: string
  payload: Record<string, unknown>
  triggered_agents?: string[]
  status?: string
  created_at?: string
}

type AgentHandler = (payload: Record<string, unknown>, orgId: string) => Promise<void>

const AGENT_HANDLERS: Partial<Record<GovernanceEventType, AgentHandler[]>> = {}

export function registerAgent(eventType: GovernanceEventType, handler: AgentHandler) {
  if (!AGENT_HANDLERS[eventType]) AGENT_HANDLERS[eventType] = []
  AGENT_HANDLERS[eventType]!.push(handler)
}

export async function emitEvent(
  type: GovernanceEventType,
  sourceModule: string,
  payload: Record<string, unknown>,
  orgId: string
) {
  // 1. Write to Supabase if connected (persistence + realtime)
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('governance_events').insert({
        org_id: orgId,
        event_type: type,
        source_module: sourceModule,
        payload,
        status: 'pending',
      })
    } catch (e) {
      console.warn('[eventBus] Supabase insert failed:', e)
    }
  }

  // 2. Always process frontend agents (works offline too)
  await processAgents(type, payload, orgId)
}

async function processAgents(
  type: GovernanceEventType,
  payload: Record<string, unknown>,
  orgId: string
) {
  const agents = AGENT_HANDLERS[type] ?? []
  for (const agent of agents) {
    try {
      await agent(payload, orgId)
    } catch (e) {
      console.warn(`[eventBus] Agent failed for ${type}:`, e)
      // Never throw - agents are best-effort
    }
  }
}

// Subscribe to realtime governance events from Supabase
export function subscribeToGovernanceEvents(
  orgId: string,
  onEvent: (event: GovernanceEvent) => void
) {
  if (!isSupabaseConfigured() || !supabase) return () => {}
  const channel = supabase
    .channel('governance-events')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'governance_events',
      filter: `org_id=eq.${orgId}`,
    }, (payload: any) => {
      onEvent(payload.new as GovernanceEvent)
    })
    .subscribe()
  return () => { supabase!.removeChannel(channel) }
}
