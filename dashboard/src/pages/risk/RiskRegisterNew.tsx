import { useState, useMemo, useCallback } from 'react';
import {
  Eye, MagnifyingGlass, Funnel, Export, Plus, Warning,
  ShieldCheck, Clock, User, CaretRight, GridFour, Fire,
  ArrowUp, ArrowDown, ArrowRight, Check, X, Scales,
  TreeStructure, ListBullets, Target,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Types ────────────────────────────────────────────────────────────────────

type RiskCategory = 'AI Model' | 'Data' | 'Operational' | 'Compliance' | 'Security' | 'Third-Party';

type TreatmentStatus = 'Mitigated' | 'In Progress' | 'Accepted' | 'Planned' | 'Overdue';

interface RiskItem {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  score: number;
  owner: string;
  treatmentStatus: TreatmentStatus;
  frameworkMapping: string[];
  treatmentPlan: string;
  controls: string[];
  history: { date: string; action: string; user: string }[];
  createdDate: string;
  lastUpdated: string;
}

// ── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RISKS: RiskItem[] = [
  {
    id: 'RSK-001',
    title: 'Model bias propagation in credit scoring',
    description: 'Credit scoring AI model exhibits demographic bias that propagates through downstream lending decisions, causing disparate impact on protected classes and violating fair lending regulations.',
    category: 'AI Model',
    likelihood: 4,
    impact: 5,
    score: 20,
    owner: 'Sarah Chen',
    treatmentStatus: 'In Progress',
    frameworkMapping: ['NIST AI RMF 2.3', 'EU AI Act Art. 10', 'ISO 42001 A.8.4'],
    treatmentPlan: 'Deploy bias detection pipeline with monthly fairness audits. Implement counterfactual fairness constraints in model training. Establish disparate impact testing thresholds at 80% rule compliance.',
    controls: ['CTRL-006 Bias Monitoring', 'CTRL-002 Model Validation'],
    history: [
      { date: '2026-03-15', action: 'Risk identified during quarterly model audit', user: 'Sarah Chen' },
      { date: '2026-03-20', action: 'Escalated to Critical — impact assessment completed', user: 'James Liu' },
      { date: '2026-04-01', action: 'Treatment plan approved by Risk Committee', user: 'Maria Santos' },
    ],
    createdDate: '2026-03-15',
    lastUpdated: '2026-04-01',
  },
  {
    id: 'RSK-002',
    title: 'Training data poisoning via supply chain',
    description: 'Third-party training data sources may be compromised through supply chain attacks, introducing poisoned data that degrades model performance or creates backdoor vulnerabilities.',
    category: 'Security',
    likelihood: 3,
    impact: 5,
    score: 15,
    owner: 'David Park',
    treatmentStatus: 'In Progress',
    frameworkMapping: ['NIST AI RMF 2.6', 'OWASP ML Top 10 ML06', 'ISO 42001 A.7.2'],
    treatmentPlan: 'Implement data provenance tracking for all training datasets. Establish vendor data integrity verification protocol. Deploy anomaly detection on incoming training batches.',
    controls: ['CTRL-003 Data Integrity Checks', 'CTRL-012 Supply Chain Review'],
    history: [
      { date: '2026-02-10', action: 'Identified during supply chain risk assessment', user: 'David Park' },
      { date: '2026-02-28', action: 'Risk rating increased after OWASP ML threat briefing', user: 'David Park' },
      { date: '2026-03-15', action: 'Data provenance tool procurement initiated', user: 'Lisa Wang' },
    ],
    createdDate: '2026-02-10',
    lastUpdated: '2026-03-15',
  },
  {
    id: 'RSK-003',
    title: 'Hallucination liability in customer-facing bot',
    description: 'Customer service chatbot produces fabricated financial advice and product information, creating legal liability for Acme Financial and eroding customer trust.',
    category: 'AI Model',
    likelihood: 4,
    impact: 4,
    score: 16,
    owner: 'Rachel Torres',
    treatmentStatus: 'Planned',
    frameworkMapping: ['NIST AI RMF 3.1', 'EU AI Act Art. 52', 'FCA SMCR'],
    treatmentPlan: 'Integrate retrieval-augmented generation with verified knowledge base. Add confidence scoring with automatic escalation to human agents below threshold. Implement output guardrails for financial claims.',
    controls: ['CTRL-015 Output Validation'],
    history: [
      { date: '2026-01-22', action: 'Customer complaint triggered investigation', user: 'Rachel Torres' },
      { date: '2026-02-05', action: 'Legal review completed — liability exposure confirmed', user: 'Mark Stevens' },
      { date: '2026-03-10', action: 'RAG implementation added to product roadmap', user: 'Rachel Torres' },
    ],
    createdDate: '2026-01-22',
    lastUpdated: '2026-03-10',
  },
  {
    id: 'RSK-004',
    title: 'Vendor lock-in (OpenAI dependency)',
    description: 'Over-reliance on OpenAI GPT-4 APIs across 12 production systems creates single-vendor dependency risk. API pricing changes or service disruptions could critically impact operations.',
    category: 'Third-Party',
    likelihood: 3,
    impact: 4,
    score: 12,
    owner: 'James Liu',
    treatmentStatus: 'Accepted',
    frameworkMapping: ['ISO 27001 A.15.1', 'NIST CSF ID.SC', 'DORA Art. 28'],
    treatmentPlan: 'Develop model abstraction layer supporting multi-provider failover. Evaluate Anthropic Claude and open-source alternatives for critical workloads. Negotiate exit clause in renewed contract terms.',
    controls: ['CTRL-009 Vendor Risk Assessment'],
    history: [
      { date: '2026-01-05', action: 'Vendor concentration analysis flagged dependency', user: 'James Liu' },
      { date: '2026-02-12', action: 'Accepted with compensating controls — board approved', user: 'Maria Santos' },
    ],
    createdDate: '2026-01-05',
    lastUpdated: '2026-02-12',
  },
  {
    id: 'RSK-005',
    title: 'Regulatory non-compliance with EU AI Act',
    description: 'Credit scoring and fraud detection systems classified as high-risk under EU AI Act. Current documentation, transparency, and human oversight mechanisms do not meet Article 9-15 requirements.',
    category: 'Compliance',
    likelihood: 5,
    impact: 5,
    score: 25,
    owner: 'Maria Santos',
    treatmentStatus: 'In Progress',
    frameworkMapping: ['EU AI Act Art. 9-15', 'ISO 42001 A.5', 'NIST AI RMF Gov 1.1'],
    treatmentPlan: 'Complete conformity assessment for all high-risk AI systems by Q3 2026. Establish technical documentation repository per Annex IV. Deploy real-time human oversight dashboard for automated decision systems.',
    controls: ['CTRL-005 Regulatory Monitoring', 'CTRL-010 Conformity Assessment'],
    history: [
      { date: '2025-12-01', action: 'EU AI Act gap analysis initiated', user: 'Maria Santos' },
      { date: '2026-01-15', action: 'Gap analysis completed — 14 non-conformities identified', user: 'Maria Santos' },
      { date: '2026-02-20', action: 'Remediation roadmap approved by compliance board', user: 'Mark Stevens' },
      { date: '2026-03-30', action: '6 of 14 non-conformities resolved', user: 'Maria Santos' },
    ],
    createdDate: '2025-12-01',
    lastUpdated: '2026-03-30',
  },
  {
    id: 'RSK-006',
    title: 'Data breach via AI pipeline',
    description: 'ML training and inference pipelines process PII without adequate encryption in transit. Compromised pipeline credentials could expose customer financial data.',
    category: 'Security',
    likelihood: 3,
    impact: 5,
    score: 15,
    owner: 'David Park',
    treatmentStatus: 'Mitigated',
    frameworkMapping: ['ISO 27001 A.10', 'GDPR Art. 32', 'NIST CSF PR.DS'],
    treatmentPlan: 'Enforce TLS 1.3 on all pipeline communication channels. Implement column-level encryption for PII fields in feature stores. Deploy DLP scanning on model input/output logs.',
    controls: ['CTRL-007 Encryption Standards', 'CTRL-008 Access Control'],
    history: [
      { date: '2026-01-10', action: 'Penetration test identified unencrypted pipeline segment', user: 'David Park' },
      { date: '2026-02-01', action: 'TLS 1.3 enforcement deployed across all pipelines', user: 'Alex Kim' },
      { date: '2026-03-01', action: 'DLP scanning operational — risk downgraded to Mitigated', user: 'David Park' },
    ],
    createdDate: '2026-01-10',
    lastUpdated: '2026-03-01',
  },
  {
    id: 'RSK-007',
    title: 'Adversarial attack surface on fraud model',
    description: 'Real-time fraud detection model is vulnerable to adversarial perturbation attacks that could allow fraudulent transactions to bypass detection thresholds.',
    category: 'Security',
    likelihood: 3,
    impact: 4,
    score: 12,
    owner: 'Alex Kim',
    treatmentStatus: 'In Progress',
    frameworkMapping: ['OWASP ML Top 10 ML01', 'NIST AI RMF 2.7', 'MITRE ATLAS TA0043'],
    treatmentPlan: 'Deploy adversarial training with PGD augmentation. Implement input validation and anomaly detection at inference boundary. Conduct quarterly red-team exercises on fraud detection pipeline.',
    controls: ['CTRL-003 Data Integrity Checks', 'CTRL-014 Red Team Testing'],
    history: [
      { date: '2026-02-15', action: 'Red team exercise identified evasion vectors', user: 'Alex Kim' },
      { date: '2026-03-01', action: 'Adversarial training dataset generation started', user: 'Alex Kim' },
      { date: '2026-03-25', action: 'Input validation layer deployed to staging', user: 'David Park' },
    ],
    createdDate: '2026-02-15',
    lastUpdated: '2026-03-25',
  },
  {
    id: 'RSK-008',
    title: 'Shadow AI usage by business units',
    description: 'Business units deploying unapproved AI tools (ChatGPT, Midjourney, Copilot) for customer communications, risk analysis, and code generation without governance oversight.',
    category: 'Operational',
    likelihood: 5,
    impact: 3,
    score: 15,
    owner: 'Lisa Wang',
    treatmentStatus: 'Overdue',
    frameworkMapping: ['ISO 42001 A.4.2', 'NIST AI RMF Gov 1.3', 'Internal Policy AUP-AI-001'],
    treatmentPlan: 'Deploy AI asset discovery tool across all business units. Publish and enforce acceptable AI use policy. Establish centralized AI request portal with 48-hour approval SLA.',
    controls: ['CTRL-006 Bias Monitoring', 'CTRL-015 Output Validation'],
    history: [
      { date: '2026-01-05', action: 'Internal audit discovered 23 unapproved AI tools in use', user: 'Lisa Wang' },
      { date: '2026-01-20', action: 'Draft AI acceptable use policy circulated for review', user: 'Lisa Wang' },
      { date: '2026-02-15', action: 'Policy approval delayed — treatment now overdue', user: 'Maria Santos' },
    ],
    createdDate: '2026-01-05',
    lastUpdated: '2026-02-15',
  },
  {
    id: 'RSK-009',
    title: 'Consent management gap in training data',
    description: 'Customer data used for model training lacks granular consent records. Existing consent mechanisms do not distinguish between service delivery and AI training purposes.',
    category: 'Data',
    likelihood: 4,
    impact: 4,
    score: 16,
    owner: 'Rachel Torres',
    treatmentStatus: 'Planned',
    frameworkMapping: ['GDPR Art. 6-7', 'EU AI Act Art. 10.5', 'ISO 42001 A.8.2'],
    treatmentPlan: 'Implement purpose-specific consent collection for AI training data. Retrofit consent records for existing training datasets. Deploy consent verification checkpoint in data ingestion pipeline.',
    controls: ['CTRL-005 Regulatory Monitoring'],
    history: [
      { date: '2026-02-01', action: 'DPO flagged consent gap during DPIA review', user: 'Rachel Torres' },
      { date: '2026-03-05', action: 'Consent management vendor evaluation completed', user: 'Rachel Torres' },
    ],
    createdDate: '2026-02-01',
    lastUpdated: '2026-03-05',
  },
  {
    id: 'RSK-010',
    title: 'Cross-border data transfer for model training',
    description: 'Model training infrastructure spans US and EU regions. Training data containing EU citizen PII is transferred to US-based GPU clusters without adequate transfer mechanism (post-Schrems II).',
    category: 'Compliance',
    likelihood: 4,
    impact: 5,
    score: 20,
    owner: 'Mark Stevens',
    treatmentStatus: 'Overdue',
    frameworkMapping: ['GDPR Art. 44-49', 'EU AI Act Art. 10.5', 'EDPB Guidelines 05/2020'],
    treatmentPlan: 'Implement EU-region-only training pipeline for EU citizen data. Execute Standard Contractual Clauses with cloud provider. Deploy data residency tagging and automated transfer impact assessments.',
    controls: ['CTRL-009 Vendor Risk Assessment'],
    history: [
      { date: '2025-11-10', action: 'Data residency audit identified cross-border transfers', user: 'Mark Stevens' },
      { date: '2025-12-20', action: 'SCC negotiation with AWS initiated', user: 'Mark Stevens' },
      { date: '2026-02-01', action: 'SCC execution delayed — treatment marked overdue', user: 'Maria Santos' },
      { date: '2026-03-15', action: 'EU-region GPU cluster procurement approved', user: 'James Liu' },
    ],
    createdDate: '2025-11-10',
    lastUpdated: '2026-03-15',
  },
];

