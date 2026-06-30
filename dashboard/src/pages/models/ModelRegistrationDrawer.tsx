import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, Robot, CheckCircle, Warning, Plus, User,
} from '@phosphor-icons/react';
import { USERS } from '../../data/seed';
import { governanceBus } from '../../lib/governance/eventBus';


// ── types ──────────────────────────────────────────────────────────────────

interface ModelFormData {
  name: string;
  version: string;
  type: string;
  owner: string;
  department: string;
  description: string;
  riskTier: string;
  framework: string;
}

interface ModelRegistrationDrawerProps {
  onClose: () => void;
  onRegister?: (data: ModelFormData) => void;
}

// ── data ───────────────────────────────────────────────────────────────────

const MODEL_TYPES = [
  'ML — Classification',
  'ML — Regression',
  'ML — Anomaly Detection',
  'ML — NLP',
  'ML — Computer Vision',
  'LLM — Generative',
  'LLM — Embedding',
  'LLM — Summarization',
  'Rule-based System',
  'Hybrid AI System',
];

const DEPARTMENTS = [
  'Lending',
  'Fraud Prevention',
  'Compliance',
  'Customer Success',
  'Customer Service',
  'Finance',
  'Risk',
  'Marketing',
  'HR',
  'Legal',
  'Security',
  'AI/ML',
  'Data Engineering',
];

const RISK_TIERS = [
  { value: 'high', label: 'High Risk', description: 'EU AI Act Annex III — requires full documentation and oversight', color: 'hsl(var(--s-er-tx))' },
  { value: 'limited', label: 'Limited Risk', description: 'Transparency obligations apply (Art. 52)', color: 'hsl(var(--r-hi-tx))' },
  { value: 'minimal', label: 'Minimal Risk', description: 'No specific obligations beyond general law', color: 'hsl(var(--s-ok-tx))' },
  { value: 'unacceptable', label: 'Unacceptable Risk', description: 'Prohibited under EU AI Act — cannot be deployed', color: 'hsl(var(--s-er-tx))' },
];

const FRAMEWORKS = [
  'EU AI Act',
  'GDPR',
  'NIST AI RMF',
  'SOC 2',
  'ISO 27001',
  'ISO/IEC 42001',
  'EEOC',
  'BSA/AML',
  'OWASP LLM',
];

// ── component ──────────────────────────────────────────────────────────────

