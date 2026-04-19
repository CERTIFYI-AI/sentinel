import { supabase } from './supabase';
import { riskAgent } from '@/agents/riskAgent';
import { hitlAgent } from '@/agents/hitlAgent';
import { complianceAgent } from '@/agents/complianceAgent';
import { vendorAgent } from '@/agents/vendorAgent';
import { carbonAgent } from '@/agents/carbonAgent';

type AgentFn = (...args: any[]) => Promise<any>;

const AGENT_MAP: Record<string, AgentFn[]> = {
  MODEL_REGISTERED: [riskAgent, complianceAgent, hitlAgent, vendorAgent, carbonAgent],
  RISK_DETECTED: [complianceAgent, hitlAgent],
  INCIDENT_CREATED: [complianceAgent],
  BIAS_AUDIT_FAILED: [hitlAgent, complianceAgent],
  VENDOR_RISK_HIGH: [complianceAgent],
};

export const eventBus = {
  emit: async (type: string, sourceModule: string, payload: any) => {
    // Persist event to Supabase (non-blocking)
    supabase?.from("governance_events").insert({
      event_type: type,
      source_module: sourceModule,
      payload,
      status: "pending",
    }).then(() => {});

    // Run all registered agents for this event
    const agents = AGENT_MAP[type] ?? [];
    const results = await Promise.allSettled(
      agents.map((agent) => agent(payload))
    );

    // Update event status
    const failed = results.filter((r) => r.status === "rejected").length;
    const status = failed === 0 ? "completed" : failed === results.length ? "failed" : "completed";
    console.log(`[EventBus] ${type}: ${results.length} agents, ${failed} failed, status=${status}`);
  },
};
