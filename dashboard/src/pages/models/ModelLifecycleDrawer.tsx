// @ts-nocheck
import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, ArrowRight, CheckCircle, Robot, User, FileText,
  ArrowCircleRight, Warning, Clock,
} from '@phosphor-icons/react';
import { MODELS, USERS, formatDate } from '../../data/seed';
import type { Model } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── lifecycle definition ───────────────────────────────────────────────────

interface LifecyclePhase {
  name: string;
  description: string;
  requiredChecks: string[];
  color: string;
  bg: string;
}

const LIFECYCLE_PHASES: Record<string, LifecyclePhase> = {
  'Development': {
    name: 'Development',
    description: 'Model is actively being developed and trained.',
    requiredChecks: ['Bias testing', 'Data governance review'],
    color: '#6366f1',
    bg: 'hsl(var(--s-in-bg))',
  },
  'Validation': {
    name: 'Validation',
    description: 'Model undergoing validation, fairness audit, and compliance review.',
    requiredChecks: ['Performance validation', 'Bias audit', 'Compliance mapping', 'Security scan'],
    color: '#f59e0b',
    bg: 'hsl(var(--s-wn-bg))',
  },
  'Staging': {
    name: 'Staging',
    description: 'Model deployed to staging environment for integration testing.',
    requiredChecks: ['Integration tests', 'Human oversight gate', 'Load testing'],
    color: '#f97316',
    bg: 'hsl(var(--s-wn-bg))',
  },
  'Production': {
    name: 'Production',
    description: 'Model serving live traffic with continuous monitoring.',
    requiredChecks: ['Drift monitoring active', 'Alerting configured', 'Rollback plan documented'],
    color: '#10b981',
    bg: 'hsl(var(--s-ok-bg))',
  },
  'Monitoring': {
    name: 'Monitoring',
    description: 'Model in enhanced monitoring phase post-production.',
    requiredChecks: ['Performance dashboards live', 'Bias monitoring cadence set'],
    color: '#06b6d4',
    bg: 'hsl(var(--s-in-bg))',
  },
  'Deprecated': {
    name: 'Deprecated',
    description: 'Model scheduled for retirement. Traffic winding down.',
    requiredChecks: ['Migration plan approved', 'Successor model deployed'],
    color: '#ef4444',
    bg: 'hsl(var(--s-er-bg))',
  },
};

const TRANSITIONS: Record<string, string[]> = {
  'Development': ['Validation'],
  'Validation': ['Staging', 'Development'],
  'Staging': ['Production', 'Validation'],
  'Production': ['Monitoring', 'Deprecated'],
  'Monitoring': ['Production', 'Deprecated'],
  'Deprecated': [],
};

const PHASE_ORDER = ['Development', 'Validation', 'Staging', 'Production', 'Monitoring', 'Deprecated'];

interface ModelLifecycleDrawerProps {
  model?: Model;
  modelId?: string;
  onClose: () => void;
  onSubmit?: (data: { modelId: string; fromPhase: string; toPhase: string; reason: string; reviewer: string; notes: string }) => void;
}

// ── component ──────────────────────────────────────────────────────────────