export default function ModelRegistrationDrawer({ onClose, onRegister }: ModelRegistrationDrawerProps) {
  const [form, setForm] = useState<ModelFormData>({
    name: '',
    version: '',
    type: '',
    owner: '',
    department: '',
    description: '',
    riskTier: '',
    framework: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  function update(key: keyof ModelFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.version.trim()) errs.version = 'Required';
    if (!form.type) errs.type = 'Required';
    if (!form.owner) errs.owner = 'Required';
    if (!form.department) errs.department = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (!form.riskTier) errs.riskTier = 'Required';
    if (!form.framework) errs.framework = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
  }

  async function handleRegister() {
    if (!validateStep2()) return;
    setRegistered(true);
    onRegister?.(form);

    // Emit MODEL_REGISTERED event — triggers the 12-agent governance cascade
    // (risk assessment, compliance mapping, fairness, explainability, etc.).
    // Non-blocking: UI proceeds regardless of cascade outcome.
    try {
      const payload: Record<string, unknown> = {
        resource_id: `model-${Date.now()}`,
        resource_type: 'ai_system',
        model: {
          name: form.name,
          version: form.version,
          type: form.type,
          owner: form.owner,
          department: form.department,
          description: form.description,
          risk_tier: form.riskTier,
          purpose: form.description,
          frameworks: [form.framework],
        },
      };
      await governanceBus.emit('MODEL_REGISTERED', 'ai-inventory', payload);
    } catch (err) {
      // Log but don't block UI — cascade failures are self-healing via DLQ.
      console.error('[ModelRegistration] Cascade emit failed', err);
    }
  }

  function fieldStyle(hasError?: boolean): React.CSSProperties {
    return {
      width: '100%',
      padding: '7px 10px',
      background: 'hsl(var(--bg-raised))',
      border: `1px solid ${hasError ? 'hsl(var(--s-er-tx))' : 'hsl(var(--border))'}`,
      color: 'hsl(var(--text-1))',
      fontSize: 13,
      outline: 'none',
    };
  }

  function labelStyle(): React.CSSProperties {
    return {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: 'hsl(var(--text-3))',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    };
  }

  const selectedRiskTier = RISK_TIERS.find(r => r.value === form.riskTier);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div style={{
        width: 520,
        background: 'hsl(var(--bg-surface))',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex', flexDirection: 'column',
        maxHeight: '100vh', overflowY: 'auto',
              }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-surface))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Robot size={16} style={{ color: 'hsl(var(--brand))' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Register New Model</h2>
            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>Add a model to the AI inventory</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {!registered && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 0 }}>
            {[
              { n: 1, label: 'Model Info' },
              { n: 2, label: 'Risk & Compliance' },
            ].map(({ n, label }, idx) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: idx < 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: step >= n ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                    border: `1px solid ${step >= n ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: step >= n ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-3))',
                    transition: 'all 0.2s',
                  }}>
                    {step > n ? <CheckCircle size={13} weight="fill" style={{ color: 'hsl(var(--bg-surface))' }} /> : n}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: step === n ? 600 : 400, color: step === n ? 'hsl(var(--text-1))' : 'hsl(var(--text-3))' }}>
                    {label}
                  </span>
                </div>
                {idx < 1 && <div style={{ flex: 1, height: 1, background: step > 1 ? 'hsl(var(--brand))' : 'hsl(var(--border))', margin: '0 12px' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Success state */}
        {registered ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} weight="fill" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 6 }}>Model Registered</p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.5 }}>
                <strong>{form.name} {form.version}</strong> has been added to the model inventory.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge style={{ background: selectedRiskTier?.color + '20', color: selectedRiskTier?.color, border: `1px solid ${selectedRiskTier?.color}40`, borderRadius: 0, fontSize: 11 }}>
                {selectedRiskTier?.label}
              </Badge>
              <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', border: '1px solid hsl(var(--s-in-br))', borderRadius: 0, fontSize: 11 }}>
                Development Phase
              </Badge>
            </div>
            <button onClick={onClose} style={{ padding: '8px 20px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {step === 1 && (
              <>
                {/* Model name */}
                <div>
                  <label style={labelStyle()}>Model Name {errors.name && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                  <input
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="e.g. Customer Churn Predictor v2"
                    style={fieldStyle(!!errors.name)}
                  />
                  {errors.name && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.name}</p>}
                </div>

                {/* Version */}
                <div>
                  <label style={labelStyle()}>Version {errors.version && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                  <input
                    value={form.version}
                    onChange={e => update('version', e.target.value)}
                    placeholder="e.g. v1.0.0, GPT-4o"
                    style={fieldStyle(!!errors.version)}
                  />
                  {errors.version && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.version}</p>}
                </div>

                {/* Type */}
                <div>
                  <label style={labelStyle()}>Model Type {errors.type && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                  <select value={form.type} onChange={e => update('type', e.target.value)} style={fieldStyle(!!errors.type)}>
                    <option value="">Select type…</option>
                    {MODEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.type && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.type}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Owner */}
                  <div>
                    <label style={labelStyle()}>Owner {errors.owner && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                    <select value={form.owner} onChange={e => update('owner', e.target.value)} style={fieldStyle(!!errors.owner)}>
                      <option value="">Select owner…</option>
                      {USERS.map(u => <option key={u.id} value={u.name}>{u.name} — {u.role}</option>)}
                    </select>
                    {errors.owner && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.owner}</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label style={labelStyle()}>Department {errors.department && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                    <select value={form.department} onChange={e => update('department', e.target.value)} style={fieldStyle(!!errors.department)}>
                      <option value="">Select dept…</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.department && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.department}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle()}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Brief description of the model's purpose and use case…"
                    rows={3}
                    style={{ ...fieldStyle(), resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Risk tier */}
                <div>
                  <label style={labelStyle()}>Risk Tier (EU AI Act) {errors.riskTier && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {RISK_TIERS.map(tier => (
                      <button
                        key={tier.value}
                        onClick={() => update('riskTier', tier.value)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '12px 14px',
                          background: form.riskTier === tier.value ? tier.color + '15' : 'hsl(var(--bg-muted))',
                          border: `1px solid ${form.riskTier === tier.value ? tier.color + '60' : 'hsl(var(--border))'}`,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: tier.color, flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{tier.label}</span>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>{tier.description}</p>
                        </div>
                        {form.riskTier === tier.value && (
                          <CheckCircle size={16} style={{ color: tier.color, marginLeft: 'auto', flexShrink: 0 }} weight="fill" />
                        )}
                      </button>
                    ))}
                  </div>
                  {errors.riskTier && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 4 }}>{errors.riskTier}</p>}
                </div>

                {/* Framework */}
                <div>
                  <label style={labelStyle()}>Primary Compliance Framework {errors.framework && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</label>
                  <select value={form.framework} onChange={e => update('framework', e.target.value)} style={fieldStyle(!!errors.framework)}>
                    <option value="">Select framework…</option>
                    {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {errors.framework && <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>{errors.framework}</p>}
                </div>

                {/* Summary review */}
                {(form.name || form.type) && (
                  <div style={{ padding: '14px 16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-3))', marginBottom: 8 }}>
                      Registration Summary
                    </p>
                    {[
                      { label: 'Name', value: form.name || '—' },
                      { label: 'Version', value: form.version || '—' },
                      { label: 'Type', value: form.type || '—' },
                      { label: 'Owner', value: form.owner || '—' },
                      { label: 'Department', value: form.department || '—' },
                    ].map((r, i, arr) => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                        <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{r.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-2))' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!registered && (
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '12px 20px',
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--bg-sunken))',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            {step === 2 ? (
              <button
                onClick={() => setStep(1)}
                style={{ padding: '7px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}
              >
                ← Back
              </button>
            ) : (
              <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleRegister}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                <Plus size={14} /> Register Model
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
