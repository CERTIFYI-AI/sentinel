import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  Bell, Warning, ArrowRight, CheckCircle, Clock, Plus, X, User,
  Siren, ShieldCheck, ArrowSquareOut, CaretRight,
} from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';
import { INCIDENTS, USERS, severityColor, formatDate } from '../data/seed';


// ── State Machine Definition ─────────────────────────────────────────────────
type IncidentStatus = 'open' | 'triaged' | 'investigating' | 'escalated' | 'mitigating' | 'resolved' | 'post_mortem';

interface WorkflowState {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  nextStates: IncidentStatus[];
  slaHours?: number;
}

const WORKFLOW: Record<IncidentStatus, WorkflowState> = {
  open: {
    label: 'Open',
    description: 'Incident reported, pending triage',
    color: 'hsl(var(--s-er-tx))',
    bgColor: 'hsl(var(--s-er-bg))',
    nextStates: ['triaged'],
    slaHours: 0.5,
  },
  triaged: {
    label: 'Triaged',
    description: 'Severity assessed and team assigned',
    color: 'hsl(var(--s-wn-tx))',
    bgColor: 'hsl(var(--s-wn-bg))',
    nextStates: ['investigating', 'escalated'],
    slaHours: 2,
  },
  investigating: {
    label: 'Investigating',
    description: 'Root cause analysis in progress',
    color: 'hsl(var(--s-in-tx))',
    bgColor: 'hsl(var(--s-in-bg))',
    nextStates: ['escalated', 'mitigating'],
    slaHours: 4,
  },
  escalated: {
    label: 'Escalated',
    description: 'Escalated to CISO / executive team',
    color: 'hsl(var(--r-cr-tx))',
    bgColor: 'hsl(var(--r-cr-bg))',
    nextStates: ['investigating', 'mitigating'],
    slaHours: 1,
  },
  mitigating: {
    label: 'Mitigating',
    description: 'Remediation controls being applied',
    color: 'hsl(var(--tag-purple))',
    bgColor: 'hsl(263 30% 14%)',
    nextStates: ['resolved'],
    slaHours: 8,
  },
  resolved: {
    label: 'Resolved',
    description: 'Incident contained and resolved',
    color: 'hsl(var(--s-ok-tx))',
    bgColor: 'hsl(var(--s-ok-bg))',
    nextStates: ['post_mortem'],
    slaHours: 24,
  },
  post_mortem: {
    label: 'Post-Mortem',
    description: 'Root cause documented, lessons learned',
    color: 'hsl(var(--text-3))',
    bgColor: 'hsl(var(--bg-muted))',
    nextStates: [],
    slaHours: 72,
  },
};

const WORKFLOW_FALLBACK: WorkflowState = {
  label: 'Unknown', description: 'Status not recognized',
  color: 'hsl(var(--text-3))', bgColor: 'hsl(var(--bg-muted))', nextStates: [], slaHours: 0,
};
const workflowState = (s: string): WorkflowState => WORKFLOW[s as IncidentStatus] ?? WORKFLOW_FALLBACK;

type LocalIncident = typeof INCIDENTS[0] & {
  status2: IncidentStatus;
  createdDate: string;
  slaHours: number;
  assignee: string;
};

// ── SLA Timer ────────────────────────────────────────────────────────────────
function SlaTimer({ createdDate, slaHours, status }: { createdDate: string; slaHours: number; status: IncidentStatus }) {
  const [remaining, setRemaining] = useState('');
  const [breached, setBreached] = useState(false);

  useEffect(() => {
    function update() {
      const start = new Date(createdDate).getTime();
      if (isNaN(start)) { setRemaining("N/A"); return; }
      const slaEnd = start + slaHours * 3600000;
      const now = Date.now();
      const diff = slaEnd - now;
      if (status === 'resolved' || status === 'post_mortem') { setRemaining('Resolved'); return; }
      if (diff <= 0) { setBreached(true); setRemaining(`BREACHED ${Math.abs(Math.floor(diff / 60000))}m ago`); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setBreached(false);
      setRemaining(`${h}h ${m}m remaining`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [createdDate, slaHours, status]);

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'monospace',
      color: breached ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))',
      background: breached ? 'hsl(var(--s-er-bg))' : 'transparent',
      padding: breached ? '1px 5px' : 0,
    }}>
      {remaining}
    </span>
  );
}

