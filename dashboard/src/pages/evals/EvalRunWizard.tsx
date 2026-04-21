import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, CheckCircle, ArrowRight, Robot, Flask, Gear, Play,
  Lightning, Warning, ShieldCheck, Brain,
} from '@phosphor-icons/react';
import { MODELS } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── types & data ───────────────────────────────────────────────────────────

interface EvalTechnique {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  icon: React.ComponentType<any>;
  color: string;
}

const TECHNIQUES: EvalTechnique[] = [
  { id: 'bias_fairness', name: 'Bias & Fairness Audit', category: 'Compliance', description: 'Evaluate protected attribute disparate impact across gender, race, age, geography.', duration: '~30 min', icon: ShieldCheck, color: '#6366f1' },
  { id: 'hallucination', name: 'Hallucination Detection', category: 'Safety', description: 'Test LLM outputs for factual accuracy and citation validity against ground truth.', duration: '~45 min', icon: Warning, color: '#ef4444' },
  { id: 'toxicity', name: 'Toxicity & Content Filter', category: 'Safety', description: 'Screen model outputs for harmful, offensive, or policy-violating content.', duration: '~20 min', icon: Lightning, color: '#f97316' },
  { id: 'performance', name: 'Performance Benchmark', category: 'Quality', description: 'Measure accuracy, precision, recall, F1, AUC-ROC across validation datasets.', duration: '~15 min', icon: Brain, color: '#10b981' },
  { id: 'drift', name: 'Distribution Drift Analysis', category: 'Monitoring', description: 'Compare current input distributions to training baseline using PSI and KS tests.', duration: '~25 min', icon: ArrowRight, color: '#06b6d4' },
  { id: 'prompt_injection', name: 'Prompt Injection Testing', category: 'Security', description: 'Execute OWASP LLM Top 10 prompt injection attack vectors against LLM endpoints.', duration: '~60 min', icon: Robot, color: '#dc2626' },
];

interface WizardState {
  modelId: string;
  techniques: string[];
  parameters: {
    sampleSize: string;
    confidenceLevel: string;
    biasThreshold: string;
    reportFormat: string;
    notifyOnComplete: boolean;
    saveToVault: boolean;
  };
}

const STEP_LABELS = ['Select Model', 'Select Techniques', 'Configure', 'Review & Run'];

interface EvalRunWizardProps {
  onClose: () => void;
  onRun?: (config: WizardState) => void;
}

// ── component ──────────────────────────────────────────────────────────────

