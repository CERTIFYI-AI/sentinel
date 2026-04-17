// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Robot, ArrowRight, Clock, ChartBar, CheckCircle, Warning, X, Lock, LockOpen, ArrowsClockwise } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '../components/ui/card';
import { MODELS } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { toast } from 'sonner';

const PHASES = ['Development', 'Validation', 'Staging', 'Production', 'Monitoring'] as const;
type Phase = typeof PHASES[number];

const phaseColor: Record<Phase, string> = {
  Development: '#6366f1',
  Validation:  '#f59e0b',
  Staging:     '#3b82f6',
  Production:  '#22c55e',
  Monitoring:  '#8b5cf6',
};

// Gate requirements between phases
const GATE_REQUIREMENTS: Record<string, { name: string; required: boolean }[]> = {
  'Development→Validation': [
    { name: 'Unit tests passing (≥95%)', required: true },
    { name: 'Model card complete', required: true },
    { name: 'Data lineage documented', required: true },
    { name: 'Security scan clear', required: false },
  ],
  'Validation→Staging': [
    { name: 'Bias audit passed', required: true },
    { name: 'Performance benchmarks met', required: true },
    { name: 'Risk assessment complete', required: true },
    { name: 'EU AI Act conformity check', required: false },
  ],
  'Staging→Production': [
    { name: 'UAT sign-off', required: true },
    { name: 'Load testing passed', required: true },
    { name: 'Compliance review approved', required: true },
    { name: 'CISO approval', required: true },
    { name: 'Executive sponsor sign-off', required: false },
  ],
  'Production→Monitoring': [
    { name: 'Monitoring dashboards live', required: true },
    { name: 'Alert thresholds configured', required: true },
    { name: 'Runbook published', required: false },
  ],
};

const phaseIndex = (p: string) => PHASES.indexOf(p as Phase);

type GateStatus = 'pending' | 'approved' | 'rejected';

