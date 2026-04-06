import { useState, useCallback } from 'react';
import {
  FloppyDisk, ArrowCounterClockwise, Warning, ShieldCheck,
  CurrencyDollar, GitFork, Bell, Plus, Trash, Clock, Info,
  Gear, Sliders, PlugsConnected, SlidersHorizontal, TestTube,
  CheckCircle, XCircle, Globe, Eye,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { TRUST_POLICIES } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuardrailConfig {
  id: string; name: string; enabled: boolean; threshold: string;
  action: 'block' | 'warn' | 'flag'; justification: string;
}
interface CostLimit {
  id: string; agent: string; dailyLimit: string; weeklyLimit: string; alertAt: string;
}
interface FallbackChain {
  id: string; primary: string; fallback1: string; fallback2: string; timeout: string;
}
interface AlertThreshold {
  id: string; metric: string; threshold: string; severity: 'critical' | 'high' | 'medium'; enabled: boolean;
}
interface AuditEntry {
  id: string; timestamp: string; user: string; section: string; change: string; before: string; after: string;
}
interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }
interface ThresholdRow {
  id: string; policy: string; current: string; recommended: string; framework: string; status: 'meets' | 'below';
}
interface Integration {
  id: string; name: string; type: string; connected: boolean; webhook: string; apiKey: string;
}
interface PerModelConfig {
  id: string; model: string; overrideGlobal: boolean; piiEnabled: boolean; toxicityThreshold: string;
  hallucinationEnabled: boolean; costDaily: string; linkedPolicies: string[];
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

const DEFAULT_GUARDRAILS: GuardrailConfig[] = [
  { id: 'g1', name: 'PII Detection & Redaction', enabled: true, threshold: '99.5% recall', action: 'block', justification: 'GDPR Art. 25 — Privacy by Design.' },
  { id: 'g2', name: 'Toxicity Filter', enabled: true, threshold: 'Score < 0.15', action: 'warn', justification: 'EU AI Act Art. 9 — Risk management.' },
  { id: 'g3', name: 'Hallucination Guard', enabled: true, threshold: 'Confidence > 0.95', action: 'block', justification: 'ISO 42001 Clause 8.4 — Raised from 0.80 to 0.95.' },
  { id: 'g4', name: 'Data Boundary Enforcement', enabled: true, threshold: 'Strict', action: 'block', justification: 'SOC 2 CC6.1 — Logical access controls.' },
  { id: 'g5', name: 'Prompt Injection Detection', enabled: true, threshold: 'BERT score > 0.75', action: 'block', justification: 'OWASP LLM01.' },
  { id: 'g6', name: 'Sensitive Topic Filter', enabled: false, threshold: 'Category list v2', action: 'flag', justification: 'EU AI Act Art. 13 — Disabled pending review.' },
];

const DEFAULT_COST_LIMITS: CostLimit[] = [
  { id: 'cl1', agent: 'OpenAI-API-Connector', dailyLimit: '50', weeklyLimit: '250', alertAt: '70' },
  { id: 'cl2', agent: 'DataLabeler-v2', dailyLimit: '30', weeklyLimit: '150', alertAt: '75' },
  { id: 'cl3', agent: 'LoanAssistant', dailyLimit: '20', weeklyLimit: '100', alertAt: '80' },
  { id: 'cl4', agent: 'ComplianceBot', dailyLimit: '10', weeklyLimit: '50', alertAt: '80' },
  { id: 'cl5', agent: 'SupportBot', dailyLimit: '16', weeklyLimit: '80', alertAt: '70' },
  { id: 'cl6', agent: 'RiskAnalyzer', dailyLimit: '12', weeklyLimit: '60', alertAt: '75' },
];

const DEFAULT_FALLBACK_CHAINS: FallbackChain[] = [
  { id: 'fc1', primary: 'GPT-4o', fallback1: 'Claude-3-Sonnet', fallback2: 'GPT-3.5-Turbo', timeout: '15s' },
  { id: 'fc2', primary: 'Claude-3-Opus', fallback1: 'Claude-3-Sonnet', fallback2: 'Claude-3-Haiku', timeout: '30s' },
  { id: 'fc3', primary: 'GPT-4-Turbo', fallback1: 'GPT-4o', fallback2: 'Mistral-7B', timeout: '30s' },
];

const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { id: 'at1', metric: 'Trust Score Drop', threshold: '< 85%', severity: 'critical', enabled: true },
  { id: 'at2', metric: 'Guardrail Violation Rate', threshold: '> 5% of calls', severity: 'high', enabled: true },
  { id: 'at3', metric: 'Avg Latency Spike', threshold: '> 2000ms', severity: 'high', enabled: true },
  { id: 'at4', metric: 'Fallback Rate', threshold: '> 10% of calls', severity: 'medium', enabled: true },
  { id: 'at5', metric: 'Daily Cost Exceeded', threshold: 'Agent budget 100%', severity: 'critical', enabled: true },
  { id: 'at6', metric: 'Model Unavailability', threshold: '> 60s downtime', severity: 'critical', enabled: false },
];

