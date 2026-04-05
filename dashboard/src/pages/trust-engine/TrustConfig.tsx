import { useState } from 'react';
import { FloppyDisk, ArrowCounterClockwise, Warning, GearSix, ShieldCheck, CurrencyDollar, GitFork, Bell } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useSettingsStore } from '../../stores/settingsStore';

interface GuardrailConfig {
  id: string;
  name: string;
  enabled: boolean;
  threshold: string;
  action: 'block' | 'warn' | 'flag';
}

interface CostLimit {
  agent: string;
  dailyLimit: string;
  weeklyLimit: string;
  alertAt: string;
}

interface FallbackChain {
  id: string;
  primary: string;
  fallback1: string;
  fallback2: string;
  timeout: string;
}

interface AlertThreshold {
  metric: string;
  threshold: string;
  severity: 'critical' | 'high' | 'medium';
  enabled: boolean;
}

const DEFAULT_GUARDRAILS: GuardrailConfig[] = [
  { id: 'g1', name: 'PII Detection & Redaction', enabled: true, threshold: '99.5% recall', action: 'block' },
  { id: 'g2', name: 'Toxicity Filter', enabled: true, threshold: 'Score < 0.15', action: 'warn' },
  { id: 'g3', name: 'Hallucination Guard', enabled: true, threshold: 'Confidence > 0.80', action: 'block' },
  { id: 'g4', name: 'Data Boundary Enforcement', enabled: true, threshold: 'Strict', action: 'block' },
  { id: 'g5', name: 'Prompt Injection Detection', enabled: true, threshold: 'BERT score > 0.75', action: 'block' },
  { id: 'g6', name: 'Sensitive Topic Filter', enabled: false, threshold: 'Category list v2', action: 'flag' },
];

const DEFAULT_COST_LIMITS: CostLimit[] = [
  { agent: 'OpenAI-API-Connector', dailyLimit: '50', weeklyLimit: '250', alertAt: '80' },
  { agent: 'DataLabeler-v2', dailyLimit: '30', weeklyLimit: '150', alertAt: '85' },
  { agent: 'LoanAssistant', dailyLimit: '20', weeklyLimit: '100', alertAt: '90' },
  { agent: 'ComplianceBot', dailyLimit: '10', weeklyLimit: '50', alertAt: '80' },
];

const DEFAULT_FALLBACK_CHAINS: FallbackChain[] = [
  { id: 'fc1', primary: 'GPT-4o', fallback1: 'Claude-3-Sonnet', fallback2: 'GPT-3.5-Turbo', timeout: '30s' },
  { id: 'fc2', primary: 'Claude-3-Opus', fallback1: 'Claude-3-Sonnet', fallback2: 'Claude-3-Haiku', timeout: '45s' },
  { id: 'fc3', primary: 'GPT-4-Turbo', fallback1: 'GPT-4o', fallback2: 'Mistral-7B', timeout: '30s' },
];

const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { metric: 'Trust Score Drop', threshold: '< 85%', severity: 'critical', enabled: true },
  { metric: 'Guardrail Violation Rate', threshold: '> 5% of calls', severity: 'high', enabled: true },
  { metric: 'Avg Latency Spike', threshold: '> 2000ms', severity: 'high', enabled: true },
  { metric: 'Fallback Rate', threshold: '> 10% of calls', severity: 'medium', enabled: true },
  { metric: 'Daily Cost Exceeded', threshold: 'Agent budget 100%', severity: 'critical', enabled: true },
  { metric: 'Model Unavailability', threshold: '> 60s downtime', severity: 'critical', enabled: false },
];

function actionBadge(action: GuardrailConfig['action']) {
  const map = { block: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)' }, warn: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)' }, flag: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(220 90% 56%)' } };
  const s = map[action];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{action.charAt(0).toUpperCase() + action.slice(1)}</Badge>;
}

