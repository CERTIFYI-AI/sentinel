import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Extended Realtime table list covering every functional module.
// See docs/architecture/FUNCTIONAL_ACTIVATION.md
const REALTIME_TABLES = [
  // Core (pre-existing)
  { table: 'notifications', queryKey: ['notifications'] },
  { table: 'guardrails', queryKey: ['guardrails'] },
  { table: 'hitl_queue', queryKey: ['hitl-queue'] },
  { table: 'hitl_items', queryKey: ['hitl-items'] },
  { table: 'risks', queryKey: ['risks'] },
  { table: 'models', queryKey: ['models'] },
  { table: 'model_inventory', queryKey: ['model-inventory'] },
  { table: 'incidents', queryKey: ['incidents'] },
  { table: 'controls', queryKey: ['controls'] },
  { table: 'bias_audits', queryKey: ['bias-audits'] },
  { table: 'audit_log', queryKey: ['audit-log'] },
  // Extended (this activation)
  { table: 'approvals', queryKey: ['approvals'] },
  { table: 'evidence', queryKey: ['evidence'] },
  { table: 'policies', queryKey: ['policies'] },
  { table: 'policy_firewall_rules', queryKey: ['policy-firewall-rules'] },
  { table: 'prompt_registry', queryKey: ['prompt-registry'] },
  { table: 'red_team_campaigns', queryKey: ['red-team-campaigns'] },
  { table: 'red_team_findings', queryKey: ['red-team-findings'] },
  { table: 'vendors', queryKey: ['vendors'] },
  { table: 'remediation_plans', queryKey: ['remediation-plans'] },
  { table: 'regulations', queryKey: ['regulations'] },
  { table: 'dsar_requests', queryKey: ['dsar-requests'] },
  { table: 'consent_records', queryKey: ['consent-records'] },
  { table: 'documents', queryKey: ['documents'] },
  { table: 'datasets', queryKey: ['datasets'] },
  { table: 'ethics_reports', queryKey: ['ethics_reports'] },
  { table: 'explainability_reports', queryKey: ['explainability-reports'] },
  { table: 'security_scans', queryKey: ['security-scans'] },
  { table: 'security_threats', queryKey: ['security-threats'] },
  { table: 'security_vulnerabilities', queryKey: ['security-vulnerabilities'] },
  { table: 'training_courses', queryKey: ['training_courses'] },
  { table: 'compliance_calendar', queryKey: ['compliance-calendar'] },
  { table: 'compliance_events', queryKey: ['compliance-events'] },
  { table: 'conformity_assessments', queryKey: ['conformity-assessments'] },
  { table: 'maturity_assessments', queryKey: ['maturity-assessments'] },
  { table: 'ai_impact_assessments', queryKey: ['ai-impact-assessments'] },
  { table: 'model_arena_runs', queryKey: ['model-arena-runs'] },
  { table: 'carbon_records', queryKey: ['carbon-records'] },
  { table: 'supply_chain_attestations', queryKey: ['supply-chain-attestations'] },
  { table: 'departments', queryKey: ['departments'] },
  { table: 'exceptions', queryKey: ['exceptions'] },
  { table: 'bcp_plans', queryKey: ['bcp_plans'] },
  { table: 'data_assets', queryKey: ['data-assets'] },
  { table: 'attack_surface_assets', queryKey: ['attack-surface-assets'] },
  { table: 'keys_vault', queryKey: ['keys-vault'] },
  { table: 'api_keys', queryKey: ['api-keys'] },
  { table: 'tasks', queryKey: ['tasks'] },
  { table: 'trust_traces', queryKey: ['trust-traces'] },
  // ORGANIZATION module coverage (added 2026-04-20)
  { table: 'assets',        queryKey: ['assets'] },
  { table: 'bia_processes', queryKey: ['bia'] },
  { table: 'committees',    queryKey: ['committees'] },
  { table: 'identities',    queryKey: ['access-reviews'] },
  { table: 'roles',         queryKey: ['roles'] },
  // ESG / Energy / Efficiency (added 2026-04-21)
  { table: 'risk_register', queryKey: ['risk-register'] },
  { table: 'esg_reports', queryKey: ['esg-reports'] },
  { table: 'energy_metrics', queryKey: ['energy-metrics'] },
  { table: 'model_efficiency', queryKey: ['model-efficiency'] },
  // Performance telemetry + GenAI risk profiles (added 2026-08-14)
  { table: 'model_performance_metrics', queryKey: ['model-performance-metrics'] },
  { table: 'genai_risk_profiles', queryKey: ['genai_risk_profiles'] },
  // Deduplication-safe aliases for already-listed tables
  // vendors, incidents, maturity_assessments already present above
  { table: 'transparency_reports', queryKey: ['transparency-reports'] },
] as const;

export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];
    for (const { table, queryKey } of REALTIME_TABLES) {
      try {
        const channel = supabase
          .channel(`realtime-${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            queryClient.invalidateQueries({ queryKey });
          })
          .subscribe();
        channels.push(channel);
      } catch (e) {
        console.warn(`Realtime subscription failed for ${table}:`, e);
      }
    }
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [queryClient]);
}