const DEFAULT_THRESHOLDS: ThresholdRow[] = [
  { id: 'th1', policy: 'PII Detection & Redaction', current: '99.5%', recommended: '99.5%', framework: 'GDPR Art. 25', status: 'meets' },
  { id: 'th2', policy: 'Toxicity & Safety Filter', current: '< 0.15', recommended: '< 0.10', framework: 'EU AI Act Art. 9', status: 'below' },
  { id: 'th3', policy: 'Hallucination Guard', current: '> 0.95', recommended: '> 0.95', framework: 'ISO 42001 Cl. 8.4', status: 'meets' },
  { id: 'th4', policy: 'Data Boundary Enforcement', current: 'Strict', recommended: 'Strict', framework: 'SOC 2 CC6.1', status: 'meets' },
  { id: 'th5', policy: 'Cost & Rate Limiter', current: '100%', recommended: '90%', framework: 'ISO 42001 Cl. 9.1', status: 'below' },
];

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'int1', name: 'Slack', type: 'webhook', connected: true, webhook: 'https://hooks.slack.com/services/T0XX/B0XX/xxxx', apiKey: '' },
  { id: 'int2', name: 'Jira', type: 'api_key', connected: false, webhook: '', apiKey: '' },
  { id: 'int3', name: 'PagerDuty', type: 'webhook', connected: false, webhook: '', apiKey: '' },
];

