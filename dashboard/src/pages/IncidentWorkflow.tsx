// SPDX-License-Identifier: Apache-2.0
// Incident Workflow — the state machine now runs on the real org-scoped
// `incidents` backend. Transitions persist via useIncidentTransitions (which
// also writes an incident_workflow_steps record); the success toast fires
// only after the write resolves. Statuses are the service's lowercase set:
// open → investigating → containment → remediation → resolved → closed.
// Escalation is represented by severity (critical ⇒ "Escalated" badge), not
// a fake graph node. Creation happens in the Incident Log (same backend).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import {
  Warning, ArrowRight, CheckCircle, Clock, Plus, X,
  Siren, CaretRight, Scales,
} from '@phosphor-icons/react';
import { severityColor, formatDate } from '../data/seed';
import { useIncidents, useIncidentTransitions, useWorkflowSteps } from '@/hooks/useRiskIncidents';
import type { IncidentRecord } from '@/services/incidentResponseService';
import { useModelsData } from '@/hooks/useModelsData';
import { useAuthStore } from '../stores/authStore';

// ── State Machine Definition (service's lowercase status set) ────────────────
type IncidentStatus = 'open' | 'investigating' | 'containment' | 'remediation' | 'resolved' | 'closed';

interface WorkflowState {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  nextStates: IncidentStatus[];
}

const WORKFLOW: Record<IncidentStatus, WorkflowState> = {
  open: {
    label: 'Open',
    description: 'Incident reported, pending triage',
    color: 'hsl(var(--s-er-tx))',
    bgColor: 'hsl(var(--s-er-bg))',
    nextStates: ['investigating'],
  },
  investigating: {
    label: 'Investigating',
    description: 'Root cause analysis in progress',
    color: 'hsl(var(--s-in-tx))',
    bgColor: 'hsl(var(--s-in-bg))',
    nextStates: ['containment'],
  },
  containment: {
    label: 'Containment',
    description: 'Impact being contained and isolated',
    color: 'hsl(var(--s-wn-tx))',
    bgColor: 'hsl(var(--s-wn-bg))',
    nextStates: ['remediation'],
  },
  remediation: {
    label: 'Remediation',
    description: 'Remediation controls being applied',
    color: 'hsl(var(--tag-purple))',
    bgColor: 'hsl(263 30% 14%)',
    nextStates: ['resolved'],
  },
  resolved: {
    label: 'Resolved',
    description: 'Incident contained and resolved',
    color: 'hsl(var(--s-ok-tx))',
    bgColor: 'hsl(var(--s-ok-bg))',
    nextStates: ['closed'],
  },
  closed: {
    label: 'Closed',
    description: 'Post-mortem complete, incident closed',
    color: 'hsl(var(--text-3))',
    bgColor: 'hsl(var(--bg-muted))',
    nextStates: [],
  },
};

const WORKFLOW_FALLBACK: WorkflowState = {
  label: 'Unknown', description: 'Status not recognized',
  color: 'hsl(var(--text-3))', bgColor: 'hsl(var(--bg-muted))', nextStates: [],
};
const workflowState = (s: string): WorkflowState => WORKFLOW[s as IncidentStatus] ?? WORKFLOW_FALLBACK;

const isTerminal = (s: string) => s === 'resolved' || s === 'closed';
const incidentRef = (inc: IncidentRecord) => inc.incidentId || (inc.id ? inc.id.slice(0, 8) : '—');
const slaStart = (inc: IncidentRecord) => inc.detectedAt ?? inc.createdAt ?? null;

