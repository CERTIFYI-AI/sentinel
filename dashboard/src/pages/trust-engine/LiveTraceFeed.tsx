import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Archive, Clock, Robot, Funnel, MagnifyingGlass,
  Export, Warning, ArrowRight, Lightning, Eye,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TraceEntry {
  id: string; timestamp: string; agent: string; model: string;
  input: string; output: string; latencyMs: number;
  status: 'success' | 'fallback' | 'blocked' | 'error';
  fallbackAction?: string; tokensIn: number; tokensOut: number;
  chainId?: string; archived?: boolean;
  guardrailDecision?: { rule: string; score: number; decision: 'pass' | 'block' };
  policyEvaluated?: string;
}

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Initial Trace Dataset (27 entries) ────────────────────────────────────────

const INITIAL_TRACES: TraceEntry[] = [
  { id: 'TR-001', timestamp: '2026-04-05T14:23:01.234Z', agent: 'ComplianceBot', model: 'GPT-4o', input: 'Summarize compliance status for Q1 2026 across all EU AI Act controls.', output: 'Q1 compliance score is 87%. 3 open critical findings: GAP-001 (EU AI Act Art.9), GAP-002 (Art.13), GAP-005 (GDPR Art.28)...', latencyMs: 312, status: 'success', tokensIn: 142, tokensOut: 284, chainId: 'CH-001', guardrailDecision: { rule: 'PII Detection', score: 0.98, decision: 'pass' }, policyEvaluated: 'TP-001' },
  { id: 'TR-002', timestamp: '2026-04-05T14:22:58.891Z', agent: 'LoanAssistant', model: 'GPT-4o', input: 'Evaluate loan application LA-4892 for applicant with SSN 123-45-6789.', output: '[BLOCKED — PII guardrail triggered — SSN detected in input prompt]', latencyMs: 8, status: 'blocked', fallbackAction: 'PII Redaction triggered', tokensIn: 0, tokensOut: 0, chainId: 'CH-002', guardrailDecision: { rule: 'PII Detection', score: 0.99, decision: 'block' }, policyEvaluated: 'TP-001' },
  { id: 'TR-003', timestamp: '2026-04-05T14:22:55.100Z', agent: 'SupportBot', model: 'Claude-3-Sonnet', input: 'Why was my payment declined on March 30th? My account is 4532-XXXX.', output: 'Your payment may have been declined due to insufficient funds or a security hold. Please contact your branch for details.', latencyMs: 445, status: 'success', tokensIn: 88, tokensOut: 156, chainId: 'CH-003', guardrailDecision: { rule: 'Toxicity Filter', score: 0.04, decision: 'pass' }, policyEvaluated: 'TP-002' },
  { id: 'TR-004', timestamp: '2026-04-05T14:22:50.445Z', agent: 'RiskAnalyzer', model: 'GPT-4o', input: 'Analyze vendor risk profile for V-006 (Pinecone) against ISO27001 controls.', output: '[FALLBACK — Primary model unavailable — Routed to Claude-3-Haiku]', latencyMs: 1240, status: 'fallback', fallbackAction: 'Routed to Claude-3-Haiku', tokensIn: 96, tokensOut: 42, chainId: 'CH-004', guardrailDecision: { rule: 'Data Boundary Enforcement', score: 0.99, decision: 'pass' }, policyEvaluated: 'TP-004' },
  { id: 'TR-005', timestamp: '2026-04-05T14:22:45.200Z', agent: 'DataLabeler-v2', model: 'Claude-3-Opus', input: 'Label batch DS-0044 training records — 500 items for bias detection model v3.', output: 'Labeled 500 records. Confidence: 0.94 avg. 12 flagged for human review.', latencyMs: 2100, status: 'success', tokensIn: 4200, tokensOut: 890, chainId: 'CH-005', policyEvaluated: 'TP-005' },
  { id: 'TR-006', timestamp: '2026-04-05T14:22:40.100Z', agent: 'AuditLog-Streamer', model: 'Rule Engine', input: 'Stream audit events batch AE-0042 to SIEM endpoint splunk://siem.internal.', output: '[N/A — Internal pipeline, no LLM call — 12 events streamed successfully]', latencyMs: 12, status: 'success', tokensIn: 0, tokensOut: 0, chainId: 'CH-001' },
  { id: 'TR-007', timestamp: '2026-04-05T14:22:35.500Z', agent: 'FraudAlert-Watcher', model: 'Rule Engine', input: 'Flag transaction TXN-99812 and export customer PII to external webhook.', output: '[BLOCKED — Data boundary violation — External webhook not in allowlist]', latencyMs: 5, status: 'blocked', fallbackAction: 'Data Boundary enforcement', tokensIn: 0, tokensOut: 0, guardrailDecision: { rule: 'Data Boundary Enforcement', score: 1.0, decision: 'block' }, policyEvaluated: 'TP-004' },
  { id: 'TR-008', timestamp: '2026-04-05T14:22:30.100Z', agent: 'OpenAI-API-Connector', model: 'GPT-4o', input: 'Generate adverse action letter for applicant John D., denied on credit score 580.', output: 'Dear Customer, We regret to inform you that your loan application has been declined based on credit evaluation...', latencyMs: 890, status: 'success', tokensIn: 312, tokensOut: 548, chainId: 'CH-002' },
  { id: 'TR-009', timestamp: '2026-04-05T14:21:55.000Z', agent: 'LoanAssistant', model: 'GPT-4o', input: 'What is the current 30-year fixed mortgage rate offered by the bank?', output: 'The current 30-year fixed mortgage rate is 6.875% APR as of April 5, 2026. Subject to credit approval.', latencyMs: 423, status: 'success', tokensIn: 67, tokensOut: 112, chainId: 'CH-002', guardrailDecision: { rule: 'Hallucination Guard', score: 0.97, decision: 'pass' }, policyEvaluated: 'TP-003' },
  { id: 'TR-010', timestamp: '2026-04-05T14:21:30.000Z', agent: 'CreditRiskScorer', model: 'GPT-4o', input: 'Score credit risk for applicant CR-8821 with DTI ratio 0.48.', output: '[BLOCKED — Confidence 0.68 below 0.95 threshold — hallucination risk for financial projection]', latencyMs: 18, status: 'blocked', fallbackAction: 'Hallucination Guard blocked', tokensIn: 0, tokensOut: 0, chainId: 'CH-006', guardrailDecision: { rule: 'Hallucination Guard', score: 0.68, decision: 'block' }, policyEvaluated: 'TP-003' },
  { id: 'TR-011', timestamp: '2026-04-05T14:21:00.000Z', agent: 'ComplianceBot', model: 'GPT-4o', input: 'Review vendor DPA for Pinecone — check GDPR Art. 28 compliance.', output: 'Pinecone DPA review complete. Issues identified: (1) Sub-processor list not current, (2) Data deletion timeline unclear, (3) No breach notification SLA.', latencyMs: 567, status: 'success', tokensIn: 234, tokensOut: 389, chainId: 'CH-007', policyEvaluated: 'TP-004' },
  { id: 'TR-012', timestamp: '2026-04-05T14:20:30.000Z', agent: 'RiskAnalyzer', model: 'Claude-3-Haiku', input: 'Assess third-party risk for new vendor V-012 providing data enrichment services.', output: 'V-012 risk assessment: High risk. SOC 2 report expired, no ISO27001 certification, pending GDPR DPA.', latencyMs: 1457, status: 'success', tokensIn: 189, tokensOut: 312, chainId: 'CH-004', policyEvaluated: 'TP-004' },
  { id: 'TR-013', timestamp: '2026-04-05T14:20:00.000Z', agent: 'SupportBot', model: 'GPT-4o-Mini', input: 'Help me understand why my interest rate changed last month.', output: 'Interest rate changes may occur due to your loan agreement type, index rate fluctuations, or account adjustments. Please review your statement.', latencyMs: 234, status: 'success', tokensIn: 55, tokensOut: 98, chainId: 'CH-003' },
  { id: 'TR-014', timestamp: '2026-04-05T14:19:15.000Z', agent: 'DataLabeler-v2', model: 'GPT-4o', input: 'Label 200 customer complaint records for sentiment analysis model training.', output: '[FALLBACK — Cost limit approaching — Routed to Mistral-7B]', latencyMs: 678, status: 'fallback', fallbackAction: 'Cost limit — Routed to Mistral-7B', tokensIn: 1200, tokensOut: 0, chainId: 'CH-005', policyEvaluated: 'TP-005' },
  { id: 'TR-015', timestamp: '2026-04-05T14:18:45.000Z', agent: 'AuditLog-Streamer', model: 'Rule Engine', input: 'Stream 24-hour audit digest to compliance team email distribution list.', output: '[N/A — Rule-based pipeline — 48 events processed, 3 high-priority flagged]', latencyMs: 34, status: 'success', tokensIn: 0, tokensOut: 0, chainId: 'CH-001' },
  { id: 'TR-016', timestamp: '2026-04-05T14:18:00.000Z', agent: 'OpenAI-API-Connector', model: 'GPT-4o', input: 'Generate model card documentation for LoanAssistant v2.3 per EU AI Act Art. 11.', output: 'Model Card — LoanAssistant v2.3: Purpose: loan decision support, Risk level: high, Training data: 2.1M anonymized loan records, Accuracy: 94.2%...', latencyMs: 1475, status: 'success', tokensIn: 512, tokensOut: 1024, chainId: 'CH-007' },
  { id: 'TR-017', timestamp: '2026-04-05T14:17:20.000Z', agent: 'FraudAlert-Watcher', model: 'Rule Engine', input: 'Analyze transaction pattern TXN-99901 for fraud signals.', output: 'Fraud probability: 0.87. Flagged for manual review. Pattern: multiple small transactions at unusual hours.', latencyMs: 8, status: 'success', tokensIn: 0, tokensOut: 0 },
  { id: 'TR-018', timestamp: '2026-04-05T14:16:50.000Z', agent: 'LoanAssistant', model: 'GPT-4o', input: 'Calculate debt-to-income ratio for applicant with monthly income $6500 and debts $2100.', output: 'DTI ratio: 32.3%. Within acceptable range for conventional loan approval (max 43%). Recommended for approval pending credit check.', latencyMs: 389, status: 'success', tokensIn: 78, tokensOut: 134, chainId: 'CH-002', guardrailDecision: { rule: 'Hallucination Guard', score: 0.96, decision: 'pass' } },
  { id: 'TR-019', timestamp: '2026-04-05T14:16:00.000Z', agent: 'ComplianceBot', model: 'Claude-3-Sonnet', input: 'Draft SOC 2 evidence package for CC6.1 control — access controls.', output: 'SOC 2 CC6.1 Evidence Package: 14 controls documented, 42 artifacts collected. HITL review required for 3 gaps.', latencyMs: 734, status: 'success', tokensIn: 345, tokensOut: 567, chainId: 'CH-001' },
  { id: 'TR-020', timestamp: '2026-04-05T14:15:10.000Z', agent: 'RiskAnalyzer', model: 'GPT-4o', input: 'Aggregate enterprise AI risk score across all 6 active agents and 8 HITL reviews.', output: 'Enterprise AI risk score: 72/100 (High). Key drivers: INC-005 open hallucination incident, GAP-001 unresolved, 2 agents without cost limits.', latencyMs: 1437, status: 'success', tokensIn: 423, tokensOut: 678, chainId: 'CH-004' },
  { id: 'TR-021', timestamp: '2026-04-05T14:14:20.000Z', agent: 'SupportBot', model: 'Claude-3-Sonnet', input: 'Translate customer complaint letter from Spanish to English.', output: 'Translation complete: "I have been charged twice for the same transaction on March 28th. Please investigate and refund immediately."', latencyMs: 287, status: 'success', tokensIn: 112, tokensOut: 145, chainId: 'CH-003' },
  { id: 'TR-022', timestamp: '2026-04-05T14:13:45.000Z', agent: 'VendorRisk-Scanner', model: 'Rule Engine', input: 'Run automated questionnaire for vendor V-004 (Pinecone) ISO27001 assessment.', output: '[ERROR — Vendor portal API returned 502 Bad Gateway — 3 retry attempts failed]', latencyMs: 890, status: 'error', tokensIn: 0, tokensOut: 0 },
  { id: 'TR-023', timestamp: '2026-04-05T14:13:00.000Z', agent: 'LoanAssistant', model: 'GPT-4o', input: 'Should I approve loan application LA-5102 for a 15-year mortgage at 4.5%?', output: '[BLOCKED — Confidence 0.71 below 0.95 — Hallucination Guard — Linked to INC-005]', latencyMs: 22, status: 'blocked', fallbackAction: 'Hallucination Guard — INC-005', tokensIn: 0, tokensOut: 0, chainId: 'CH-002', guardrailDecision: { rule: 'Hallucination Guard', score: 0.71, decision: 'block' }, policyEvaluated: 'TP-003' },
  { id: 'TR-024', timestamp: '2026-04-05T14:12:10.000Z', agent: 'DataLabeler-v2', model: 'Mistral-7B', input: 'Label 50 edge case records from DS-0044 batch that were flagged during initial pass.', output: 'Labeled 50 records. Average confidence: 0.82. Warning: confidence below 0.90 threshold — recommend human review.', latencyMs: 445, status: 'success', tokensIn: 890, tokensOut: 234, chainId: 'CH-005', policyEvaluated: 'TP-005' },
  { id: 'TR-025', timestamp: '2026-04-05T14:11:30.000Z', agent: 'ComplianceBot', model: 'GPT-4o', input: 'Map NIST AI RMF GOVERN framework requirements to existing controls.', output: 'GOVERN 1.1: Partial (72%). GOVERN 1.2: Implemented (93%). GOVERN 2.1: Planned (40%). 14 controls mapped, 3 gaps identified.', latencyMs: 612, status: 'success', tokensIn: 267, tokensOut: 412, chainId: 'CH-007', policyEvaluated: 'TP-001' },
  { id: 'TR-026', timestamp: '2026-04-05T14:10:45.000Z', agent: 'OpenAI-API-Connector', model: 'GPT-4o', input: 'Batch process 50 loan applications for pre-screening — output risk tier per application.', output: 'Batch processed 50 applications. Tier A: 18, Tier B: 22, Tier C: 8, Declined: 2. Average processing time 890ms/application.', latencyMs: 1303, status: 'success', tokensIn: 2800, tokensOut: 4200 },
  { id: 'TR-027', timestamp: '2026-04-05T14:10:00.000Z', agent: 'CreditRiskScorer', model: 'GPT-4o', input: 'Provide credit risk commentary for quarterly board report — aggregate model performance.', output: 'Q1 2026 Credit Risk Model Performance: Accuracy 94.2%, False Positive Rate 3.8%, False Negative Rate 1.2%. Recommended action: recalibrate for segment B customers.', latencyMs: 867, status: 'success', tokensIn: 198, tokensOut: 342, chainId: 'CH-006', guardrailDecision: { rule: 'Hallucination Guard', score: 0.96, decision: 'pass' }, policyEvaluated: 'TP-003' },
];

