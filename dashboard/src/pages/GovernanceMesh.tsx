// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRequiredOrgId } from '../hooks/useTenant';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface GovEvent {
  id: string;
  event_type: string;
  source_module: string;
  status: string;
  triggered_agents: string[];
  cascade_depth: number;
  created_at: string;
  payload: Record<string, unknown>;
}

interface AgentExecution {
  id: string;
  agent_name: string;
  event_type: string;
  status: string;
  duration_ms: number;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
    processing: { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' },
    failed: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
    pending: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    dead_letter: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
  };
  const c = map[status] ?? { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 7px',
        background: c.bg,
        color: c.text,
      }}
    >
      {status}
    </span>
  );
}

export default function GovernanceMesh() {
  const orgId = useRequiredOrgId();
  const [events, setEvents] = useState<GovEvent[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setAgents([
          { id: 'agt-1', agent_name: 'Policy Compliance Agent', description: 'Audits prompt payloads and model outputs against GRC rulesets.', is_enabled: true, total_executions: 1845, error_rate: 0.002, priority: 1, trigger_events: ['Model Output Gen'] },
          { id: 'agt-2', agent_name: 'Resource Allocation Agent', description: 'Manages dynamic scaling and GPU load limits based on ESG targets.', is_enabled: true, total_executions: 4522, error_rate: 0.000, priority: 2, trigger_events: ['Compute Limit Alert'] },
          { id: 'agt-3', agent_name: 'Remediation Router Agent', description: 'Routes detected vulnerabilities to engineering ticket pipelines.', is_enabled: true, total_executions: 982, error_rate: 0.012, priority: 3, trigger_events: ['Scan Center Finding'] },
          { id: 'agt-4', agent_name: 'Alert Notification Agent', description: 'Sends high-severity alerts to Slack and Security Operation Center.', is_enabled: true, total_executions: 1205, error_rate: 0.000, priority: 4, trigger_events: ['High Risk Event'] },
          { id: 'agt-5', agent_name: 'IAM Revocation Agent', description: 'Revokes access credentials automatically on threat detection.', is_enabled: false, total_executions: 145, error_rate: 0.021, priority: 5, trigger_events: ['Credentials Leaked'] }
        ]);
        setEvents([
          { id: 'evt-1', event_type: 'Model Output Gen', source_module: 'Inference API', status: 'completed', triggered_agents: ['Policy Compliance Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 300000).toISOString(), payload: {} },
          { id: 'evt-2', event_type: 'Compute Limit Alert', source_module: 'Model Efficiency', status: 'completed', triggered_agents: ['Resource Allocation Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 900000).toISOString(), payload: {} },
          { id: 'evt-3', event_type: 'Scan Center Finding', source_module: 'Scan Center', status: 'completed', triggered_agents: ['Remediation Router Agent'], cascade_depth: 2, created_at: new Date(Date.now() - 3600000).toISOString(), payload: {} },
          { id: 'evt-4', event_type: 'High Risk Event', source_module: 'Threat Monitor', status: 'failed', triggered_agents: ['Alert Notification Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 7200000).toISOString(), payload: {} }
        ]);
        setExecutions([
          { id: 'exec-1', agent_name: 'Policy Compliance Agent', event_type: 'Model Output Gen', status: 'completed', duration_ms: 84, created_at: new Date(Date.now() - 300000).toISOString() },
          { id: 'exec-2', agent_name: 'Resource Allocation Agent', event_type: 'Compute Limit Alert', status: 'completed', duration_ms: 120, created_at: new Date(Date.now() - 900000).toISOString() },
          { id: 'exec-3', agent_name: 'Remediation Router Agent', event_type: 'Scan Center Finding', status: 'completed', duration_ms: 320, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'exec-4', agent_name: 'Alert Notification Agent', event_type: 'High Risk Event', status: 'failed', duration_ms: 15, created_at: new Date(Date.now() - 7200000).toISOString() }
        ]);
        setLoading(false);
        return;
      }

      const [evts, execs, agts] = await Promise.all([
        supabase.from('governance_events').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
        supabase.from('agent_executions').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100),
        supabase.from('agent_registry').select('*').or(`org_id.eq.${orgId},org_id.is.null`).order('priority'),
      ]);
      setEvents(evts.data ?? []);
      setExecutions(execs.data ?? []);
      setAgents(agts.data ?? []);
      setLoading(false);
    };
    load();

    if (!isSupabaseConfigured()) return;

    const channel = supabase.channel('governance-mesh')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'governance_events', filter: `org_id=eq.${orgId}` },
        (payload) => setEvents(prev => [payload.new as GovEvent, ...prev].slice(0, 50)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_executions', filter: `org_id=eq.${orgId}` },
        (payload) => setExecutions(prev => [payload.new as AgentExecution, ...prev].slice(0, 100)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const agentsList = agents || [];
  const eventsList = events || [];
  const executionsList = executions || [];

  const enabledCount = agentsList.filter(a => a.is_enabled).length;
  const completedToday = eventsList.filter(e => {
    if (!e || !e.created_at) return false;
    const date = new Date(e.created_at);
    return e.status === 'completed' && !isNaN(date.getTime()) && date > new Date(Date.now() - 86400000);
  }).length;
  const errorRate = executionsList.length > 0
    ? ((executionsList.filter(e => e.status === 'failed').length / executionsList.length) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div style={{ padding: 32, color: 'hsl(var(--text-4))', fontSize: 14 }}>
        Loading governance mesh…
      </div>
    );
  }

  return (
    <main id="main-content" style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }} className="space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(var(--text-1))' }}>
          Autonomous Governance Mesh
        </h1>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-4))', marginTop: 4 }}>
          Real-time event bus monitoring — {agentsList.length} agents across 3 cascade flows.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: enabledCount, sub: `${agentsList.length} total` },
          { label: 'Events Today', value: completedToday, sub: 'completed' },
          { label: 'Total Events', value: eventsList.length, sub: 'in window' },
          { label: 'Error Rate', value: `${errorRate}%`, sub: 'agent executions' },
        ].map((k) => (
          <Card key={k.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-4">
              <p style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{k.value}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-2))', marginTop: 4 }}>{k.label}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 2 }}>{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Stream */}
        <Card style={{ borderRadius: 0 }}>
          <CardHeader
            className="px-4 py-3"
            style={{ borderBottom: '1px solid hsl(var(--border))' }}
          >
            <CardTitle style={{ fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Live Event Stream
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'hsl(var(--s-ok-tx))',
                  display: 'inline-block',
                  boxShadow: '0 0 0 2px hsl(var(--s-ok-bg))',
                  animation: 'pulse 2s infinite',
                }}
                title="Live"
              />
            </CardTitle>
          </CardHeader>
          <div style={{ maxHeight: 384, overflowY: 'auto' }}>
            {eventsList.length === 0 && (
              <p style={{ padding: 16, fontSize: 13, color: 'hsl(var(--text-4))', textAlign: 'center' }}>
                No events yet. Register a model to trigger the cascade.
              </p>
            )}
            {eventsList.map((e, idx) => (
              <button
                key={e.id}
                onClick={() => setSelectedEvent(e.id === selectedEvent ? null : e.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  background: selectedEvent === e.id ? 'hsl(var(--bg-muted))' : 'transparent',
                  borderBottom: idx < eventsList.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={ev => { if (selectedEvent !== e.id) ev.currentTarget.style.background = 'hsl(var(--bg-raised))'; }}
                onMouseLeave={ev => { if (selectedEvent !== e.id) ev.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={e.status} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.event_type}</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', flexShrink: 0 }}>D{e.cascade_depth}</span>
                </div>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 3 }}>
                  {e.source_module} · {new Date(e.created_at).toLocaleTimeString()}
                </p>
                {selectedEvent === e.id && e.triggered_agents && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {e.triggered_agents.map(a => (
                      <span key={a} style={{ fontSize: 11, background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', padding: '2px 8px', borderRadius: 0 }}>{a}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Agent Registry */}
        <Card style={{ borderRadius: 0 }}>
          <CardHeader className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <CardTitle style={{ fontSize: 14 }}>Agent Registry</CardTitle>
          </CardHeader>
          <div style={{ maxHeight: 384, overflowY: 'auto' }}>
            {agentsList.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 16px',
                  borderBottom: idx < agentsList.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                <div
                  style={{
                    marginTop: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: a.is_enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.agent_name}
                  </p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.description ?? (a.trigger_events ?? []).join(', ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{a.total_executions ?? 0} runs</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{((a.error_rate ?? 0) * 100).toFixed(1)}% err</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