// ── SLA Timer (real fields — honest "No SLA set" when slaHours is null) ─────
function SlaTimer({ start, slaHours, status }: { start: string | null; slaHours: number | null | undefined; status: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  let text: string;
  let breached = false;
  if (isTerminal(status)) {
    text = 'Resolved';
  } else if (slaHours == null) {
    text = 'No SLA set';
  } else if (!start || isNaN(new Date(start).getTime())) {
    text = 'N/A';
  } else {
    const diff = new Date(start).getTime() + slaHours * 3600000 - now;
    if (diff <= 0) {
      breached = true;
      text = `BREACHED ${Math.abs(Math.floor(diff / 60000))}m ago`;
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      text = `${h}h ${m}m remaining`;
    }
  }

  const neutral = text === 'No SLA set' || text === 'N/A';
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'monospace',
      color: breached ? 'hsl(var(--s-er-tx))' : neutral ? 'hsl(var(--text-4))' : 'hsl(var(--s-ok-tx))',
      background: breached ? 'hsl(var(--s-er-bg))' : 'transparent',
      padding: breached ? '1px 5px' : 0,
    }}>
      {text}
    </span>
  );
}

// ── Escalation badge — severity is the escalation signal, not a fake node ───
function EscalatedBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px',
      fontSize: 10, fontWeight: 700, background: 'hsl(var(--r-cr-bg))',
      color: 'hsl(var(--r-cr-tx))', border: '1px solid hsl(var(--r-cr-br))',
    }}>
      <Siren size={10} weight="fill" /> ESCALATED
    </span>
  );
}

