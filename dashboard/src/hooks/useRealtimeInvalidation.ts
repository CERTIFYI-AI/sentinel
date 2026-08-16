import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Extended Realtime table list covering every functional module.
// See docs/architecture/FUNCTIONAL_ACTIVATION.md
// `extraKeys` invalidates additional query namespaces that read the same
// table under a different key (one channel per table — never duplicate a
// table entry, the channel name would collide).
type RealtimeEntry = {
  table: string;
  queryKey: readonly string[];
  extraKeys?: readonly (readonly string[])[];
};

const REALTIME_TABLES: readonly RealtimeEntry[] = [
  // Core (pre-existing)
  { table: 'notifications', queryKey: ['notifications'] },
  { table: 'guardrails', queryKey: ['guardrails'] },
  { table: 'hitl_queue', queryKey: ['hitl-queue'] },
  { table: 'hitl_items', queryKey: ['hitl-items'] },
  { table: 'risks', queryKey: ['risks'] },
  { table: 'models', queryKey: ['models'] },
  { table: 'model_inventory', queryKey: ['model-inventory'] },
  // incidents is read under two namespaces: legacy ['incidents']
  // (useIncidentData) and ['ri-incidents'] (useRiskIncidents.useIncidents).
  { table: 'incidents', queryKey: ['incidents'], extraKeys: [['ri-incidents']] },
  { table: 'controls', queryKey: ['controls'] },
  { table: 'bias_audits', queryKey: ['bias-audits'] },
  { table: 'audit_log', queryKey: ['audit-log'] },
  // Extended (this activation)
  { table: 'approvals', queryKey: ['approvals'], extraKeys: [['ri-approvals']] },
  { table: 'evidence', queryKey: ['evidence'] },
  // Policy cluster — usePolicies reads ['policies']; version history is read
  // under ['cg-policy-versions'] (useComplianceGroup/PolicyEditor); policy
  // acknowledgments use the ['policy-acks'] namespace (PolicyDetail) — the
  // table-level prefix invalidates every ['policy-acks', policyId] query.
  { table: 'policies', queryKey: ['policies'] },
  { table: 'policy_versions', queryKey: ['cg-policy-versions'] },
  { table: 'policy_acknowledgments', queryKey: ['policy-acks'] },
  { table: 'policy_firewall_rules', queryKey: ['policy-firewall-rules'] },
  { table: 'prompt_registry', queryKey: ['prompt-registry'] },
  { table: 'red_team_campaigns', queryKey: ['red-team-campaigns'] },
  { table: 'red_team_findings', queryKey: ['red-team-findings'] },
  { table: 'vendors', queryKey: ['vendors'] },
  { table: 'remediation_plans', queryKey: ['remediation-plans'], extraKeys: [['ri-remediations']] },
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
  // Calendar: the canonical read is useComplianceGroup.useCalendar
  // (['cg-calendar']); ['compliance-calendar'] kept for legacy readers.
  { table: 'compliance_calendar', queryKey: ['cg-calendar'], extraKeys: [['compliance-calendar']] },
  { table: 'compliance_events', queryKey: ['compliance-events'] },
  // conformity_assessments also feeds the derived calendar view.
  { table: 'conformity_assessments', queryKey: ['conformity-assessments'], extraKeys: [['cg-calendar']] },
  { table: 'maturity_assessments', queryKey: ['maturity-assessments'] },
  { table: 'ai_impact_assessments', queryKey: ['ai-impact-assessments'] },
  { table: 'model_arena_runs', queryKey: ['model-arena-runs'] },
  { table: 'carbon_records', queryKey: ['carbon-records'] },
  { table: 'supply_chain_attestations', queryKey: ['supply-chain-attestations'] },
  { table: 'departments', queryKey: ['departments'] },
  // exceptions feed the derived compliance calendar (expiry deadlines).
  { table: 'exceptions', queryKey: ['exceptions'], extraKeys: [['cg-calendar']] },
  { table: 'bcp_plans', queryKey: ['bcp_plans'] },
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
  // Canonical read is useComplianceGroup.useTransparencyReports
  // (['cg-transparency-reports']); old namespace kept for legacy readers.
  { table: 'transparency_reports', queryKey: ['cg-transparency-reports'], extraKeys: [['transparency-reports']] },
  // Oversight cluster — HITL / approvals / automation (added 2026-08-16):
  // the shared hitl_reviews queue and the approvals ledger refresh live so a
  // mesh-written review or a colleague's decision appears without a reload.
  { table: 'hitl_reviews', queryKey: ['ri-hitl'] },
  { table: 'approval_workflows', queryKey: ['ri-approval-workflows'] },
  { table: 'automation_rules', queryKey: ['ri-automation-rules'] },
  { table: 'automation_runs', queryKey: ['ri-automation-runs'] },
  // Regulatory operations (keys match hooks/useComplianceGroup.ts).
  // regulator_filings also feed the derived compliance calendar.
  { table: 'regulator_filings', queryKey: ['cg-filings'], extraKeys: [['cg-calendar']] },
  { table: 'post_market_events', queryKey: ['cg-pmm-events'] },
  { table: 'post_market_plans', queryKey: ['cg-pmm-plans'] },
  // Risk-group regulation register (useRiskIncidents.useRegulationEntries).
  { table: 'regulation_entries', queryKey: ['ri-regulations'] },
  // Govern add-ons (keys match hooks/useGovernAddons.ts). ai_trainings feed
  // the derived compliance calendar (session dates).
  { table: 'ai_trainings', queryKey: ['ai_trainings'], extraKeys: [['cg-calendar']] },
  { table: 'trust_center_config', queryKey: ['trust_center_config'] },
  // Compliance group — audits & control testing (hooks/useComplianceGroup.ts).
  // audits and control_tests also feed the derived compliance calendar.
  { table: 'audits', queryKey: ['cg-audits'], extraKeys: [['cg-calendar']] },
  { table: 'audit_findings', queryKey: ['cg-audit-findings'] },
  { table: 'control_tests', queryKey: ['cg-control-tests'], extraKeys: [['cg-calendar']] },
  // Control drift history (pages/compliance/ControlDrift.tsx).
  { table: 'control_evaluation_history', queryKey: ['control-eval-history'] },
  // Tabletop exercises feed the derived compliance calendar too.
  { table: 'tabletop_exercises', queryKey: ['ri-tabletops'], extraKeys: [['cg-calendar']] },
  // Agentic mesh execution ledger: Compliance Autopilot reads a filtered
  // slice; Governance Mesh reads ['mesh-executions'/'mesh-fleet'] per-org
  // (prefix invalidation catches the orgId-suffixed keys). useMeshFleet also
  // has its own org-filtered channel ('agentic-mesh-<org>'), so channel names
  // do not collide with this table-level one.
  { table: 'agent_executions', queryKey: ['compliance-autopilot-executions'], extraKeys: [['mesh-executions'], ['mesh-fleet']] },
];

export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];
    for (const { table, queryKey, extraKeys } of REALTIME_TABLES) {
      try {
        const channel = supabase
          .channel(`realtime-${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            queryClient.invalidateQueries({ queryKey: queryKey as string[] });
            for (const k of extraKeys ?? []) {
              queryClient.invalidateQueries({ queryKey: k as string[] });
            }
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