const DEFAULT_PER_MODEL: PerModelConfig[] = [
  { id: 'pm1', model: 'GPT-4o', overrideGlobal: true, piiEnabled: true, toxicityThreshold: '0.10', hallucinationEnabled: true, costDaily: '50', linkedPolicies: ['TP-001', 'TP-003', 'TP-005'] },
  { id: 'pm2', model: 'Claude-3-Opus', overrideGlobal: false, piiEnabled: true, toxicityThreshold: '0.15', hallucinationEnabled: true, costDaily: '30', linkedPolicies: ['TP-001', 'TP-002'] },
  { id: 'pm3', model: 'GPT-3.5-Turbo', overrideGlobal: false, piiEnabled: true, toxicityThreshold: '0.15', hallucinationEnabled: false, costDaily: '10', linkedPolicies: ['TP-001'] },
  { id: 'pm4', model: 'Mistral-7B', overrideGlobal: false, piiEnabled: true, toxicityThreshold: '0.20', hallucinationEnabled: false, costDaily: '5', linkedPolicies: [] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionBadge(action: GuardrailConfig['action']) {
  const map = {
    block: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
    warn: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    flag: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = map[action];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{action.charAt(0).toUpperCase() + action.slice(1)}</Badge>;
}

function severityBadge(severity: AlertThreshold['severity']) {
  const map = {
    critical: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
    high: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    medium: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
  };
  const s = map[severity];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrustConfig() {
  const { orgName } = useSettingsStore();
  const [guardrails, setGuardrails] = useState<GuardrailConfig[]>(DEFAULT_GUARDRAILS);
  const [costLimits, setCostLimits] = useState<CostLimit[]>(DEFAULT_COST_LIMITS);
  const [fallbackChains, setFallbackChains] = useState<FallbackChain[]>(DEFAULT_FALLBACK_CHAINS);
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>(DEFAULT_ALERT_THRESHOLDS);
  const [thresholds, setThresholds] = useState<ThresholdRow[]>(DEFAULT_THRESHOLDS);
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [perModel, setPerModel] = useState<PerModelConfig[]>(DEFAULT_PER_MODEL);
  const [selectedModel, setSelectedModel] = useState('GPT-4o');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  // Global settings
  const [piiEnabled, setPiiEnabled] = useState(true);
  const [piiSensitivity, setPiiSensitivity] = useState(95);
  const [toxicityThreshold, setToxicityThreshold] = useState(15);
  const [hallucinationEnabled, setHallucinationEnabled] = useState(true);
  const [hallucinationMethod, setHallucinationMethod] = useState('confidence');
  const [costDaily, setCostDaily] = useState('200');
  const [costWeekly, setCostWeekly] = useState('1000');
  const [costMonthly, setCostMonthly] = useState('3500');

  const [savedSnapshot, setSavedSnapshot] = useState({
    guardrails: DEFAULT_GUARDRAILS, costLimits: DEFAULT_COST_LIMITS,
    fallbackChains: DEFAULT_FALLBACK_CHAINS, alertThresholds: DEFAULT_ALERT_THRESHOLDS,
  });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const markDirty = () => setDirty(true);

  const createAuditEntry = (section: string, change: string, before: string, after: string) => {
    const entry: AuditEntry = {
      id: `AUD-${Date.now()}`, timestamp: new Date().toISOString(),
      user: 'Sarah Chen (CISO)', section, change, before, after,
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  const handleSave = () => {
    createAuditEntry('Configuration', 'Configuration saved', 'Previous state', 'Updated state');
    setSavedSnapshot({ guardrails: [...guardrails], costLimits: [...costLimits], fallbackChains: [...fallbackChains], alertThresholds: [...alertThresholds] });
    setDirty(false);
    toast('Configuration saved — audit entry created');
  };

  const handleReset = () => {
    setGuardrails([...savedSnapshot.guardrails]);
    setCostLimits([...savedSnapshot.costLimits]);
    setFallbackChains([...savedSnapshot.fallbackChains]);
    setAlertThresholds([...savedSnapshot.alertThresholds]);
    setDirty(false);
    toast('Configuration reset to last saved state');
  };

  // CRUD handlers
  const toggleGuardrail = (id: string) => { setGuardrails(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g)); markDirty(); };
  const updateGuardrail = (id: string, field: keyof GuardrailConfig, value: string) => { setGuardrails(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g)); markDirty(); };
  const deleteGuardrail = (id: string) => { const g = guardrails.find(g => g.id === id); setGuardrails(prev => prev.filter(g => g.id !== id)); markDirty(); toast(`Guardrail "${g?.name}" removed`); };
  const addGuardrail = () => { setGuardrails(prev => [...prev, { id: `g${Date.now()}`, name: 'New Guardrail', enabled: false, threshold: '90%', action: 'warn', justification: '' }]); markDirty(); };
  const updateCostLimit = (id: string, field: keyof CostLimit, value: string) => { setCostLimits(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c)); markDirty(); };
  const deleteCostLimit = (id: string) => { setCostLimits(prev => prev.filter(c => c.id !== id)); markDirty(); };
  const addCostLimit = () => { setCostLimits(prev => [...prev, { id: `cl${Date.now()}`, agent: 'New Agent', dailyLimit: '10', weeklyLimit: '50', alertAt: '80' }]); markDirty(); };
  const updateFallbackChain = (id: string, field: keyof FallbackChain, value: string) => { setFallbackChains(prev => prev.map(fc => fc.id === id ? { ...fc, [field]: value } : fc)); markDirty(); };
  const deleteFallbackChain = (id: string) => { setFallbackChains(prev => prev.filter(fc => fc.id !== id)); markDirty(); };
  const addFallbackChain = () => { setFallbackChains(prev => [...prev, { id: `fc${Date.now()}`, primary: 'New Model', fallback1: 'Claude-3-Haiku', fallback2: 'GPT-3.5-Turbo', timeout: '30s' }]); markDirty(); };
  const toggleAlert = (id: string) => { setAlertThresholds(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)); markDirty(); };
  const deleteAlert = (id: string) => { setAlertThresholds(prev => prev.filter(a => a.id !== id)); markDirty(); };

  const handleTestConnection = (intId: string) => {
    toast(`Testing connection for ${integrations.find(i => i.id === intId)?.name}...`, 'info');
    setTimeout(() => toast('Connection test successful', 'success'), 1500);
  };

  const toggleIntegration = (intId: string) => {
    setIntegrations(prev => prev.map(i => i.id === intId ? { ...i, connected: !i.connected } : i));
    markDirty();
  };

  const currentModelConfig = perModel.find(pm => pm.model === selectedModel);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Toast */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
              color: '#fff', borderRadius: 0, minWidth: 300,
            }}>{t.text}</div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Configuration</h1>
              <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>PRODUCTION</Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Guardrails, cost limits, fallback chains, alert thresholds</p>
          </div>
          <div className="flex items-center gap-3">
            {dirty && <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}><Warning size={14} />Unsaved changes</span>}
            <Button variant="outline" onClick={() => setShowAuditLog(s => !s)} style={{ borderRadius: 0 }}>
              <Clock className="h-4 w-4 mr-2" />Audit Log ({auditLog.length})
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleReset} disabled={!dirty} style={{ borderRadius: 0 }}>
                  <ArrowCounterClockwise className="h-4 w-4 mr-2" />Reset to Last Saved
                </Button>
              </TooltipTrigger>
              <TooltipContent style={{ borderRadius: 0, maxWidth: 260 }}>Reverts all changes to the last successfully saved state.</TooltipContent>
            </Tooltip>
            <Button onClick={handleSave} disabled={!dirty} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              <FloppyDisk className="h-4 w-4 mr-2" />Save Configuration
            </Button>
          </div>
        </div>

        {/* Production Warning */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 0 }}>
          <Warning size={14} className="text-destructive" />
          <p className="text-xs text-destructive">
            <strong>PRODUCTION environment.</strong> Changes take effect immediately. All saves create an immutable audit entry (SOC 2 CC6.1, ISO 27001 A.12.1.2).
          </p>
        </div>

        {/* Audit Log Panel */}
        {showAuditLog && (
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Configuration Change Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLog.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: 'hsl(var(--text-4))' }}>No configuration changes recorded in this session.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {auditLog.map(entry => (
                    <div key={entry.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{entry.section} — {entry.change}</span>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Changed by: {entry.user}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4 Tabs */}
        <Tabs defaultValue="global" className="space-y-4">
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="global" style={{ borderRadius: 0 }}><Gear size={14} className="mr-1.5" />Global Settings</TabsTrigger>
            <TabsTrigger value="per-model" style={{ borderRadius: 0 }}><SlidersHorizontal size={14} className="mr-1.5" />Per-Model Config</TabsTrigger>
            <TabsTrigger value="thresholds" style={{ borderRadius: 0 }}><Sliders size={14} className="mr-1.5" />Thresholds</TabsTrigger>
            <TabsTrigger value="integrations" style={{ borderRadius: 0 }}><PlugsConnected size={14} className="mr-1.5" />Integrations</TabsTrigger>
          </TabsList>

          {/* TAB 1: Global Settings */}
          <TabsContent value="global" className="space-y-4">
            {/* PII Detection */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>PII Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Enable PII Detection</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Detect and redact PII in all agent inputs/outputs</p>
                  </div>
                  <Switch checked={piiEnabled} onCheckedChange={v => { setPiiEnabled(v); markDirty(); }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Sensitivity: {piiSensitivity}%</label>
                  <input type="range" min={50} max={100} value={piiSensitivity} onChange={e => { setPiiSensitivity(Number(e.target.value)); markDirty(); }} className="w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Toxicity */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Toxicity Threshold</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Max Toxicity Score: {(toxicityThreshold / 100).toFixed(2)}</label>
                <input type="range" min={5} max={30} value={toxicityThreshold} onChange={e => { setToxicityThreshold(Number(e.target.value)); markDirty(); }} className="w-full" />
              </CardContent>
            </Card>

            {/* Hallucination */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Hallucination Guard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Enable Hallucination Detection</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Confidence-based hallucination detection for LLM outputs</p>
                  </div>
                  <Switch checked={hallucinationEnabled} onCheckedChange={v => { setHallucinationEnabled(v); markDirty(); }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Detection Method</label>
                  <Select value={hallucinationMethod} onValueChange={v => { setHallucinationMethod(v); markDirty(); }}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      <SelectItem value="confidence">Confidence Score</SelectItem>
                      <SelectItem value="rag_verification">RAG Verification</SelectItem>
                      <SelectItem value="cross_model">Cross-Model Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Cost Limits */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost Limits (Global)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Daily Limit ($)</label>
                    <Input value={costDaily} onChange={e => { setCostDaily(e.target.value); markDirty(); }} style={{ borderRadius: 0 }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Weekly Limit ($)</label>
                    <Input value={costWeekly} onChange={e => { setCostWeekly(e.target.value); markDirty(); }} style={{ borderRadius: 0 }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Monthly Limit ($)</label>
                    <Input value={costMonthly} onChange={e => { setCostMonthly(e.target.value); markDirty(); }} style={{ borderRadius: 0 }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Default Guardrails */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Default Guardrails</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={addGuardrail} style={{ borderRadius: 0, height: 28 }}><Plus size={13} className="mr-1" />Add Row</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Guardrail', 'Threshold', 'Action', 'Justification', 'Enabled', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guardrails.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-2"><Input value={g.name} onChange={e => updateGuardrail(g.id, 'name', e.target.value)} className="h-7 text-xs font-medium w-48" style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }} /></td>
                        <td className="px-4 py-2"><Input value={g.threshold} onChange={e => updateGuardrail(g.id, 'threshold', e.target.value)} className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0 }} /></td>
                        <td className="px-4 py-2">
                          <Select value={g.action} onValueChange={v => updateGuardrail(g.id, 'action', v)}>
                            <SelectTrigger className="h-7 w-24 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                            <SelectContent style={{ borderRadius: 0 }}>{['block', 'warn', 'flag'].map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2"><Input value={g.justification} onChange={e => updateGuardrail(g.id, 'justification', e.target.value)} className="h-7 text-xs w-56" style={{ borderRadius: 0 }} placeholder="Regulatory reference" /></td>
                        <td className="px-4 py-2"><Switch checked={g.enabled} onCheckedChange={() => toggleGuardrail(g.id)} /></td>
                        <td className="px-4 py-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash size={13} /></Button></AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader><AlertDialogTitle>Delete Guardrail</AlertDialogTitle><AlertDialogDescription>Delete "{g.name}"? This creates an audit entry.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteGuardrail(g.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Per-Model Config */}
          <TabsContent value="per-model" className="space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Per-Model Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Select Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {perModel.map(pm => <SelectItem key={pm.id} value={pm.model}>{pm.model}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {currentModelConfig && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Override Global Settings</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Apply model-specific overrides</p>
                      </div>
                      <Switch checked={currentModelConfig.overrideGlobal} onCheckedChange={v => { setPerModel(prev => prev.map(pm => pm.model === selectedModel ? { ...pm, overrideGlobal: v } : pm)); markDirty(); }} />
                    </div>
                    {currentModelConfig.overrideGlobal && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>PII Detection</span>
                          <Switch checked={currentModelConfig.piiEnabled} onCheckedChange={v => { setPerModel(prev => prev.map(pm => pm.model === selectedModel ? { ...pm, piiEnabled: v } : pm)); markDirty(); }} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Toxicity Threshold</label>
                          <Input value={currentModelConfig.toxicityThreshold} onChange={e => { setPerModel(prev => prev.map(pm => pm.model === selectedModel ? { ...pm, toxicityThreshold: e.target.value } : pm)); markDirty(); }} style={{ borderRadius: 0 }} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Daily Cost Limit ($)</label>
                          <Input value={currentModelConfig.costDaily} onChange={e => { setPerModel(prev => prev.map(pm => pm.model === selectedModel ? { ...pm, costDaily: e.target.value } : pm)); markDirty(); }} style={{ borderRadius: 0 }} />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Linked Policies</label>
                      <div className="flex flex-wrap gap-2">
                        {currentModelConfig.linkedPolicies.map(p => {
                          const policy = TRUST_POLICIES.find(tp => tp.id === p);
                          return (
                            <Badge key={p} style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                              {policy?.name || p}
                            </Badge>
                          );
                        })}
                        {currentModelConfig.linkedPolicies.length === 0 && (
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No policies linked</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Thresholds */}
          <TabsContent value="thresholds" className="space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Policy Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Policy', 'Current', 'Recommended', 'Framework Requirement', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {thresholds.map(th => (
                      <tr key={th.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{th.policy}</td>
                        <td className="px-4 py-3">
                          <Input
                            value={th.current}
                            onChange={e => { setThresholds(prev => prev.map(t => t.id === th.id ? { ...t, current: e.target.value } : t)); markDirty(); }}
                            className="h-7 text-xs font-mono w-24"
                            style={{ borderRadius: 0 }}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{th.recommended}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{th.framework}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: th.status === 'meets' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                            color: th.status === 'meets' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>
                            {th.status === 'meets' ? 'Meets' : 'Below'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Alert Thresholds */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Alert Thresholds</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Metric', 'Threshold', 'Severity', 'Enabled', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertThresholds.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.metric}</td>
                        <td className="px-4 py-2 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{a.threshold}</td>
                        <td className="px-4 py-2">{severityBadge(a.severity)}</td>
                        <td className="px-4 py-2"><Switch checked={a.enabled} onCheckedChange={() => toggleAlert(a.id)} /></td>
                        <td className="px-4 py-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash size={13} /></Button></AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader><AlertDialogTitle>Delete Alert</AlertDialogTitle><AlertDialogDescription>Remove this alert threshold?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAlert(a.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Integrations */}
          <TabsContent value="integrations" className="space-y-4">
            {integrations.map(int => (
              <Card key={int.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Globe size={18} style={{ color: 'hsl(var(--brand))' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{int.name}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{int.type === 'webhook' ? 'Webhook' : 'API Key'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={int.connected} onCheckedChange={() => toggleIntegration(int.id)} />
                      <Badge style={{
                        background: int.connected ? 'hsl(142 71% 45% / 0.12)' : 'hsl(var(--s-nt-bg))',
                        color: int.connected ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                        borderRadius: 0, fontSize: 10,
                      }}>
                        {int.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>
                  {int.connected && (
                    <div className="space-y-3">
                      {int.type === 'webhook' ? (
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Webhook URL</label>
                          <Input
                            value={int.webhook}
                            onChange={e => { setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, webhook: e.target.value } : i)); markDirty(); }}
                            style={{ borderRadius: 0 }}
                            placeholder="https://hooks.slack.com/..."
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>API Key</label>
                          <Input
                            value={int.apiKey}
                            onChange={e => { setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, apiKey: e.target.value } : i)); markDirty(); }}
                            style={{ borderRadius: 0 }}
                            type="password"
                            placeholder="Enter API key..."
                          />
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleTestConnection(int.id)} style={{ borderRadius: 0 }}>
                        <TestTube size={14} className="mr-2" />Test Connection
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