// ── State Machine Visual ─────────────────────────────────────────────────────
function StateMachineVisual({ currentStatus, escalated }: { currentStatus: IncidentStatus; escalated: boolean }) {
  const mainPath: IncidentStatus[] = ['open', 'investigating', 'containment', 'remediation', 'resolved', 'closed'];

  return (
    <div style={{ overflowX: 'auto', padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 700 }}>
        {mainPath.map((state, i) => {
          const ws = WORKFLOW[state];
          const isActive = currentStatus === state;
          const isDone = mainPath.indexOf(currentStatus) > i;
          return (
            <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                padding: '6px 12px',
                background: isActive ? ws.bgColor : isDone ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                border: `1.5px solid ${isActive ? ws.color : isDone ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`,
                color: isActive ? ws.color : isDone ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
              }}>
                {isDone ? '✓ ' : isActive ? '● ' : ''}{ws.label}
              </div>
              {i < mainPath.length - 1 && (
                <ArrowRight size={12} style={{ color: isDone ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--border))', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
        {escalated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <div style={{ width: 1, height: 24, background: 'hsl(var(--border))' }} />
            <EscalatedBadge />
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentWorkflow() {
  const { items: incidents, isLoading, error } = useIncidents();
  const transition = useIncidentTransitions();
  const { models } = useModelsData();
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');

  const selected = incidents.find((i) => i.id === selectedId) || null;
  const { data: steps = [], isLoading: stepsLoading } = useWorkflowSteps(selected?.id);

  const modelName = (id?: string | null) => (id ? models.find((m) => m.id === id)?.name ?? 'Unavailable' : undefined);
  const actor = user?.fullName ?? user?.email ?? undefined;

  // Deep link: ?open=<id> selects that incident (uuid or business code).
  useEffect(() => {
    if (!openParam || incidents.length === 0) return;
    const match = incidents.find((i) => i.id === openParam || i.incidentId === openParam);
    if (match?.id) setSelectedId(match.id);
  }, [openParam, incidents]);

  const clearSelection = () => {
    setSelectedId(null);
    if (openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  async function handleTransition(inc: IncidentRecord, toStatus: IncidentStatus) {
    try {
      await transition.mutateAsync({ incident: inc, toStatus, actor });
      // Success toast is fired by the hook only after the write persisted.
    } catch {
      /* the hook already toasted the real error */
    }
  }

  if (isLoading) return <PageSkeleton title="Incident Workflow" showStats rows={6} />;

  const filtered = filterStatus === 'all' ? incidents : incidents.filter((i) => i.status === filterStatus);

  const openCount = incidents.filter((i) => !isTerminal(i.status)).length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && !isTerminal(i.status)).length;
  const resolvedCount = incidents.filter((i) => isTerminal(i.status)).length;
  const reportableCount = incidents.filter((i) => i.regulatoryReportable && !isTerminal(i.status)).length;

  return (
    <div>
      <PageHeader
        title="Incident Workflow"
        subtitle="AI incident response — ISO 27001 Annex A.16 / NIST IR workflow state machine"
        actions={
          <Link
            to="/risk/incidents"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'hsl(var(--brand))', cursor: 'pointer', color: 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <Plus size={14} /> Report Incident
          </Link>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div style={{ border: '1px solid hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--s-er-tx))' }}>Failed to load incidents</p>
          <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>{(error as Error).message}</p>
        </div>
      )}

      {/* KPI tiles — derived from real rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open Incidents', value: openCount, icon: Warning, color: 'hsl(var(--s-er-tx))' },
          { label: 'Critical Active', value: criticalCount, icon: Siren, color: 'hsl(var(--r-cr-tx))' },
          { label: 'Regulatory Reportable', value: reportableCount, icon: Scales, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Resolved / Closed', value: resolvedCount, icon: CheckCircle, color: 'hsl(var(--s-ok-tx))' },
        ].map((kpi) => (
          <Card key={kpi.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <kpi.icon size={22} style={{ color: kpi.color, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* State machine diagram */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', marginBottom: 20 }}>
        <CardHeader className="pb-1">
          <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Incident State Machine</CardTitle>
        </CardHeader>
        <CardContent>
          <StateMachineVisual
            currentStatus={(selected?.status as IncidentStatus) ?? 'open'}
            escalated={selected?.severity === 'critical'}
          />
        </CardContent>
      </Card>

      {/* Filters and list */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 16 }}>
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Incident Queue ({filtered.length})</CardTitle>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as IncidentStatus | 'all')}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(WORKFLOW) as IncidentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{workflowState(s).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Title', 'Severity', 'Status', 'Model', 'SLA Remaining', 'Assignee', ''].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => {
                    const ws = workflowState(inc.status);
                    const sc = severityColor(inc.severity);
                    const isSelected = selectedId === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => (isSelected ? clearSelection() : setSelectedId(inc.id ?? null))}
                        style={{ borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', background: isSelected ? 'hsl(var(--brand)/0.05)' : 'transparent' }}
                      >
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--brand))' }}>{incidentRef(inc)}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 280 }}>
                          <p style={{ fontWeight: 500, color: 'hsl(var(--text-1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</p>
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {inc.severity}
                          </span>
                          {inc.severity === 'critical' && !isTerminal(inc.status) && (
                            <span style={{ marginLeft: 4 }}><EscalatedBadge /></span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, background: ws.bgColor, color: ws.color }}>
                            {ws.label}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                          {inc.modelId
                            ? <InterlinkChip label={modelName(inc.modelId) ?? 'Unavailable'} to={`/models/inventory/${inc.modelId}`} />
                            : inc.affectedModels?.[0]
                              ? <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{inc.affectedModels[0]}</span>
                              : <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <SlaTimer start={slaStart(inc)} slaHours={inc.slaHours} status={inc.status} />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: 'hsl(var(--text-3))' }}>{inc.assignee || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px 12px', textAlign: 'center', fontSize: 12, color: 'hsl(var(--text-4))' }}>
                        {incidents.length === 0
                          ? <>No incidents recorded yet. <Link to="/risk/incidents" style={{ color: 'hsl(var(--brand))' }}>Report one in the Incident Log</Link> to start the workflow.</>
                          : 'No incidents match the current status filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selected && (
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', height: 'fit-content' }}>
            <CardHeader className="pb-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--brand))' }}>{incidentRef(selected)}</p>
                  <CardTitle style={{ fontSize: 14, color: 'hsl(var(--text-1))' }}>{selected.title}</CardTitle>
                  {selected.severity === 'critical' && <div style={{ marginTop: 6 }}><EscalatedBadge /></div>}
                </div>
                <button onClick={clearSelection} aria-label="Close detail" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                  <X size={16} />
                </button>
              </div>
            </CardHeader>
            <CardContent style={{ paddingTop: 0 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 8 }}>Workflow Transitions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {workflowState(selected.status).nextStates.map((nextStatus) => {
                    const ws = WORKFLOW[nextStatus];
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => handleTransition(selected, nextStatus)}
                        disabled={transition.isPending}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: ws.bgColor, border: `1px solid ${ws.color}`, cursor: transition.isPending ? 'wait' : 'pointer', color: ws.color, fontSize: 12, fontWeight: 600, textAlign: 'left', opacity: transition.isPending ? 0.6 : 1 }}
                      >
                        <ArrowRight size={12} />
                        Move to {ws.label}
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: ws.color, opacity: 0.8 }}>
                          {ws.description}
                        </span>
                      </button>
                    );
                  })}
                  {workflowState(selected.status).nextStates.length === 0 && (
                    <div style={{ padding: '8px 12px', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))' }}>
                      <p style={{ fontSize: 12, color: 'hsl(var(--s-ok-tx))', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> Workflow complete
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Severity', node: <span style={{ fontSize: 12, fontWeight: 500, color: severityColor(selected.severity).text }}>{selected.severity}</span> },
                  { label: 'Status', node: <span style={{ fontSize: 12, fontWeight: 500, color: workflowState(selected.status).color }}>{workflowState(selected.status).label}</span> },
                  { label: 'Assignee', node: <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{selected.assignee || '—'}</span> },
                  { label: 'Detected', node: <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{slaStart(selected) ? formatDate(slaStart(selected)!) : '—'}</span> },
                  {
                    label: 'Model Affected',
                    node: selected.modelId
                      ? <InterlinkChip label={modelName(selected.modelId) ?? 'Unavailable'} to={`/models/inventory/${selected.modelId}`} />
                      : selected.affectedModels?.[0]
                        ? <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{selected.affectedModels[0]}</span>
                        : <span style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>—</span>,
                  },
                  {
                    label: 'Incident Log',
                    node: <InterlinkChip label="Open in Incident Log" to={`/risk/incidents?open=${selected.id}`} />,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: 7 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.label}</span>
                    {item.node}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>SLA Status</p>
                <div style={{ padding: '8px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={13} style={{ color: 'hsl(var(--text-3))' }} />
                    <SlaTimer start={slaStart(selected)} slaHours={selected.slaHours} status={selected.status} />
                  </div>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 4 }}>
                    {selected.slaHours != null
                      ? <>SLA Target: {selected.slaHours}h from detection · {slaStart(selected) ? formatDate(slaStart(selected)!) : '—'}</>
                      : 'No SLA set for this incident.'}
                  </p>
                </div>
              </div>

              {selected.description && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>Description</p>
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.5 }}>{selected.description}</p>
                </div>
              )}

              {/* Transition history — persisted incident_workflow_steps */}
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>Transition History</p>
                {stepsLoading ? (
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Loading history...</p>
                ) : steps.length === 0 ? (
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>No transitions recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {steps.map((step, i) => (
                      <div key={step.id ?? i} style={{ display: 'flex', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: workflowState(step.toStatus).color, marginTop: 4, flexShrink: 0 }} />
                          {i < steps.length - 1 && <span style={{ width: 1, flex: 1, background: 'hsl(var(--border))' }} />}
                        </div>
                        <div style={{ paddingBottom: i < steps.length - 1 ? 12 : 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>
                            {step.fromStatus ? `${workflowState(step.fromStatus).label} → ` : ''}{workflowState(step.toStatus).label}
                          </p>
                          <p style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>
                            {step.actor || 'Unknown actor'} · {step.occurredAt ? formatDate(step.occurredAt) : '—'}
                          </p>
                          {step.notes && <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>{step.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