export default function ModelLifecycleDrawer({ model: propModel, modelId, onClose, onSubmit }: ModelLifecycleDrawerProps) {
  const model = propModel || MODELS.find(m => m.id === (modelId || 'MDL-001')) || MODELS[0];
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [form, setForm] = useState({ reason: '', reviewer: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!model) return null;

  const currentPhase = model.lifecyclePhase;
  const availableTransitions = TRANSITIONS[currentPhase] || [];
  const phaseInfo = LIFECYCLE_PHASES[currentPhase];

  function validate() {
    const errs: Record<string, string> = {};
    if (!selectedTransition) errs.transition = 'Select a target phase';
    if (!form.reason.trim()) errs.reason = 'Reason is required';
    if (!form.reviewer) errs.reviewer = 'Select a reviewer';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSubmitted(true);
    onSubmit?.({
      modelId: model.id,
      fromPhase: currentPhase,
      toPhase: selectedTransition!,
      ...form,
    });
  }

  const targetPhaseInfo = selectedTransition ? LIFECYCLE_PHASES[selectedTransition] : null;
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div style={{
        width: 520,
        background: 'hsl(var(--bg-surface))',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
        overflowY: 'auto',
        fontFamily: 'Outfit, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-surface))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ArrowCircleRight size={16} style={{ color: 'hsl(var(--brand))' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Lifecycle Transition</h2>
            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>{model.id} — {model.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} weight="fill" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 6 }}>Transition Submitted</p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.5 }}>
                {model.name} transition from <strong>{currentPhase}</strong> → <strong>{selectedTransition}</strong> submitted for review.
              </p>
            </div>
            <button onClick={onClose} style={{ padding: '8px 20px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Current phase */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 10 }}>
                Current Phase
              </p>
              <div style={{
                padding: '14px 16px',
                background: phaseInfo?.bg || 'hsl(var(--bg-muted))',
                border: `1px solid ${phaseInfo?.color || 'hsl(var(--border))'}40`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: phaseInfo?.color + '20', border: `1px solid ${phaseInfo?.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Robot size={18} style={{ color: phaseInfo?.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{currentPhase}</span>
                    <Badge style={{ background: phaseInfo?.bg, color: phaseInfo?.color, border: `1px solid ${phaseInfo?.color}40`, borderRadius: 0, fontSize: 10 }}>
                      CURRENT
                    </Badge>
                  </div>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{phaseInfo?.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{model.daysInPhase}d</div>
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>in phase</div>
                </div>
              </div>
            </div>

            {/* Lifecycle progress visualization */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 10 }}>
                Lifecycle Progress
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {PHASE_ORDER.map((phase, idx) => {
                  const isPast = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isFuture = idx > currentIdx;
                  const info = LIFECYCLE_PHASES[phase];
                  return (
                    <div key={phase} style={{ display: 'flex', alignItems: 'center', flex: idx < PHASE_ORDER.length - 1 ? 1 : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isCurrent ? info.color : isPast ? info.color + '60' : 'hsl(var(--bg-muted))',
                          border: `2px solid ${isCurrent ? info.color : isPast ? info.color + '40' : 'hsl(var(--border))'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isPast ? (
                            <CheckCircle size={14} style={{ color: '#fff' }} weight="fill" />
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? '#fff' : 'hsl(var(--text-4))' }}>
                              {idx + 1}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 9, color: isCurrent ? info.color : 'hsl(var(--text-4))', fontWeight: isCurrent ? 700 : 400, textAlign: 'center', width: 50 }}>
                          {phase}
                        </span>
                      </div>
                      {idx < PHASE_ORDER.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: isPast ? LIFECYCLE_PHASES[phase].color + '40' : 'hsl(var(--border))', marginBottom: 20, mx: 2 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available transitions */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 10 }}>
                Available Transitions {errors.transition && <span style={{ color: '#ef4444' }}>— required</span>}
              </p>

              {availableTransitions.length === 0 ? (
                <div style={{ padding: '16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Warning size={16} style={{ color: '#f97316' }} />
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>No further transitions available from <strong>{currentPhase}</strong>.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availableTransitions.map(target => {
                    const info = LIFECYCLE_PHASES[target];
                    const isSelected = selectedTransition === target;
                    return (
                      <button
                        key={target}
                        onClick={() => setSelectedTransition(target)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px',
                          background: isSelected ? info.bg : 'hsl(var(--bg-muted))',
                          border: `1px solid ${isSelected ? info.color + '60' : 'hsl(var(--border))'}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{target}</span>
                            {isSelected && <Badge style={{ background: info.color, color: '#fff', borderRadius: 0, fontSize: 9, border: 'none' }}>SELECTED</Badge>}
                          </div>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>{info.description}</p>
                        </div>
                        <ArrowRight size={14} style={{ color: info.color, flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Required checks for target */}
            {targetPhaseInfo && (
              <div style={{ padding: '12px 14px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 8 }}>Required for {selectedTransition}:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {targetPhaseInfo.requiredChecks.map((check, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {availableTransitions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Reason */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Transition Reason {errors.reason && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Describe why this transition is being requested…"
                    rows={2}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'hsl(var(--bg-raised))',
                      border: `1px solid ${errors.reason ? '#ef4444' : 'hsl(var(--border))'}`,
                      color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical',
                    }}
                  />
                  {errors.reason && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.reason}</p>}
                </div>

                {/* Reviewer */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Reviewer {errors.reviewer && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <select
                    value={form.reviewer}
                    onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'hsl(var(--bg-raised))',
                      border: `1px solid ${errors.reviewer ? '#ef4444' : 'hsl(var(--border))'}`,
                      color: 'hsl(var(--text-1))', fontSize: 13,
                    }}
                  >
                    <option value="">Select reviewer…</option>
                    {USERS.map(u => <option key={u.id} value={u.name}>{u.name} — {u.role}</option>)}
                  </select>
                  {errors.reviewer && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.reviewer}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Additional Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional context for the reviewer…"
                    rows={2}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!submitted && availableTransitions.length > 0 && (
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '12px 20px',
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--bg-sunken))',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button onClick={onClose} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px',
                background: 'hsl(var(--brand))', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              <ArrowCircleRight size={14} /> Submit Transition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