export default function EvalRunWizard({ onClose, onRun }: EvalRunWizardProps) {
  const [step, setStep] = useState(1);
  const [launched, setLaunched] = useState(false);
  const [state, setState] = useState<WizardState>({
    modelId: '',
    techniques: [],
    parameters: {
      sampleSize: '1000',
      confidenceLevel: '0.95',
      biasThreshold: '0.85',
      reportFormat: 'pdf',
      notifyOnComplete: true,
      saveToVault: true,
    },
  });

  const selectedModel = MODELS.find(m => m.id === state.modelId);
  const selectedTechniques = TECHNIQUES.filter(t => state.techniques.includes(t.id));

  function toggleTechnique(id: string) {
    setState(s => ({
      ...s,
      techniques: s.techniques.includes(id)
        ? s.techniques.filter(t => t !== id)
        : [...s.techniques, id],
    }));
  }

  function canNext(): boolean {
    if (step === 1) return !!state.modelId;
    if (step === 2) return state.techniques.length > 0;
    return true;
  }

  function handleLaunch() {
    setLaunched(true);
    onRun?.(state);
  }

  const estimatedDuration = selectedTechniques.reduce((sum, t) => {
    const mins = parseInt(t.duration.match(/\d+/)?.[0] || '0');
    return sum + mins;
  }, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(var(--bg-page)/70%)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Dialog */}
      <div style={{
        position: 'relative',
        width: 680,
        maxWidth: '95vw',
        maxHeight: '90vh',
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border))',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
              }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flask size={16} style={{ color: 'hsl(var(--brand))' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>New Evaluation Run</h2>
            {!launched && (
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>
                Step {step} of 4 — {STEP_LABELS[step - 1]}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {!launched && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEP_LABELS.map((label, idx) => {
              const n = idx + 1;
              const isPast = step > n;
              const isCurrent = step === n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: idx < 3 ? 1 : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: isPast ? '#10b981' : isCurrent ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                      border: `1px solid ${isPast ? '#10b981' : isCurrent ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: isPast || isCurrent ? '#fff' : 'hsl(var(--text-3))',
                    }}>
                      {isPast ? <CheckCircle size={13} weight="fill" /> : n}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'hsl(var(--text-1))' : 'hsl(var(--text-3))' }}>
                      {label}
                    </span>
                  </div>
                  {idx < 3 && <div style={{ flex: 1, height: 1, background: isPast ? '#10b981' : 'hsl(var(--border))', margin: '0 8px' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {/* ── Step 1: Select Model ─────────────────────────────────── */}
          {!launched && step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginBottom: 16 }}>
                Select the model you want to evaluate. High-risk models with open issues will be highlighted.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MODELS.map(model => {
                  const isSelected = state.modelId === model.id;
                  const hasIssues = model.riskTier === 'high' || model.driftStatus !== 'stable';
                  return (
                    <button
                      key={model.id}
                      onClick={() => setState(s => ({ ...s, modelId: model.id }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        background: isSelected ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-muted))',
                        border: `1px solid ${isSelected ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: model.status === 'production' ? '#10b981' : model.status === 'staging' ? '#f97316' : '#6366f1', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{model.name}</span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{model.id}</span>
                          {hasIssues && <Warning size={12} style={{ color: '#f97316', marginLeft: 4 }} />}
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'hsl(var(--text-3))' }}>
                          <span>{model.version}</span>
                          <span>·</span>
                          <span>{model.type.split(' — ')[0]}</span>
                          <span>·</span>
                          <span>{model.department}</span>
                          <span>·</span>
                          <span style={{ color: model.riskTier === 'high' ? '#ef4444' : model.riskTier === 'limited' ? '#f97316' : '#10b981' }}>
                            {model.riskTier} risk
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Badge style={{ background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 9 }}>
                          {model.status}
                        </Badge>
                        {isSelected && <CheckCircle size={16} style={{ color: 'hsl(var(--brand))' }} weight="fill" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Select Techniques ────────────────────────────── */}
          {!launched && step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginBottom: 16 }}>
                Select evaluation techniques to run. Multiple techniques can be combined into a single eval run.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TECHNIQUES.map(tech => {
                  const isSelected = state.techniques.includes(tech.id);
                  const TechIcon = tech.icon;
                  return (
                    <button
                      key={tech.id}
                      onClick={() => toggleTechnique(tech.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 14px',
                        background: isSelected ? tech.color + '10' : 'hsl(var(--bg-muted))',
                        border: `1px solid ${isSelected ? tech.color + '50' : 'hsl(var(--border))'}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: tech.color + '20', border: `1px solid ${tech.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TechIcon size={14} style={{ color: tech.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{tech.name}</span>
                          <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 8 }}>
                            {tech.category}
                          </Badge>
                        </div>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', lineHeight: 1.4, marginBottom: 4 }}>{tech.description}</p>
                        <span style={{ fontSize: 10, color: tech.color }}>Est. {tech.duration}</span>
                      </div>
                      {isSelected && <CheckCircle size={16} style={{ color: tech.color, flexShrink: 0 }} weight="fill" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Configure Parameters ────────────────────────── */}
          {!launched && step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))' }}>
                Configure evaluation parameters. Defaults are set to recommended values.
              </p>
              {[
                { label: 'Sample Size', key: 'sampleSize', type: 'number', placeholder: '1000', hint: 'Number of samples per evaluation technique' },
                { label: 'Confidence Level', key: 'confidenceLevel', type: 'number', placeholder: '0.95', hint: 'Statistical confidence (0.90–0.99)' },
                { label: 'Bias Threshold', key: 'biasThreshold', type: 'number', placeholder: '0.85', hint: 'Minimum fairness score (0–1)' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(state.parameters as any)[field.key]}
                    onChange={e => setState(s => ({ ...s, parameters: { ...s.parameters, [field.key]: e.target.value } }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}
                  />
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 3 }}>{field.hint}</p>
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report Format</label>
                <select value={state.parameters.reportFormat}
                  onChange={e => setState(s => ({ ...s, parameters: { ...s.parameters, reportFormat: e.target.value } }))}
                  style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                  <option value="pdf">PDF Report</option>
                  <option value="json">JSON (machine-readable)</option>
                  <option value="csv">CSV Summary</option>
                  <option value="html">HTML Dashboard</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'notifyOnComplete', label: 'Notify me when evaluation completes' },
                  { key: 'saveToVault', label: 'Save results to Evidence Vault' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(state.parameters as any)[opt.key]}
                      onChange={e => setState(s => ({ ...s, parameters: { ...s.parameters, [opt.key]: e.target.checked } }))}
                    />
                    <span style={{ fontSize: 13, color: 'hsl(var(--text-2))' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Run ─────────────────────────────────── */}
          {!launched && step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))' }}>
                Review your evaluation configuration before launching.
              </p>

              {/* Model summary */}
              <div style={{ padding: '14px 16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-3))', marginBottom: 8 }}>Target Model</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Robot size={14} style={{ color: 'hsl(var(--brand))' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{selectedModel?.name}</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{selectedModel?.version}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))', marginLeft: 'auto' }}>{selectedModel?.id}</span>
                </div>
              </div>

              {/* Techniques */}
              <div style={{ padding: '14px 16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-3))', marginBottom: 8 }}>
                  Techniques ({selectedTechniques.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedTechniques.map(t => (
                    <Badge key={t.id} style={{ background: t.color + '20', color: t.color, border: `1px solid ${t.color}40`, borderRadius: 0, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <t.icon size={10} /> {t.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div style={{ padding: '14px 16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-3))', marginBottom: 8 }}>Parameters</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'hsl(var(--text-2))' }}>
                  <span>Sample Size: <strong>{state.parameters.sampleSize}</strong></span>
                  <span>Confidence: <strong>{state.parameters.confidenceLevel}</strong></span>
                  <span>Bias Threshold: <strong>{state.parameters.biasThreshold}</strong></span>
                  <span>Report Format: <strong>{state.parameters.reportFormat.toUpperCase()}</strong></span>
                </div>
              </div>

              {/* Estimated duration */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))' }}>
                <Gear size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />
                <span style={{ fontSize: 12, color: 'hsl(var(--s-in-tx))' }}>
                  Estimated run time: <strong>~{estimatedDuration} minutes</strong> for {selectedTechniques.length} technique{selectedTechniques.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* ── Launched state ───────────────────────────────────────── */}
          {launched && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} weight="fill" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 6 }}>Evaluation Launched</p>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.5, maxWidth: 400 }}>
                  {selectedTechniques.length} evaluation technique{selectedTechniques.length > 1 ? 's' : ''} running on <strong>{selectedModel?.name}</strong>.
                  Estimated completion in ~{estimatedDuration} minutes.
                </p>
              </div>
              <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', border: '1px solid hsl(var(--s-in-br))', borderRadius: 0, fontSize: 11 }}>
                Running — results will appear in Eval Results Viewer
              </Badge>
              <button onClick={onClose} style={{ padding: '8px 20px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!launched && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-sunken))', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {step > 1 ? (
              <button onClick={() => setStep(s => (s - 1) as any)} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
                ← Back
              </button>
            ) : (
              <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => canNext() && setStep(s => (s + 1) as any)}
                disabled={!canNext()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 18px',
                  background: canNext() ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                  color: canNext() ? '#fff' : 'hsl(var(--text-4))',
                  border: 'none', cursor: canNext() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 500,
                }}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                <Play size={14} weight="fill" /> Launch Evaluation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
