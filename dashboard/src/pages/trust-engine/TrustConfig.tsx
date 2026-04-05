import { useState, useCallback, useEffect } from 'react';
import {
  FloppyDisk, ArrowCounterClockwise, Warning, ShieldCheck,
  CurrencyDollar, GitFork, Bell, Plus, Trash, Clock, Info,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
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

// ── Seed Data ─────────────────────────────────────────────────────────────────

const DEFAULT_GUARDRAILS: GuardrailConfig[] = [
  { id: 'g1', name: 'PII Detection & Redaction', enabled: true, threshold: '99.5% recall', action: 'block', justification: 'GDPR Art. 25 — Privacy by Design. Required 99.5% recall for financial PII in customer-facing systems.' },
  { id: 'g2', name: 'Toxicity Filter', enabled: true, threshold: 'Score < 0.15', action: 'warn', justification: 'EU AI Act Art. 9 — Risk management. Toxicity threshold set to protect customer interactions.' },
  { id: 'g3', name: 'Hallucination Guard', enabled: true, threshold: 'Confidence > 0.95', action: 'block', justification: 'ISO 42001 Clause 8.4 — Raised from 0.80 to 0.95 (2026-04-05). Required 95% confidence for high-risk financial decisions per SOC 2 audit finding F-CF-002.' },
  { id: 'g4', name: 'Data Boundary Enforcement', enabled: true, threshold: 'Strict', action: 'block', justification: 'SOC 2 CC6.1 — Logical access controls. Zero-tolerance for data exfiltration to unauthorized endpoints.' },
  { id: 'g5', name: 'Prompt Injection Detection', enabled: true, threshold: 'BERT score > 0.75', action: 'block', justification: 'OWASP LLM01 — Prompt injection prevention. Required for all customer-facing LLM deployments.' },
  { id: 'g6', name: 'Sensitive Topic Filter', enabled: false, threshold: 'Category list v2', action: 'flag', justification: 'EU AI Act Art. 13 — Transparency. Disabled pending category list review (HITL-006).' },
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
  { id: 'fc4', primary: 'Claude-3-Haiku', fallback1: 'GPT-4o-Mini', fallback2: 'Mistral-7B', timeout: '10s' },
  { id: 'fc5', primary: 'Mistral-7B', fallback1: 'GPT-4o-Mini', fallback2: 'GPT-3.5-Turbo', timeout: '20s' },
  { id: 'fc6', primary: 'GPT-4o-Mini', fallback1: 'GPT-3.5-Turbo', fallback2: 'Claude-3-Haiku', timeout: '15s' },
];

const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { id: 'at1', metric: 'Trust Score Drop', threshold: '< 85%', severity: 'critical', enabled: true },
  { id: 'at2', metric: 'Guardrail Violation Rate', threshold: '> 5% of calls', severity: 'high', enabled: true },
  { id: 'at3', metric: 'Avg Latency Spike', threshold: '> 2000ms', severity: 'high', enabled: true },
  { id: 'at4', metric: 'Fallback Rate', threshold: '> 10% of calls', severity: 'medium', enabled: true },
  { id: 'at5', metric: 'Daily Cost Exceeded', threshold: 'Agent budget 100%', severity: 'critical', enabled: true },
  { id: 'at6', metric: 'Model Unavailability', threshold: '> 60s downtime', severity: 'critical', enabled: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionBadge(action: GuardrailConfig['action']) {
  const map = {
    block: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)' },
    warn: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)' },
    flag: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(220 90% 56%)' },
  };
  const s = map[action];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{action.charAt(0).toUpperCase() + action.slice(1)}</Badge>;
}