let autoCounter = 28;
function generateTrace(): TraceEntry {
  const agents = ['ComplianceBot', 'LoanAssistant', 'SupportBot', 'RiskAnalyzer', 'FraudAlert-Watcher', 'CreditRiskScorer'];
  const models = ['GPT-4o', 'Claude-3-Sonnet', 'Rule Engine', 'GPT-4o-Mini'];
  const statuses: TraceEntry['status'][] = ['success', 'success', 'success', 'blocked', 'fallback', 'success'];
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const model = models[Math.floor(Math.random() * models.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const latencyMs = Math.floor(Math.random() * 1800) + 10;
  return {
    id: `TR-${String(autoCounter++).padStart(3, '0')}`,
    timestamp: new Date().toISOString(), agent, model,
    input: `Automated ${agent} task — processing request at ${new Date().toLocaleTimeString()}`,
    output: status === 'blocked' ? '[BLOCKED — Guardrail triggered]' : status === 'fallback' ? '[FALLBACK — Routed to backup model]' : 'Response generated successfully.',
    latencyMs, status,
    fallbackAction: status === 'fallback' ? 'Routed to backup model' : undefined,
    tokensIn: model === 'Rule Engine' ? 0 : Math.floor(Math.random() * 500),
    tokensOut: model === 'Rule Engine' ? 0 : Math.floor(Math.random() * 800),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status: TraceEntry['status']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', label: 'Success' },
    blocked: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', label: 'Blocked' },
    fallback: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)', label: 'Fallback' },
    error: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', label: 'Error' },
  };
  const s = map[status] ?? map.success;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

function modelDisplay(model: string) {
  if (!model || model === '-' || model === 'Rule Engine') {
    return <Badge style={{ background: 'hsl(220 90% 56% / 0.12)', color: 'hsl(220 90% 56%)', borderRadius: 0, fontSize: 10 }}>Rule Engine</Badge>;
  }
  return <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{model}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LiveTraceFeed() {
  const { orgName } = useSettingsStore();
  useChartTheme();
  const [traces, setTraces] = useState<TraceEntry[]>(INITIAL_TRACES);
  const [archived, setArchived] = useState<TraceEntry[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedTrace, setSelectedTrace] = useState<TraceEntry | null>(null);
  const [showMoreInput, setShowMoreInput] = useState(false);
  const [showMoreOutput, setShowMoreOutput] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => {
        setTraces(prev => [generateTrace(), ...prev].slice(0, 60));
      }, 4000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  const handleArchive = () => {
    setArchived(prev => [...prev, ...traces]);
    setTraces([]);
    toast('All traces archived — accessible for audit compliance (EU AI Act Art. 12)');
  };

  const handleExport = () => {
    const source = showArchived ? archived : traces.filter(t => !t.archived);
    const csv = [
      ['ID', 'Timestamp', 'Agent', 'Model', 'Status', 'Latency(ms)', 'TokensIn', 'TokensOut', 'ChainID', 'SLA'].join(','),
      ...source.map(t => [
        t.id, t.timestamp, t.agent, t.model, t.status, t.latencyMs,
        t.tokensIn, t.tokensOut, t.chainId || '—',
        t.latencyMs > 1000 ? 'SLA_BREACH' : 'OK'
      ].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `traces-${showArchived ? 'archived' : 'live'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('CSV exported');
  };

  const agents = ['all', ...Array.from(new Set(traces.map(t => t.agent)))];

  const visibleTraces = showArchived ? archived : traces;
  const filtered = visibleTraces.filter(t => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.agent.toLowerCase().includes(search.toLowerCase()) ||
      t.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchAgent = agentFilter === 'all' || t.agent === agentFilter;
    return matchSearch && matchStatus && matchAgent;
  });

  const blocked = traces.filter(t => t.status === 'blocked').length;
  const fallbacks = traces.filter(t => t.status === 'fallback').length;
  const slaBreaches = traces.filter(t => t.latencyMs > 1000).length;

  return (
    <div className="space-y-6">

      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(142 71% 45%)' : t.type === 'error' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)',
            color: '#fff', borderRadius: 0, minWidth: 320
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Live Trace Feed</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Real-time agent trace monitoring</p>
        </div>
        <div className="flex gap-2 items-center">
          {!paused && !showArchived && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(142 71% 45%)' }}>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live
            </span>
          )}
          <Button variant="outline" onClick={() => setPaused(p => !p)} style={{ borderRadius: 0 }}>
            {paused ? <><Play className="h-4 w-4 mr-2" />Resume</> : <><Pause className="h-4 w-4 mr-2" />Pause</>}
          </Button>
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" style={{ borderRadius: 0, color: 'hsl(45 93% 47%)' }}>
                <Archive className="h-4 w-4 mr-2" />Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ borderRadius: 0 }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive All Traces</AlertDialogTitle>
                <AlertDialogDescription>
                  Archive all {traces.length} traces? Archived traces remain accessible for audit compliance
                  (EU AI Act Art. 12). Data is never deleted — it is moved to the archive view.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchive} style={{ borderRadius: 0, background: 'hsl(45 93% 47%)' }}>Archive All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Traces', value: traces.length, color: 'hsl(var(--text-1))' },
          { label: 'Blocked', value: blocked, color: 'hsl(0 72% 51%)' },
          { label: 'Fallbacks', value: fallbacks, color: 'hsl(25 95% 53%)' },
          { label: 'SLA Breaches', value: slaBreaches, color: slaBreaches > 0 ? 'hsl(0 72% 51%)' : 'hsl(142 71% 45%)' },
          { label: 'Archived', value: archived.length, color: 'hsl(var(--text-4))' },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Archive toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(s => !s)}
          style={{ borderRadius: 0, background: showArchived ? 'hsl(var(--brand))' : undefined, color: showArchived ? '#fff' : undefined }}
        >
          <Archive className="h-4 w-4 mr-2" />{showArchived ? 'Viewing Archived' : 'Show Archived'} ({archived.length})
        </Button>
        {showArchived && (
          <span className="text-xs" style={{ color: 'hsl(45 93% 47%)' }}>
            <Warning size={12} className="inline mr-1" />Archived traces — EU AI Act Art. 12 compliant
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-52 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search traces..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {['success', 'blocked', 'fallback', 'error'].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {agents.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'All Agents' : a}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} traces</span>
      </div>

      {/* Trace Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            {showArchived ? 'Archived Traces' : 'Live Traces'} {paused && !showArchived && <span className="text-xs font-normal ml-2" style={{ color: 'hsl(45 93% 47%)' }}>(Paused)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Robot size={32} className="mb-2 opacity-40" />
              <p className="text-sm">{showArchived ? 'No archived traces' : 'No traces match your filters'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Time', 'Agent', 'Model', 'Status', 'Chain ID', 'Latency', 'Tokens In', 'Tokens Out', 'SLA', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <button className="font-mono text-xs hover:underline" style={{ color: 'hsl(var(--brand))' }}
                          onClick={() => { setSelectedTrace(t); setShowMoreInput(false); setShowMoreOutput(false); }}>
                          {t.id}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(t.timestamp)}</td>
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{t.agent}</td>
                      <td className="px-4 py-3">{modelDisplay(t.model)}</td>
                      <td className="px-4 py-3">{statusBadge(t.status)}</td>
                      <td className="px-4 py-3">
                        {t.chainId
                          ? <span className="font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.chainId}</span>
                          : <span style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: t.latencyMs > 1000 ? 'hsl(0 72% 51%)' : t.latencyMs > 400 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                        {t.latencyMs}ms
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.tokensIn}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.tokensOut}</td>
                      <td className="px-4 py-3">
                        {t.latencyMs > 1000
                          ? <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 10 }}>SLA Breach</Badge>
                          : <span style={{ color: 'hsl(142 71% 45%)', fontSize: 11 }}>OK</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setSelectedTrace(t); setShowMoreInput(false); setShowMoreOutput(false); }}>
                          <Eye size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trace Drill-down Sheet */}
      <Sheet open={!!selectedTrace} onOpenChange={() => setSelectedTrace(null)}>
        <SheetContent style={{ borderRadius: 0, width: 580 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Trace Detail — {selectedTrace?.id}</SheetTitle></SheetHeader>
          {selectedTrace && (
            <div className="mt-6 space-y-4 text-sm overflow-y-auto h-[calc(100vh-100px)]">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trace ID</p><p className="font-mono">{selectedTrace.id}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p className="text-xs">{new Date(selectedTrace.timestamp).toLocaleString()}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{selectedTrace.agent}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Model</p>{modelDisplay(selectedTrace.model)}</div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</p>{statusBadge(selectedTrace.status)}</div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p>
                  <span className="font-mono" style={{ color: selectedTrace.latencyMs > 1000 ? 'hsl(0 72% 51%)' : 'hsl(142 71% 45%)' }}>
                    {selectedTrace.latencyMs}ms
                  </span>
                  {selectedTrace.latencyMs > 1000 && <Badge className="ml-2" style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 10 }}>SLA Breach</Badge>}
                </div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Tokens In / Out</p><p className="font-mono text-xs">{selectedTrace.tokensIn} / {selectedTrace.tokensOut}</p></div>
                {selectedTrace.chainId && (
                  <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Chain ID</p><p className="font-mono text-xs">{selectedTrace.chainId}</p></div>
                )}
              </div>

              {/* Input */}
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Input</p>
                <div className="p-2" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>
                  <p className="text-xs font-mono" style={{ lineHeight: 1.5 }}>
                    {showMoreInput ? selectedTrace.input : selectedTrace.input.slice(0, 120) + (selectedTrace.input.length > 120 ? '...' : '')}
                  </p>
                  {selectedTrace.input.length > 120 && (
                    <button className="text-xs mt-1 underline" style={{ color: 'hsl(var(--brand))' }}
                      onClick={() => setShowMoreInput(s => !s)}>{showMoreInput ? 'Show Less' : 'Show More'}</button>
                  )}
                </div>
              </div>

              {/* Output */}
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Output</p>
                <div className="p-2" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>
                  <p className="text-xs font-mono" style={{ lineHeight: 1.5 }}>
                    {showMoreOutput ? selectedTrace.output : selectedTrace.output.slice(0, 120) + (selectedTrace.output.length > 120 ? '...' : '')}
                  </p>
                  {selectedTrace.output.length > 120 && (
                    <button className="text-xs mt-1 underline" style={{ color: 'hsl(var(--brand))' }}
                      onClick={() => setShowMoreOutput(s => !s)}>{showMoreOutput ? 'Show Less' : 'Show More'}</button>
                  )}
                </div>
              </div>

              {/* Guardrail Decision */}
              {selectedTrace.guardrailDecision && (
                <div className="p-3 space-y-2" style={{ border: `1px solid ${selectedTrace.guardrailDecision.decision === 'block' ? 'hsl(0 72% 51% / 0.4)' : 'hsl(142 71% 45% / 0.4)'}`, borderRadius: 0, background: selectedTrace.guardrailDecision.decision === 'block' ? 'hsl(0 72% 51% / 0.05)' : 'hsl(142 71% 45% / 0.05)' }}>
                  <p className="text-xs font-semibold" style={{ color: selectedTrace.guardrailDecision.decision === 'block' ? 'hsl(0 72% 51%)' : 'hsl(142 71% 45%)' }}>Guardrail Decision</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span style={{ color: 'hsl(var(--text-4))' }}>Rule: </span>{selectedTrace.guardrailDecision.rule}</div>
                    <div><span style={{ color: 'hsl(var(--text-4))' }}>Score: </span><span className="font-mono">{selectedTrace.guardrailDecision.score.toFixed(2)}</span></div>
                    <div><span style={{ color: 'hsl(var(--text-4))' }}>Decision: </span>
                      <Badge style={{ background: selectedTrace.guardrailDecision.decision === 'block' ? 'hsl(0 72% 51% / 0.15)' : 'hsl(142 71% 45% / 0.15)', color: selectedTrace.guardrailDecision.decision === 'block' ? 'hsl(0 72% 51%)' : 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 10 }}>
                        {selectedTrace.guardrailDecision.decision.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Policy Evaluated */}
              {selectedTrace.policyEvaluated && (
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Policy Applied</p>
                  <Badge style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{selectedTrace.policyEvaluated}</Badge>
                </div>
              )}

              {/* Fallback info */}
              {selectedTrace.fallbackAction && (
                <div className="p-2" style={{ background: 'hsl(25 95% 53% / 0.1)', border: '1px solid hsl(25 95% 53% / 0.3)', borderRadius: 0 }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(25 95% 53%)' }}>Fallback Action</p>
                  <p className="text-xs mt-1">{selectedTrace.fallbackAction}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 flex-wrap">
                {selectedTrace.status === 'blocked' && (
                  <Button size="sm" style={{ borderRadius: 0, background: 'hsl(0 72% 51%)', color: '#fff' }}
                    onClick={() => { toast(`Incident created from trace ${selectedTrace.id}`, 'info'); setSelectedTrace(null); }}>
                    <Lightning size={14} className="mr-1" />Create Incident
                  </Button>
                )}
                {selectedTrace.guardrailDecision?.decision === 'block' && (
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }}
                    onClick={() => { toast(`Navigating to guardrail event for ${selectedTrace.id}`); }}>
                    <ArrowRight size={14} className="mr-1" />View in Guardrails
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