// ── State Machine Visual ─────────────────────────────────────────────────────
function StateMachineVisual({ currentStatus }: { currentStatus: IncidentStatus }) {
  const states: IncidentStatus[] = ['open', 'triaged', 'investigating', 'escalated', 'mitigating', 'resolved', 'post_mortem'];
  const mainPath: IncidentStatus[] = ['open', 'triaged', 'investigating', 'mitigating', 'resolved', 'post_mortem'];

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
        {/* Escalated branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <div style={{ width: 1, height: 24, background: 'hsl(var(--border))' }} />
          <div style={{
            padding: '6px 12px',
            background: currentStatus === 'escalated' ? WORKFLOW.escalated.bgColor : 'hsl(var(--bg-muted))',
            border: `1.5px solid ${currentStatus === 'escalated' ? WORKFLOW.escalated.color : 'hsl(var(--border))'}`,
            color: currentStatus === 'escalated' ? WORKFLOW.escalated.color : 'hsl(var(--text-4))',
            fontSize: 11,
            fontWeight: currentStatus === 'escalated' ? 700 : 500,
          }}>
            {currentStatus === 'escalated' ? '● ' : ''}Escalated
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Incident Modal ────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (inc: LocalIncident) => void }) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(USERS[0].name);

  function handleCreate() {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const sla = WORKFLOW.open.slaHours ?? 1;
    onCreate({
      id: `INC-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
      title,
      severity,
      description,
      status: 'open',
      status2: 'open',
      date: now.split('T')[0],
      createdDate: now,
      slaHours: severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'medium' ? 8 : 24,
      assignee,
      resolved: false,
      model: '',
      resolution: '',
      daysOpen: 0,
      type: 'Operational',
    } as any);
    toast.success('Incident created successfully');
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: 480, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'hsl(var(--text-1))', fontSize: 14 }}>Report New Incident</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 5 }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief incident description"
              style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 5 }}>Severity</label>
            <select value={severity} onChange={e => setSeverity(e.target.value as any)}
              style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
              {(['critical', 'high', 'medium', 'low']).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 5 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 5 }}>Assignee</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
              {USERS.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 9, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
            <button onClick={handleCreate} disabled={!title.trim()}
              style={{ flex: 1, padding: 9, background: !title.trim() ? 'hsl(var(--bg-muted))' : 'hsl(var(--brand))', border: 'none', cursor: !title.trim() ? 'not-allowed' : 'pointer', color: !title.trim() ? 'hsl(var(--text-4))' : 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}>
              Create Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IncidentWorkflow() {
  const [incidents, setIncidents] = useState<any[]>(() =>
    INCIDENTS.map((inc: any) => ({
      ...inc,
      status2: (inc.resolved ? 'resolved' : 'investigating') as IncidentStatus,
      createdDate: inc.date,
      slaHours: inc.severity === 'critical' ? 1 : inc.severity === 'high' ? 2 : 8,
      assignee: USERS[Math.floor(Math.random() * USERS.length)].name,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');

  const selected = incidents.find(i => i.id === selectedId) || null;

  function transitionStatus(id: string, nextStatus: IncidentStatus) {
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      const ws = WORKFLOW[nextStatus as IncidentStatus];
      const slaHours = ws.slaHours ?? inc.slaHours;
      return { ...inc, status2: nextStatus, slaHours, resolved: nextStatus === 'resolved' || nextStatus === 'post_mortem' };
    }));
    toast.success(`Incident moved to ${workflowState(nextStatus).label}`);
  }

  const filtered = filterStatus === 'all' ? incidents : incidents.filter(i => i.status2 === filterStatus);

  const openCount = incidents.filter(i => i.status2 !== 'resolved' && i.status2 !== 'post_mortem').length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status2 !== 'resolved' && i.status2 !== 'post_mortem').length;
  const resolvedCount = incidents.filter(i => i.status2 === 'resolved' || i.status2 === 'post_mortem').length;
  const escalatedCount = incidents.filter(i => i.status2 === 'escalated').length;

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 4 }}>Incident Workflow</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))' }}>AI incident response — ISO 27001 Annex A.16 / NIST IR workflow state machine</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'hsl(var(--brand))', border: 'none', cursor: 'pointer', color: 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={14} /> Report Incident
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open Incidents', value: openCount, icon: Warning, color: 'hsl(var(--s-er-tx))' },
          { label: 'Critical Active', value: criticalCount, icon: Siren, color: 'hsl(var(--r-cr-tx))' },
          { label: 'Escalated', value: escalatedCount, icon: Bell, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Resolved (all)', value: resolvedCount, icon: CheckCircle, color: 'hsl(var(--s-ok-tx))' },
        ].map(kpi => (
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
          <StateMachineVisual currentStatus={selected?.status2 ?? 'open'} />
        </CardContent>
      </Card>

      {/* Filters and list */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 16 }}>
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Incident Queue ({filtered.length})</CardTitle>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                style={{ padding: '4px 8px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12 }}
              >
                <option value="all">All Statuses</option>
                {(Object.keys(WORKFLOW) as IncidentStatus[]).map(s => (
                  <option key={s} value={s}>{workflowState(s).label}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Title', 'Severity', 'Status', 'SLA Remaining', 'Assignee', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => {
                    const ws = WORKFLOW[inc.status2 as IncidentStatus];
                    const sc = severityColor(inc.severity);
                    const isSelected = selectedId === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedId(isSelected ? null : inc.id)}
                        style={{ borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', background: isSelected ? 'hsl(var(--brand)/0.05)' : 'transparent' }}
                      >
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--brand))' }}>{inc.id}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 280 }}>
                          <p style={{ fontWeight: 500, color: 'hsl(var(--text-1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</p>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, background: ws.bgColor, color: ws.color }}>
                            {ws.label}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <SlaTimer createdDate={inc.createdDate} slaHours={inc.slaHours} status={inc.status2} />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: 'hsl(var(--text-3))' }}>{inc.assignee}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        </td>
                      </tr>
                    );
                  })}
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
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--brand))' }}>{selected.id}</p>
                  <CardTitle style={{ fontSize: 14, color: 'hsl(var(--text-1))' }}>{selected.title}</CardTitle>
                </div>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                  <X size={16} />
                </button>
              </div>
            </CardHeader>
            <CardContent style={{ paddingTop: 0 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 8 }}>Workflow Transitions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {workflowState(selected.status2).nextStates.map((nextStatus: any) => {
                    const ws = WORKFLOW[nextStatus as IncidentStatus];
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => transitionStatus(selected.id, nextStatus)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: ws.bgColor, border: `1px solid ${ws.color}`, cursor: 'pointer', color: ws.color, fontSize: 12, fontWeight: 600, textAlign: 'left' }}
                      >
                        <ArrowRight size={12} />
                        Move to {ws.label}
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: ws.color, opacity: 0.8 }}>
                          {ws.description}
                        </span>
                      </button>
                    );
                  })}
                  {workflowState(selected.status2).nextStates.length === 0 && (
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
                  { label: 'Severity', value: selected.severity, color: severityColor(selected.severity).text },
                  { label: 'Status', value: workflowState(selected.status2).label, color: workflowState(selected.status2).color },
                  { label: 'Assignee', value: selected.assignee, color: 'hsl(var(--text-1))' },
                  { label: 'Date Opened', value: formatDate(selected.date), color: 'hsl(var(--text-1))' },
                  { label: 'Model Affected', value: selected.model || 'N/A', color: 'hsl(var(--text-1))' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: 7 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>SLA Status</p>
                <div style={{ padding: '8px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={13} style={{ color: 'hsl(var(--text-3))' }} />
                    <SlaTimer createdDate={selected.createdDate} slaHours={selected.slaHours} status={selected.status2} />
                  </div>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 4 }}>
                    SLA Target: {selected.slaHours}h from creation · {formatDate(selected.date)}
                  </p>
                </div>
              </div>

              {selected.description && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>Description</p>
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.5 }}>{selected.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={inc => setIncidents(prev => [inc, ...prev])}
        />
      )}
    </div>
  );
}