interface GateState {
  [key: string]: GateStatus; // key = `modelId:gateKey:reqName`
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

// ── Gate Approval Modal ──────────────────────────────────────────────────────
function GateModal({
  modelId,
  modelName,
  fromPhase,
  toPhase,
  gateKey,
  gateStates,
  onApprove,
  onReject,
  onClose,
}: {
  modelId: string;
  modelName: string;
  fromPhase: Phase;
  toPhase: Phase;
  gateKey: string;
  gateStates: GateState;
  onApprove: (reqName: string) => void;
  onReject: (reqName: string) => void;
  onClose: () => void;
}) {
  const requirements = GATE_REQUIREMENTS[gateKey] ?? [];

  const allRequiredApproved = requirements
    .filter(r => r.required)
    .every(r => gateStates[`${modelId}:${gateKey}:${r.name}`] === 'approved');

  const anyRejected = requirements.some(r => gateStates[`${modelId}:${gateKey}:${r.name}`] === 'rejected');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
      <div style={{ width: 520, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{modelId}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{modelName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: phaseColor[fromPhase], fontWeight: 600 }}>{fromPhase}</span>
              <ArrowRight size={10} style={{ color: 'hsl(var(--text-4))' }} />
              <span style={{ fontSize: 11, color: phaseColor[toPhase], fontWeight: 600 }}>{toPhase}</span>
              <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>Gate Review</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
            <X size={16} />
          </button>
        </div>

        {/* Requirements */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requirements.map(req => {
            const stateKey = `${modelId}:${gateKey}:${req.name}`;
            const status = gateStates[stateKey] ?? 'pending';
            return (
              <div key={req.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'hsl(var(--bg-muted))', border: `1px solid ${status === 'approved' ? 'hsl(var(--s-ok-br))' : status === 'rejected' ? 'hsl(var(--s-er-br))' : 'hsl(var(--border))'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {status === 'approved' ? <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} /> :
                   status === 'rejected' ? <X size={14} style={{ color: 'hsl(var(--s-er-tx))' }} /> :
                   <div style={{ width: 14, height: 14, border: '1.5px solid hsl(var(--border))', borderRadius: '50%' }} />}
                  <span style={{ fontSize: 12, color: 'hsl(var(--text-1))', fontWeight: 500 }}>{req.name}</span>
                  {req.required && <span style={{ fontSize: 9, color: 'hsl(var(--s-er-tx))', fontWeight: 700, textTransform: 'uppercase' }}>Required</span>}
                </div>
                {status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onApprove(req.name)}
                      style={{ padding: '3px 10px', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', cursor: 'pointer', fontSize: 11, color: 'hsl(var(--s-ok-tx))', fontWeight: 600 }}>
                      Approve
                    </button>
                    <button onClick={() => onReject(req.name)}
                      style={{ padding: '3px 10px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', cursor: 'pointer', fontSize: 11, color: 'hsl(var(--s-er-tx))', fontWeight: 600 }}>
                      Reject
                    </button>
                  </div>
                )}
                {status !== 'pending' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: status === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                    {status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: anyRejected ? 'hsl(var(--s-er-tx))' : allRequiredApproved ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
            {anyRejected ? '✗ Gate rejected — fix issues before proceeding' :
             allRequiredApproved ? '✓ All required gates approved — ready to promote' :
             `${requirements.filter(r => r.required && gateStates[`${modelId}:${gateKey}:${r.name}`] === 'approved').length}/${requirements.filter(r => r.required).length} required gates approved`}
          </div>
          <button onClick={onClose}
            style={{ padding: '7px 16px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 12, color: 'hsl(var(--text-2))' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModelLifecycle() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();
  const navigate = useNavigate();
  const [gateStates, setGateStates] = useState<GateState>({});
  const [openGate, setOpenGate] = useState<{ modelId: string; modelName: string; fromPhase: Phase; toPhase: Phase; gateKey: string } | null>(null);
  const [modelPhases, setModelPhases] = useState<Record<string, Phase>>({});

  const avgDaysInPhase = Math.round(MODELS.reduce((a, m) => a + m.daysInPhase, 0) / MODELS.length);
  const pendingTransitions = MODELS.filter(m => m.lifecycleProgress < 80 && m.status !== 'production').length;

  const phaseDistribution = PHASES.map(p => ({
    phase: p,
    count: MODELS.filter(m => (modelPhases[m.id] ?? m.lifecyclePhase) === p).length,
    color: phaseColor[p],
  }));

  function openGateModal(model: typeof MODELS[0], fromPhase: Phase, toPhase: Phase) {
    const gateKey = `${fromPhase}→${toPhase}`;
    setOpenGate({ modelId: model.id, modelName: model.name, fromPhase, toPhase, gateKey });
  }

  function approveReq(reqName: string) {
    if (!openGate) return;
    const key = `${openGate.modelId}:${openGate.gateKey}:${reqName}`;
    setGateStates(prev => ({ ...prev, [key]: 'approved' }));
  }

  function rejectReq(reqName: string) {
    if (!openGate) return;
    const key = `${openGate.modelId}:${openGate.gateKey}:${reqName}`;
    setGateStates(prev => ({ ...prev, [key]: 'rejected' }));
  }

  function promoteModel(model: typeof MODELS[0], fromPhase: Phase, toPhase: Phase) {
    const gateKey = `${fromPhase}→${toPhase}`;
    const reqs = GATE_REQUIREMENTS[gateKey] ?? [];
    const allRequired = reqs.filter(r => r.required).every(r => gateStates[`${model.id}:${gateKey}:${r.name}`] === 'approved');
    if (!allRequired) {
      toast.error('Complete all required gate approvals before promoting');
      openGateModal(model, fromPhase, toPhase);
      return;
    }
    setModelPhases(prev => ({ ...prev, [model.id]: toPhase }));
    toast.success(`${model.name} promoted to ${toPhase}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 4 }}>Model Lifecycle</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-4))' }}>{orgName} — Phase tracking, gate approvals and transition management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Robot size={20} />} value={MODELS.length} label="Total Models" />
        <StatCard icon={<Clock size={20} />} value={avgDaysInPhase} label="Avg Days in Phase" />
        <StatCard icon={<ArrowRight size={20} />} value={pendingTransitions} label="Pending Transitions" />
        <StatCard icon={<ChartBar size={20} />} value={PHASES.length} label="Lifecycle Phases" />
      </div>

      {/* Phase Distribution Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 14 }}>Models per Lifecycle Phase</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={phaseDistribution} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="phase" stroke={chart.axis} tick={{ fontSize: 11 }} />
            <YAxis stroke={chart.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 11 }} />
            <Bar dataKey="count" radius={0}>
              {phaseDistribution.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gate Legend */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-4))', marginBottom: 12 }}>Phase Gate Requirements</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap' }}>
          {(Object.keys(GATE_REQUIREMENTS) as string[]).map(gateKey => {
            const reqs = GATE_REQUIREMENTS[gateKey];
            const [from, to] = gateKey.split('→') as [Phase, Phase];
            return (
              <div key={gateKey} style={{ flex: '1 1 200px', minWidth: 180, border: '1px solid hsl(var(--border))', padding: '10px 12px', background: 'hsl(var(--bg-muted))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: phaseColor[from], fontWeight: 600 }}>{from}</span>
                  <ArrowRight size={9} style={{ color: 'hsl(var(--text-4))' }} />
                  <span style={{ fontSize: 11, color: phaseColor[to], fontWeight: 600 }}>{to}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {reqs.map(r => (
                    <div key={r.name} style={{ fontSize: 10, color: r.required ? 'hsl(var(--text-2))' : 'hsl(var(--text-4))', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {r.required ? <Lock size={8} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} /> : <LockOpen size={8} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} />}
                      {r.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pipeline View */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        {/* Phase Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
          {PHASES.map((phase, i) => (
            <div key={phase} style={{ padding: '10px 14px', textAlign: 'center', borderRight: i < 4 ? '1px solid hsl(var(--border))' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: phaseColor[phase] }}>{phase}</div>
              <div style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 2 }}>
                {phaseDistribution[i].count} models
              </div>
            </div>
          ))}
        </div>

        {/* Model Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', divideColor: 'hsl(var(--border))' }}>
          {MODELS.map(model => {
            const currentPhase = (modelPhases[model.id] ?? model.lifecyclePhase) as Phase;
            const currentPhaseIdx = phaseIndex(currentPhase);
            const nextPhase = PHASES[currentPhaseIdx + 1] as Phase | undefined;
            const gateKey = nextPhase ? `${currentPhase}→${nextPhase}` : null;
            const reqs = gateKey ? GATE_REQUIREMENTS[gateKey] ?? [] : [];
            const approvedRequired = reqs.filter(r => r.required && gateStates[`${model.id}:${gateKey}:${r.name}`] === 'approved').length;
            const totalRequired = reqs.filter(r => r.required).length;
            const gateReady = totalRequired > 0 && approvedRequired === totalRequired;

            return (
              <div key={model.id} style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Robot size={14} style={{ color: 'hsl(var(--brand))' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{model.name}</span>
                    <span style={{ fontSize: 10, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{model.id}</span>
                    <span style={{ fontSize: 10, color: phaseColor[currentPhase], fontWeight: 700, padding: '2px 7px', background: `${phaseColor[currentPhase]}20` }}>
                      {currentPhase}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                      <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {model.daysInPhase}d in phase
                    </span>
                    {nextPhase && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openGateModal(model, currentPhase, nextPhase)}
                          style={{ padding: '4px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 11, color: 'hsl(var(--text-2))', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Lock size={9} /> Gate Review {gateKey && `(${approvedRequired}/${totalRequired})`}
                        </button>
                        <button
                          onClick={() => promoteModel(model, currentPhase, nextPhase)}
                          style={{
                            padding: '4px 12px',
                            background: gateReady ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                            border: `1px solid ${gateReady ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                            cursor: gateReady ? 'pointer' : 'not-allowed',
                            fontSize: 11,
                            color: gateReady ? '#fff' : 'hsl(var(--text-4))',
                            fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          <ArrowRight size={9} /> Promote to {nextPhase}
                        </button>
                      </div>
                    )}
                    {!nextPhase && (
                      <span style={{ fontSize: 11, color: 'hsl(var(--s-ok-tx))', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={12} /> Final phase
                      </span>
                    )}
                  </div>
                </div>

                {/* Multi-phase progress bar */}
                <div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {PHASES.map((phase, idx) => {
                      const isCompleted = idx < currentPhaseIdx;
                      const isCurrent = idx === currentPhaseIdx;
                      const progress = isCurrent ? Math.max(20, model.lifecycleProgress % 100) : 100;
                      return (
                        <div key={phase} style={{ flex: 1, height: 6, background: 'hsl(var(--border))', position: 'relative', overflow: 'hidden' }}>
                          {(isCompleted || isCurrent) && (
                            <div style={{ position: 'absolute', inset: 0, background: phaseColor[phase], opacity: isCompleted ? 0.8 : 1, width: isCompleted ? '100%' : `${progress}%`, transition: 'width 0.5s ease' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                    {PHASES.map((phase, idx) => (
                      <div key={phase} style={{ flex: 1, textAlign: 'center' }}>
                        {idx === currentPhaseIdx && (
                          <span style={{ fontSize: 8, color: phaseColor[phase] }}>▲</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Gate Modal */}
      {openGate && (
        <GateModal
          modelId={openGate.modelId}
          modelName={openGate.modelName}
          fromPhase={openGate.fromPhase}
          toPhase={openGate.toPhase}
          gateKey={openGate.gateKey}
          gateStates={gateStates}
          onApprove={approveReq}
          onReject={rejectReq}
          onClose={() => setOpenGate(null)}
        />
      )}
    </div>
  );
}
