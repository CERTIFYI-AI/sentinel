/**
 * useRealtimeInvalidation.ts
 *
 * Central bridge: listens to the Sentinel WebSocket event bus
 * and invalidates React Query caches for the affected modules.
 *
 * Mount ONCE inside a ProtectedLayout or App root (after auth).
 * Works alongside useRealtimeEvents which handles unread counters.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventStore } from '../store/eventStore';

/** Maps event_type prefix -> React Query key arrays to invalidate */
const EVENT_QUERY_MAP: Record<string, string[][]> = {
  // Models
  'model.registered': [['models']],
  'model.updated': [['models'], ['models', 'health']],
  'model.deleted': [['models']],
  'model.status': [['models', 'health']],
  'hitl.decision': [['models'], ['hitl']],

  // Policies
  'policy.approved': [['policies']],
  'policy.rejected': [['policies']],
  'policy.created': [['policies']],
  'policy.updated': [['policies']],
  'policy.deleted': [['policies']],

  // Vendors
  'vendor.registered': [['vendors']],
  'vendor.updated': [['vendors']],
  'vendor.risk_updated': [['vendors'], ['compliance']],

  // Compliance
  'compliance.gap_detected': [['compliance'], ['dashboard']],
  'compliance.gap_resolved': [['compliance'], ['dashboard']],
  'compliance.score_updated': [['compliance'], ['dashboard'], ['ciso']],
  'compliance.framework_updated': [['compliance']],

  // Bias Audits
  'bias_audit.started': [['bias-audits']],
  'bias_audit.completed': [['bias-audits'], ['models'], ['dashboard']],
  'bias_audit.flagged': [['bias-audits'], ['dashboard']],

  // Controls
  'control.updated': [['controls'], ['compliance']],
  'control.passed': [['controls'], ['compliance'], ['dashboard']],
  'control.failed': [['controls'], ['compliance'], ['dashboard']],

  // Agents
  'agent.registered': [['agents']],
  'agent.status': [['agents']],
  'agent.alert': [['agents'], ['dashboard']],

  // Datasets
  'dataset.uploaded': [['datasets']],
  'dataset.processed': [['datasets']],

  // Evals
  'eval.started': [['evals']],
  'eval.completed': [['evals'], ['models']],

  // Security
  'security.vulnerability': [['security'], ['dashboard']],
  'security.campaign_updated': [['security']],

  // HITL
  'hitl.review_needed': [['hitl'], ['tasks']],
  'hitl.approved': [['hitl'], ['tasks'], ['audit-logs']],
  'hitl.rejected': [['hitl'], ['tasks'], ['audit-logs']],

  // Tasks & Approvals
  'task.created': [['tasks']],
  'task.updated': [['tasks']],
  'task.completed': [['tasks'], ['dashboard']],
  'approval.requested': [['approvals']],
  'approval.granted': [['approvals'], ['audit-logs']],
  'approval.denied': [['approvals']],

  // Dashboard
  'dashboard.refresh': [['dashboard']],
  'ciso.refresh': [['ciso']],

  // Notifications
  'notification.new': [['notifications']],
};

export function useRealtimeInvalidation() {
  const qc = useQueryClient();
  const events = useEventStore((s) => s.events);
  const lastEvent = events[events.length - 1];

  useEffect(() => {
    if (!lastEvent) return;

    const { event_type } = lastEvent;

    // Exact match
    const exactKeys = EVENT_QUERY_MAP[event_type];
    if (exactKeys) {
      exactKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      return;
    }

    // Prefix match (e.g. 'model.*' catches 'model.custom_event')
    const prefix = event_type.split('.')[0];
    for (const [pattern, keys] of Object.entries(EVENT_QUERY_MAP)) {
      if (pattern.startsWith(prefix + '.')) {
        // At minimum invalidate the module-level queries
      }
    }

    // Fallback: invalidate by module prefix mapping
    const MODULE_PREFIX_MAP: Record<string, string[][]> = {
      model: [['models']],
      policy: [['policies']],
      vendor: [['vendors']],
      compliance: [['compliance']],
      bias_audit: [['bias-audits']],
      control: [['controls']],
      agent: [['agents']],
      dataset: [['datasets']],
      eval: [['evals']],
      security: [['security']],
      hitl: [['hitl']],
      task: [['tasks']],
      approval: [['approvals']],
      notification: [['notifications']],
      audit: [['audit-logs']],
      dashboard: [['dashboard']],
      ciso: [['ciso']],
    };

    const fallbackKeys = MODULE_PREFIX_MAP[prefix];
    if (fallbackKeys) {
      fallbackKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    }
  }, [lastEvent, qc]);
}
