import { supabase } from './supabase';
import { riskAssessmentAgent } from '@/agents/riskAssessmentAgent';
import { hitlAgent } from '@/agents/hitlAgent';
import { complianceImpactAgent } from '@/agents/complianceImpactAgent';
import { vendorRiskAgent } from '@/agents/vendorRiskAgent';
import { carbonAgent } from '@/agents/carbonAgent';

type AgentFn = (...args: any[]) => Promise<any>;

const AGENT_MAP: Record<string, AgentFn[]> = {
  MODEL_REGISTERED: [riskAssessmentAgent, complianceImpactAgent, hitlAgent, vendorRiskAgent, carbonAgent],
  RISK_DETECTED: [complianceImpactAgent, hitlAgent],
  INCIDENT_CREATED: [complianceImpactAgent],
  BIAS_AUDIT_FAILED: [hitlAgent, complianceImpactAgent],
  VENDOR_RISK_HIGH: [complianceImpactAgent],
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
    // console.log(`[EventBus] ${type}: ${results.length} agents, ${failed} failed, status=${status}`);
  },
};