function severityBadge(severity: AlertThreshold['severity']) {
  const map = {
    critical: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)' },
    high: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)' },
    medium: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)' },
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
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Snapshot for dirty detection
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
    // Create diff entries
    if (guardrails.some((g, i) => JSON.stringify(g) !== JSON.stringify(savedSnapshot.guardrails[i]))) {
      createAuditEntry('Guardrails', 'Guardrail configuration updated', JSON.stringify(savedSnapshot.guardrails, null, 2), JSON.stringify(guardrails, null, 2));
    }
    if (costLimits.some((c, i) => JSON.stringify(c) !== JSON.stringify(savedSnapshot.costLimits[i]))) {
      createAuditEntry('Cost Limits', 'Agent cost limits updated', JSON.stringify(savedSnapshot.costLimits, null, 2), JSON.stringify(costLimits, null, 2));
    }
    if (fallbackChains.some((f, i) => JSON.stringify(f) !== JSON.stringify(savedSnapshot.fallbackChains[i]))) {
      createAuditEntry('Fallback Chains', 'Fallback chain configuration updated', JSON.stringify(savedSnapshot.fallbackChains, null, 2), JSON.stringify(fallbackChains, null, 2));
    }
    if (alertThresholds.some((a, i) => JSON.stringify(a) !== JSON.stringify(savedSnapshot.alertThresholds[i]))) {
      createAuditEntry('Alert Thresholds', 'Alert threshold configuration updated', JSON.stringify(savedSnapshot.alertThresholds, null, 2), JSON.stringify(alertThresholds, null, 2));
    }
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

  // Guardrail actions
  const toggleGuardrail = (id: string) => {
    setGuardrails(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
    markDirty();
  };
  const updateGuardrail = (id: string, field: keyof GuardrailConfig, value: string) => {
    setGuardrails(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    markDirty();
  };
  const deleteGuardrail = (id: string) => {
    const g = guardrails.find(g => g.id === id);
    setGuardrails(prev => prev.filter(g => g.id !== id));
    markDirty();
    toast(`Guardrail "${g?.name}" removed`);
  };
  const addGuardrail = () => {
    const id = `g${Date.now()}`;
    setGuardrails(prev => [...prev, { id, name: 'New Guardrail', enabled: false, threshold: '90%', action: 'warn', justification: '' }]);
    markDirty();
  };

  // Cost limit actions
  const updateCostLimit = (id: string, field: keyof CostLimit, value: string) => {
    setCostLimits(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    markDirty();
  };
  const deleteCostLimit = (id: string) => {
    const c = costLimits.find(c => c.id === id);
    setCostLimits(prev => prev.filter(c => c.id !== id));
    markDirty();
    toast(`Cost limit for "${c?.agent}" removed`);
  };
  const addCostLimit = () => {
    setCostLimits(prev => [...prev, { id: `cl${Date.now()}`, agent: 'New Agent', dailyLimit: '10', weeklyLimit: '50', alertAt: '80' }]);
    markDirty();
  };

  // Fallback chain actions
  const updateFallbackChain = (id: string, field: keyof FallbackChain, value: string) => {
    setFallbackChains(prev => prev.map(fc => fc.id === id ? { ...fc, [field]: value } : fc));
    markDirty();
  };
  const deleteFallbackChain = (id: string) => {
    const fc = fallbackChains.find(fc => fc.id === id);
    setFallbackChains(prev => prev.filter(fc => fc.id !== id));
    markDirty();
    toast(`Fallback chain for "${fc?.primary}" removed`);
  };
  const addFallbackChain = () => {
    setFallbackChains(prev => [...prev, { id: `fc${Date.now()}`, primary: 'New Model', fallback1: 'Claude-3-Haiku', fallback2: 'GPT-3.5-Turbo', timeout: '30s' }]);
    markDirty();
  };

  // Alert threshold actions
  const toggleAlert = (id: string) => {
    setAlertThresholds(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    markDirty();
  };
  const updateAlert = (id: string, field: keyof AlertThreshold, value: string) => {
    setAlertThresholds(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    markDirty();
  };
  const deleteAlert = (id: string) => {
    const a = alertThresholds.find(a => a.id === id);
    setAlertThresholds(prev => prev.filter(a => a.id !== id));
    markDirty();
    toast(`Alert threshold "${a?.metric}" removed`);
  };
  const addAlert = () => {
    setAlertThresholds(prev => [...prev, { id: `at${Date.now()}`, metric: 'New Metric', threshold: '> 10%', severity: 'medium', enabled: false }]);
    markDirty();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Toast layer */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? 'hsl(142 71% 45%)' : t.type === 'error' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)',
              color: '#fff', borderRadius: 0, minWidth: 300
            }}>{t.text}</div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Configuration</h1>
              <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                PRODUCTION
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Guardrails, cost limits, fallback chains, alert thresholds</p>
          </div>
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'hsl(45 93% 47%)' }}>
                <Warning size={14} />Unsaved changes
              </span>
            )}
            <Button variant="outline" onClick={() => setShowAuditLog(s => !s)} style={{ borderRadius: 0 }}>
              <Clock className="h-4 w-4 mr-2" />Audit Log ({auditLog.length})
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleReset} disabled={!dirty} style={{ borderRadius: 0 }}>
                  <ArrowCounterClockwise className="h-4 w-4 mr-2" />Reset to Last Saved
                </Button>
              </TooltipTrigger>
              <TooltipContent style={{ borderRadius: 0, maxWidth: 260 }}>
                Reverts all changes to the last successfully saved state. Does not reset to factory defaults.
              </TooltipContent>
            </Tooltip>
            <Button onClick={handleSave} disabled={!dirty} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              <FloppyDisk className="h-4 w-4 mr-2" />Save Configuration
            </Button>
          </div>
        </div>

        {/* Production Warning */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 0 }}>
          <Warning size={14} style={{ color: 'hsl(0 72% 51%)' }} />
          <p className="text-xs" style={{ color: 'hsl(0 72% 51%)' }}>
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

        {/* Default Guardrails */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: 'hsl(var(--brand))' }} />
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Default Guardrails</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={addGuardrail} style={{ borderRadius: 0, height: 28 }}>
                <Plus size={13} className="mr-1" />Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Guardrail', 'Threshold', 'Action', 'Justification / Regulatory Reference', 'Enabled', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guardrails.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Input value={g.name} onChange={e => updateGuardrail(g.id, 'name', e.target.value)}
                        className="h-7 text-xs font-medium w-48" style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={g.threshold} onChange={e => updateGuardrail(g.id, 'threshold', e.target.value)}
                        className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={g.action} onValueChange={v => { updateGuardrail(g.id, 'action', v); }}>
                        <SelectTrigger className="h-7 w-24 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['block', 'warn', 'flag'].map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Input value={g.justification} onChange={e => updateGuardrail(g.id, 'justification', e.target.value)}
                        className="h-7 text-xs w-72" style={{ borderRadius: 0 }} placeholder="Regulatory reference or business justification" />
                    </td>
                    <td className="px-4 py-2">
                      <Switch checked={g.enabled} onCheckedChange={() => toggleGuardrail(g.id)} />
                    </td>
                    <td className="px-4 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                            <Trash size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ borderRadius: 0 }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Guardrail</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{g.name}"? This will disable enforcement immediately. This action creates an audit entry.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteGuardrail(g.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Cost Limits */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CurrencyDollar size={16} style={{ color: 'hsl(var(--brand))' }} />
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost Limits per Agent</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={addCostLimit} style={{ borderRadius: 0, height: 28 }}>
                <Plus size={13} className="mr-1" />Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Agent', 'Daily Limit ($)', 'Weekly Limit ($)', 'Alert At (%)', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costLimits.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td className="px-4 py-2">
                      <Input value={c.agent} onChange={e => updateCostLimit(c.id, 'agent', e.target.value)}
                        className="h-7 text-xs font-medium w-48" style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={c.dailyLimit} onChange={e => updateCostLimit(c.id, 'dailyLimit', e.target.value)}
                        className="h-7 text-xs font-mono w-24" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={c.weeklyLimit} onChange={e => updateCostLimit(c.id, 'weeklyLimit', e.target.value)}
                        className="h-7 text-xs font-mono w-24" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={c.alertAt} onChange={e => updateCostLimit(c.id, 'alertAt', e.target.value)}
                        className="h-7 text-xs font-mono w-20" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                            <Trash size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ borderRadius: 0 }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Cost Limit</AlertDialogTitle>
                            <AlertDialogDescription>Remove cost limits for "{c.agent}"? This agent will have no spending restrictions.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCostLimit(c.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Fallback Chains */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitFork size={16} style={{ color: 'hsl(var(--brand))' }} />
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Chains</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={addFallbackChain} style={{ borderRadius: 0, height: 28 }}>
                <Plus size={13} className="mr-1" />Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Primary Model', '1st Fallback', '2nd Fallback', 'Timeout', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fallbackChains.map(fc => (
                  <tr key={fc.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Input value={fc.primary} onChange={e => updateFallbackChain(fc.id, 'primary', e.target.value)}
                        className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={fc.fallback1} onChange={e => updateFallbackChain(fc.id, 'fallback1', e.target.value)}
                        className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0, color: 'hsl(var(--brand))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={fc.fallback2} onChange={e => updateFallbackChain(fc.id, 'fallback2', e.target.value)}
                        className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0, color: 'hsl(var(--brand))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={fc.timeout} onChange={e => updateFallbackChain(fc.id, 'timeout', e.target.value)}
                        className="h-7 text-xs font-mono w-20" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                            <Trash size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ borderRadius: 0 }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fallback Chain</AlertDialogTitle>
                            <AlertDialogDescription>Delete the fallback chain for "{fc.primary}"? Agents using this model will have no fallback path.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFallbackChain(fc.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              <Button size="sm" variant="outline" onClick={addAlert} style={{ borderRadius: 0, height: 28 }}>
                <Plus size={13} className="mr-1" />Add Row
              </Button>
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
                  <tr key={a.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Input value={a.metric} onChange={e => updateAlert(a.id, 'metric', e.target.value)}
                        className="h-7 text-xs font-medium w-52" style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={a.threshold} onChange={e => updateAlert(a.id, 'threshold', e.target.value)}
                        className="h-7 text-xs font-mono w-36" style={{ borderRadius: 0 }} />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={a.severity} onValueChange={v => updateAlert(a.id, 'severity', v)}>
                        <SelectTrigger className="h-7 w-28 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['critical', 'high', 'medium'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Switch checked={a.enabled} onCheckedChange={() => toggleAlert(a.id)} />
                    </td>
                    <td className="px-4 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                            <Trash size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ borderRadius: 0 }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Alert Threshold</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{a.metric}" alert? You will no longer receive notifications for this condition.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAlert(a.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