export default function TrustConfig() {
  const { orgName } = useSettingsStore();
  const [guardrails, setGuardrails] = useState<GuardrailConfig[]>(DEFAULT_GUARDRAILS);
  const [costLimits, setCostLimits] = useState<CostLimit[]>(DEFAULT_COST_LIMITS);
  const [fallbackChains] = useState<FallbackChain[]>(DEFAULT_FALLBACK_CHAINS);
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>(DEFAULT_ALERT_THRESHOLDS);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const markDirty = () => { setDirty(true); setSaved(false); };

  const toggleGuardrail = (id: string) => {
    setGuardrails(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
    markDirty();
  };

  const updateCostLimit = (agent: string, field: keyof CostLimit, value: string) => {
    setCostLimits(prev => prev.map(c => c.agent === agent ? { ...c, [field]: value } : c));
    markDirty();
  };

  const toggleAlert = (metric: string) => {
    setAlertThresholds(prev => prev.map(a => a.metric === metric ? { ...a, enabled: !a.enabled } : a));
    markDirty();
  };

  const handleSave = () => { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 3000); };
  const handleReset = () => {
    setGuardrails(DEFAULT_GUARDRAILS);
    setCostLimits(DEFAULT_COST_LIMITS);
    setAlertThresholds(DEFAULT_ALERT_THRESHOLDS);
    setDirty(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Configuration</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Guardrails, cost limits, fallback chains, alert thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'hsl(45 93% 47%)' }}>
              <Warning size={14} />Unsaved changes
            </span>
          )}
          {saved && (
            <span className="text-xs font-medium" style={{ color: 'hsl(142 71% 45%)' }}>Configuration saved</span>
          )}
          <Button variant="outline" onClick={handleReset} style={{ borderRadius: 0 }}>
            <ArrowCounterClockwise className="h-4 w-4 mr-2" />Reset
          </Button>
          <Button onClick={handleSave} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <FloppyDisk className="h-4 w-4 mr-2" />Save
          </Button>
        </div>
      </div>

      {/* Default Guardrails */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: 'hsl(var(--brand))' }} />
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Default Guardrails</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Guardrail', 'Threshold', 'Action', 'Enabled'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guardrails.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'hsl(var(--text-1))' }}>{g.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{g.threshold}</td>
                  <td className="px-4 py-3">{actionBadge(g.action)}</td>
                  <td className="px-4 py-3"><Switch checked={g.enabled} onCheckedChange={() => toggleGuardrail(g.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Cost Limits */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CurrencyDollar size={16} style={{ color: 'hsl(var(--brand))' }} />
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost Limits per Agent</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Agent', 'Daily Limit ($)', 'Weekly Limit ($)', 'Alert At (%)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costLimits.map(c => (
                <tr key={c.agent} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{c.agent}</td>
                  <td className="px-4 py-2">
                    <Input value={c.dailyLimit} onChange={e => updateCostLimit(c.agent, 'dailyLimit', e.target.value)} className="w-24 h-7 text-xs font-mono" style={{ borderRadius: 0 }} />
                  </td>
                  <td className="px-4 py-2">
                    <Input value={c.weeklyLimit} onChange={e => updateCostLimit(c.agent, 'weeklyLimit', e.target.value)} className="w-24 h-7 text-xs font-mono" style={{ borderRadius: 0 }} />
                  </td>
                  <td className="px-4 py-2">
                    <Input value={c.alertAt} onChange={e => updateCostLimit(c.agent, 'alertAt', e.target.value)} className="w-20 h-7 text-xs font-mono" style={{ borderRadius: 0 }} />
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
          <div className="flex items-center gap-2">
            <GitFork size={16} style={{ color: 'hsl(var(--brand))' }} />
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Chains</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Primary Model', '1st Fallback', '2nd Fallback', 'Timeout'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fallbackChains.map(fc => (
                <tr key={fc.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-1))' }}>{fc.primary}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{fc.fallback1}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{fc.fallback2}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fc.timeout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: 'hsl(var(--brand))' }} />
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Alert Thresholds</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Metric', 'Threshold', 'Severity', 'Enabled'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alertThresholds.map(a => (
                <tr key={a.metric} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'hsl(var(--text-1))' }}>{a.metric}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.threshold}</td>
                  <td className="px-4 py-3">
                    <Badge style={{
                      background: a.severity === 'critical' ? 'hsl(0 72% 51% / 0.15)' : a.severity === 'high' ? 'hsl(25 95% 53% / 0.15)' : 'hsl(45 93% 47% / 0.15)',
                      color: a.severity === 'critical' ? 'hsl(0 72% 51%)' : a.severity === 'high' ? 'hsl(25 95% 53%)' : 'hsl(45 93% 47%)',
                      borderRadius: 0, fontSize: 11
                    }}>
                      {a.severity.charAt(0).toUpperCase() + a.severity.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><Switch checked={a.enabled} onCheckedChange={() => toggleAlert(a.metric)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
