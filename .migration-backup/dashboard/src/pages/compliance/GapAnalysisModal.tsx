import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, Warning, CalendarBlank, User, ShieldCheck, ArrowRight,
  CheckCircle, TrendUp, ClipboardText, Plus,
} from '@phosphor-icons/react';
import { GAPS, severityColor, formatDate } from '../../data/seed';
import type { Gap, Severity } from '../../data/seed';

// ── helpers ────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = severityColor(severity);
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 10, fontWeight: 600 }}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ background: 'hsl(var(--bg-muted))', height: 8, position: 'relative' }}>
      <div style={{
        width: `${Math.min(100, value)}%`,
        height: '100%',
        background: color,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function progressColor(progress: number): string {
  if (progress < 25) return '#ef4444';
  if (progress < 60) return '#f97316';
  if (progress < 85) return '#f59e0b';
  return '#10b981';
}

interface GapAnalysisModalProps {
  gap?: Gap;
  gapId?: string;
  onClose: () => void;
  onCreateTask?: (gap: Gap) => void;
}

// Default remediation steps per gap
const REMEDIATION_MAP: Record<string, string[]> = {
  'GAP-001': [
    'Conduct LLM-specific threat modeling session with AI/ML team',
    'Update FMEA templates to include generative AI failure modes',
    'Define risk acceptance criteria for LLM deployment scenarios',
    'Obtain sign-off from Risk Committee before next LLM deployment',
  ],
  'GAP-002': [
    'Audit all high-risk models (MDL-001, MDL-004) against Art. 13 checklist',
    'Create structured model cards using EU AI Act technical documentation template',
    'Document data governance, testing methodology, and human oversight procedures',
    'Submit documentation package to compliance officer for review',
  ],
  'GAP-003': [
    'Implement SHAP-based explanation layer on Credit Risk Scorer API',
    'Create plain-language explanation template for adverse action notices',
    'Test explainability output for completeness and understandability',
    'Update consumer-facing documentation with explanation rights',
  ],
  'GAP-004': [
    'Conduct data representativeness audit on DS-001 and DS-007',
    'Implement statistical bias monitoring in data preprocessing pipeline',
    'Document data collection methodology and representativeness assessment',
    'Establish quarterly data governance review cadence',
  ],
  'GAP-005': [
    'Engage legal team to renegotiate OpenAI DPA with EU-specific clauses',
    'Review and update Pinecone and Anthropic DPAs for AI processing provisions',
    'Implement data residency controls for EU citizen data',
    'Establish DPA renewal monitoring with 90-day advance notification',
  ],
  'GAP-006': [
    'Map existing incident response procedures to AI-specific scenarios',
    'Develop playbooks for: bias incident, LLM hallucination, shadow AI, data poisoning',
    'Conduct tabletop exercise simulating AI bias incident',
    'Train incident response team on AI-specific remediation procedures',
  ],
  'GAP-007': [
    'Define formal prompt injection testing methodology (OWASP LLM Top 10)',
    'Create test case library covering LLM01–LLM10 attack categories',
    'Schedule quarterly red team exercises for LLM-based systems',
    'Integrate automated prompt injection scanning into CI/CD pipeline',
  ],
  'GAP-008': [
    'Map all high-risk AI use cases requiring human oversight',
    'Design HITL gate workflow for AML and fraud detection edge cases',
    'Implement escalation path for automated decisions exceeding risk threshold',
    'Document human oversight procedures in operational runbooks',
  ],
  'GAP-009': [
    'Define model lifecycle states and transition criteria in model registry',
    'Implement automated lifecycle state tracking with audit logging',
    'Create lifecycle dashboard view for model inventory',
    'Establish governance checkpoints for each lifecycle phase',
  ],
  'GAP-010': [
    'Deploy network traffic monitoring with AI API fingerprinting',
    'Implement automated alert on unregistered AI endpoint calls',
    'Create shadow AI discovery workflow and escalation process',
    'Establish weekly shadow AI detection scan schedule',
  ],
};

// ── component ──────────────────────────────────────────────────────────────

export default function GapAnalysisModal({ gap: propGap, gapId, onClose, onCreateTask }: GapAnalysisModalProps) {
  const [taskCreated, setTaskCreated] = useState(false);

  // Resolve gap
  const gap = propGap || GAPS.find(g => g.id === (gapId || 'GAP-001')) || GAPS[0];
  if (!gap) return null;

  const remediationSteps = REMEDIATION_MAP[gap.id] || [
    'Review current state against control requirement',
    'Identify root cause of gap',
    'Develop remediation plan with owner and timeline',
    'Implement controls and gather evidence',
  ];

  const color = progressColor(gap.progress);

  function handleCreateTask() {
    setTaskCreated(true);
    onCreateTask?.(gap);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'hsl(var(--bg-page)/70%)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: 640,
        maxWidth: '95vw',
        maxHeight: '90vh',
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border))',
        boxShadow: 'var(--shadow-lg)',
        overflowY: 'auto',
              }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          position: 'sticky',
          top: 0,
          background: 'hsl(var(--bg-surface))',
          zIndex: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{gap.id}</span>
              <SeverityBadge severity={gap.severity} />
              <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>
                {gap.framework}
              </Badge>
              <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10, fontFamily: 'monospace' }}>
                {gap.controlRef}
              </Badge>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0, lineHeight: 1.4 }}>
              {gap.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Full description */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 8 }}>
              Gap Description
            </p>
            <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.65 }}>
              {gap.description}
            </p>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))' }}>
                Remediation Progress
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>
                {gap.progress}%
              </span>
            </div>
            <ProgressBar value={gap.progress} color={color} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'hsl(var(--text-4))' }}>
              <span style={{ color: '#ef4444' }}>Critical (&lt;25%)</span>
              <span style={{ color: '#f97316' }}>Partial (25–60%)</span>
              <span style={{ color: '#f59e0b' }}>Progressing (60–85%)</span>
              <span style={{ color: '#10b981' }}>Near-complete (&gt;85%)</span>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Framework', value: gap.framework, icon: ShieldCheck, color: '#06b6d4' },
              { label: 'Control Reference', value: gap.controlRef, icon: ClipboardText, color: '#6366f1', mono: true },
              { label: 'Severity', value: gap.severity, icon: Warning, color: severityColor(gap.severity).text },
              { label: 'Owner', value: gap.owner, icon: User, color: '#f97316' },
              { label: 'Due Date', value: formatDate(gap.dueDate), icon: CalendarBlank, color: 'hsl(var(--text-3))' },
              { label: 'Gap ID', value: gap.id, icon: TrendUp, color: 'hsl(var(--text-3))', mono: true },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 14px',
                background: 'hsl(var(--bg-muted))',
                border: '1px solid hsl(var(--border))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <item.icon size={12} style={{ color: item.color }} />
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-3))', fontWeight: 600 }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', fontFamily: (item as any).mono ? 'monospace' : undefined }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Remediation steps */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 12 }}>
              Remediation Steps
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {remediationSteps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'hsl(var(--bg-muted))',
                  border: '1px solid hsl(var(--border))',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: gap.progress >= ((i + 1) / remediationSteps.length) * 100 ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-surface))',
                    border: `1px solid ${gap.progress >= ((i + 1) / remediationSteps.length) * 100 ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                    fontSize: 9, fontWeight: 700,
                    color: gap.progress >= ((i + 1) / remediationSteps.length) * 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                  }}>
                    {gap.progress >= ((i + 1) / remediationSteps.length) * 100 ? <CheckCircle size={12} weight="fill" /> : String(i + 1)}
                  </div>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'sticky', bottom: 0,
          padding: '12px 20px',
          borderTop: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-sunken))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {taskCreated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Task created successfully</span>
            </div>
          ) : (
            <button
              onClick={handleCreateTask}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px',
                background: 'hsl(var(--brand))',
                color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
              }}
            >
              <Plus size={14} /> Create Task
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ padding: '7px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