// ── Score Color Helper ───────────────────────────────────────────────────────

function scoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 20) return { bg: 'hsl(0 72% 51% / 0.2)', text: 'hsl(var(--destructive))', label: 'Critical' };
  if (score >= 12) return { bg: 'hsl(25 95% 53% / 0.2)', text: 'hsl(var(--s-wn-tx))', label: 'High' };
  if (score >= 6) return { bg: 'hsl(45 93% 47% / 0.15)', text: 'hsl(var(--s-wn-tx))', label: 'Medium' };
  return { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(var(--s-ok-tx))', label: 'Low' };
}

function treatmentColor(status: TreatmentStatus): { bg: string; text: string } {
  switch (status) {
    case 'Mitigated': return { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(var(--s-ok-tx))' };
    case 'In Progress': return { bg: 'hsl(217 91% 60% / 0.15)', text: 'hsl(var(--s-in-tx))' };
    case 'Accepted': return { bg: 'hsl(45 93% 47% / 0.15)', text: 'hsl(var(--s-wn-tx))' };
    case 'Planned': return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
    case 'Overdue': return { bg: 'hsl(0 72% 51% / 0.15)', text: 'hsl(var(--destructive))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  }
}

function categoryColor(cat: RiskCategory): { bg: string; text: string } {
  switch (cat) {
    case 'AI Model': return { bg: 'hsl(271 81% 56% / 0.15)', text: 'hsl(271 81% 66%)' };
    case 'Data': return { bg: 'hsl(217 91% 60% / 0.15)', text: 'hsl(var(--s-in-tx))' };
    case 'Operational': return { bg: 'hsl(45 93% 47% / 0.15)', text: 'hsl(var(--s-wn-tx))' };
    case 'Compliance': return { bg: 'hsl(0 72% 51% / 0.15)', text: 'hsl(var(--destructive))' };
    case 'Security': return { bg: 'hsl(25 95% 53% / 0.15)', text: 'hsl(25 95% 63%)' };
    case 'Third-Party': return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  }
}

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(0 72% 51% / 0.08)', text: 'hsl(var(--destructive))', border: 'hsl(0 72% 51% / 0.3)' },
    warn: { bg: 'hsl(45 93% 47% / 0.08)', text: 'hsl(var(--s-wn-tx))', border: 'hsl(45 93% 47% / 0.3)' },
    ok: { bg: 'hsl(142 71% 45% / 0.08)', text: 'hsl(var(--s-ok-tx))', border: 'hsl(142 71% 45% / 0.3)' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── 5x5 Heat Map ─────────────────────────────────────────────────────────────

function HeatMap({ risks, onCellClick }: { risks: RiskItem[]; onCellClick: (r: RiskItem) => void }) {
  const matrix: Record<string, RiskItem[]> = {};
  risks.forEach(r => {
    const key = `${r.likelihood}-${r.impact}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(r);
  });

  const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <GridFour size={16} style={{ color: 'hsl(var(--text-4))' }} />
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Heat Map (Likelihood x Impact)</span>
        </div>
        <div className="flex items-end gap-2">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center mr-1" style={{ minHeight: 280 }}>
            <span className="text-[10px] font-medium" style={{
              color: 'hsl(var(--text-4))',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}>Likelihood</span>
          </div>
          {/* Y-axis values */}
          <div className="flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map(l => (
              <div key={l} className="flex items-center justify-end" style={{ height: 52, width: 80 }}>
                <span className="text-[10px] mr-2" style={{ color: 'hsl(var(--text-4))' }}>{l} — {likelihoodLabels[l - 1]}</span>
              </div>
            ))}
          </div>
          {/* Grid */}
          <div>
            <div className="grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map(l =>
                [1, 2, 3, 4, 5].map(i => {
                  const s = l * i;
                  const sc = scoreColor(s);
                  const cellRisks = matrix[`${l}-${i}`] || [];
                  return (
                    <div
                      key={`${l}-${i}`}
                      className="flex flex-col items-center justify-center gap-0.5"
                      style={{
                        width: 80,
                        height: 52,
                        background: sc.bg,
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 0,
                        cursor: cellRisks.length > 0 ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (cellRisks.length === 1) onCellClick(cellRisks[0]);
                      }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: sc.text }}>{s}</span>
                      {cellRisks.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {cellRisks.slice(0, 3).map(r => (
                            <span
                              key={r.id}
                              className="text-[8px] font-mono px-1"
                              style={{
                                background: sc.text,
                                color: '#fff',
                                borderRadius: 0,
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); onCellClick(r); }}
                            >
                              {r.id}
                            </span>
                          ))}
                          {cellRisks.length > 3 && (
                            <span className="text-[8px] font-mono" style={{ color: sc.text }}>+{cellRisks.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {/* X-axis labels */}
            <div className="grid grid-cols-5 gap-1 mt-1">
              {impactLabels.map((label, idx) => (
                <div key={idx} className="text-center" style={{ width: 80 }}>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{idx + 1} — {label}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-1">
              <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>Impact</span>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>Legend:</span>
          {[
            { label: 'Critical (>=20)', color: 'hsl(var(--destructive))' },
            { label: 'High (12-19)', color: 'hsl(var(--s-wn-tx))' },
            { label: 'Medium (6-11)', color: 'hsl(var(--s-wn-tx))' },
            { label: 'Low (<6)', color: 'hsl(var(--s-ok-tx))' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div style={{ width: 10, height: 10, background: l.color, borderRadius: 0, opacity: 0.3 }} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mini Matrix for Detail Drawer ────────────────────────────────────────────

function MiniMatrix({ likelihood, impact }: { likelihood: number; impact: number }) {
  const cells = [];
  for (let row = 5; row >= 1; row--) {
    for (let col = 1; col <= 5; col++) {
      const s = row * col;
      const sc = scoreColor(s);
      const isActive = row === likelihood && col === impact;
      cells.push(
        <div
          key={`${row}-${col}`}
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            background: sc.bg,
            border: isActive ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
            borderRadius: 0,
          }}
        >
          {isActive && (
            <div style={{ width: 10, height: 10, background: 'hsl(var(--brand))', borderRadius: '50%' }} />
          )}
        </div>
      );
    }
  }
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Impact &#8594;</span>
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col items-center justify-center mr-1">
          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Likelihood &#8594;
          </span>
        </div>
        <div className="grid grid-cols-5 gap-0.5">{cells}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function RiskRegisterNew() {
  const { orgName } = useSettingsStore();
  const [risks] = useState<RiskItem[]>(SEED_RISKS);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const categories: RiskCategory[] = ['AI Model', 'Data', 'Operational', 'Compliance', 'Security', 'Third-Party'];

  const filtered = useMemo(() => {
    return risks.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      return true;
    });
  }, [risks, search, filterCategory]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalRisks = risks.length;
  const criticalHighCount = risks.filter(r => r.score >= 12).length;
  const mitigatedCount = risks.filter(r => r.treatmentStatus === 'Mitigated').length;
  const overdueCount = risks.filter(r => r.treatmentStatus === 'Overdue').length;

  // ── Detail Drawer ──────────────────────────────────────────────────────────
  const openDetail = (risk: RiskItem) => {
    setSelectedRisk(risk);
    setDetailTab('overview');
    setSheetOpen(true);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Risk ID', 'Title', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Owner', 'Treatment Status', 'Framework Mapping', 'Created', 'Last Updated'];
    const rows = filtered.map(r => [
      r.id, `"${r.title}"`, r.category, r.likelihood, r.impact, r.score,
      r.owner, r.treatmentStatus, `"${r.frameworkMapping.join('; ')}"`, r.createdDate, r.lastUpdated,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `risk-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('Risk register exported as CSV');
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto flex items-center gap-2" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>
            {t.type === 'success' && <Check size={14} weight="bold" />}
            {t.type === 'error' && <X size={14} weight="bold" />}
            {t.type === 'info' && <Eye size={14} weight="bold" />}
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Risk Register</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} — Enterprise AI risk inventory and treatment tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            style={{ borderRadius: 0 }}
            onClick={exportCSV}
          >
            <Export size={14} className="mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Risks" value={totalRisks} variant="default" />
        <MetricTile label="Critical / High" value={criticalHighCount} variant="error" />
        <MetricTile label="Mitigated" value={mitigatedCount} variant="ok" />
        <MetricTile label="Overdue Treatments" value={overdueCount} variant="warn" />
      </div>

      {/* Heat Map */}
      <HeatMap risks={risks} onCellClick={openDetail} />

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search risks by ID or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]" style={{ borderRadius: 0 }}>
            <Funnel size={14} className="mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {risks.length} risks
        </div>
      </div>

      {/* Risk Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Risk ID', 'Title', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Owner', 'Treatment Status', 'Framework Mapping', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Warning size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No risks match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const sc = scoreColor(r.score);
                  const tc = treatmentColor(r.treatmentStatus);
                  const cc = categoryColor(r.category);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[hsl(var(--bg-muted))] transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      onClick={() => openDetail(r)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--brand))' }}>{r.id}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{r.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: cc.bg, color: cc.text, borderRadius: 0, fontSize: 10 }}>
                          {r.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{r.likelihood}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{r.impact}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                          {r.score} — {sc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.owner}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: tc.bg, color: tc.text, borderRadius: 0, fontSize: 10 }}>
                          {r.treatmentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {r.frameworkMapping.slice(0, 2).map((fw, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5" style={{
                              background: 'hsl(var(--bg-muted))',
                              color: 'hsl(var(--text-4))',
                              borderRadius: 0,
                              border: '1px solid hsl(var(--border))',
                            }}>
                              {fw}
                            </span>
                          ))}
                          {r.frameworkMapping.length > 2 && (
                            <span className="text-[10px] px-1" style={{ color: 'hsl(var(--text-4))' }}>
                              +{r.frameworkMapping.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          style={{ borderRadius: 0 }}
                          onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                        >
                          <Eye size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedRisk && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{selectedRisk.id}</span>
                  <Badge style={{ background: scoreColor(selectedRisk.score).bg, color: scoreColor(selectedRisk.score).text, borderRadius: 0, fontSize: 10, fontWeight: 700 }}>
                    Score: {selectedRisk.score}
                  </Badge>
                  <Badge style={{ background: treatmentColor(selectedRisk.treatmentStatus).bg, color: treatmentColor(selectedRisk.treatmentStatus).text, borderRadius: 0, fontSize: 10 }}>
                    {selectedRisk.treatmentStatus}
                  </Badge>
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>
                  {selectedRisk.title}
                </SheetTitle>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="w-full justify-start gap-0" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  {['overview', 'assessment', 'treatment', 'controls', 'history'].map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-xs capitalize"
                      style={{ borderRadius: 0 }}
                    >
                      {tab === 'assessment' ? 'Risk Assessment' : tab === 'treatment' ? 'Treatment Plan' : tab === 'controls' ? 'Controls Linked' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{selectedRisk.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Category</p>
                      <Badge style={{ background: categoryColor(selectedRisk.category).bg, color: categoryColor(selectedRisk.category).text, borderRadius: 0, fontSize: 10 }}>
                        {selectedRisk.category}
                      </Badge>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                      <div className="flex items-center gap-1">
                        <User size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Created</p>
                      <div className="flex items-center gap-1">
                        <Clock size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.createdDate}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Last Updated</p>
                      <div className="flex items-center gap-1">
                        <Clock size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Framework Mapping</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedRisk.frameworkMapping.map((fw, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-1" style={{
                          background: 'hsl(var(--bg-muted))',
                          color: 'hsl(var(--text-3))',
                          borderRadius: 0,
                          border: '1px solid hsl(var(--border))',
                        }}>
                          <Scales size={10} className="inline mr-1" />{fw}
                        </span>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Risk Assessment Tab */}
                <TabsContent value="assessment" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Likelihood</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.likelihood}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>of 5</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <X size={20} style={{ color: 'hsl(var(--text-4))' }} />
                    </div>
                    <div className="p-4 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Impact</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.impact}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>of 5</p>
                    </div>
                  </div>
                  <div className="p-4 text-center" style={{
                    background: scoreColor(selectedRisk.score).bg,
                    border: `2px solid ${scoreColor(selectedRisk.score).text}`,
                    borderRadius: 0,
                  }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Inherent Risk Score</p>
                    <p className="text-4xl font-bold" style={{ color: scoreColor(selectedRisk.score).text }}>
                      {selectedRisk.score}
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: scoreColor(selectedRisk.score).text }}>
                      {scoreColor(selectedRisk.score).label} Risk
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      {selectedRisk.likelihood} (Likelihood) x {selectedRisk.impact} (Impact) = {selectedRisk.score}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-4))' }}>Position on Risk Matrix</p>
                    <MiniMatrix likelihood={selectedRisk.likelihood} impact={selectedRisk.impact} />
                  </div>
                </TabsContent>

                {/* Treatment Plan Tab */}
                <TabsContent value="treatment" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Treatment Strategy</span>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge style={{ background: treatmentColor(selectedRisk.treatmentStatus).bg, color: treatmentColor(selectedRisk.treatmentStatus).text, borderRadius: 0, fontSize: 10 }}>
                        {selectedRisk.treatmentStatus}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
                      {selectedRisk.treatmentPlan}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Risk Owner</p>
                      <div className="flex items-center gap-1">
                        <User size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Inherent Score</p>
                      <Badge style={{ background: scoreColor(selectedRisk.score).bg, color: scoreColor(selectedRisk.score).text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                        {selectedRisk.score} — {scoreColor(selectedRisk.score).label}
                      </Badge>
                    </div>
                  </div>
                  {selectedRisk.treatmentStatus === 'Overdue' && (
                    <div className="p-3 flex items-center gap-2" style={{
                      background: 'hsl(0 72% 51% / 0.08)',
                      border: '1px solid hsl(0 72% 51% / 0.3)',
                      borderRadius: 0,
                    }}>
                      <Warning size={16} style={{ color: 'hsl(var(--destructive))' }} />
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--destructive))' }}>
                        Treatment is overdue. Escalation required.
                      </span>
                    </div>
                  )}
                </TabsContent>

                {/* Controls Linked Tab */}
                <TabsContent value="controls" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Controls</span>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                      {selectedRisk.controls.length}
                    </span>
                  </div>
                  {selectedRisk.controls.length === 0 ? (
                    <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <ShieldCheck size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No controls linked to this risk</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRisk.controls.map((ctrl, idx) => {
                        const parts = ctrl.split(' ');
                        const ctrlId = parts[0];
                        const ctrlName = parts.slice(1).join(' ');
                        return (
                          <div key={idx} className="p-3 flex items-center justify-between" style={{
                            background: 'hsl(var(--bg-muted))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 0,
                          }}>
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{ctrlId}</span>
                              <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ctrlName}</span>
                            </div>
                            <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      Controls are mapped to this risk to provide mitigation assurance and reduce residual risk exposure.
                    </p>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk History</span>
                  </div>
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: 'hsl(var(--border))' }} />
                    <div className="space-y-4">
                      {selectedRisk.history.map((entry, idx) => (
                        <div key={idx} className="relative flex gap-3">
                          <div className="absolute -left-[9px] top-1 w-3 h-3" style={{
                            background: idx === 0 ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                            borderRadius: '50%',
                            border: '2px solid hsl(var(--bg-surface))',
                          }} />
                          <div className="ml-3">
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{entry.date}</span>
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>by {entry.user}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
