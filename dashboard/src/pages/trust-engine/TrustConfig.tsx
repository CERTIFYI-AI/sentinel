// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Trust Engine Configuration. Two real backends, one page:
//   • Global sections (settings, guardrail toggles, thresholds, alert
//     thresholds, fallback chains, integrations) live in the org-scoped
//     trust_config doc (single 'default' document) via trustConfigCrud.
//   • Per-Model Config edits the org-scoped model_trust_configs table,
//     uuid-keyed to ai_models (names resolved at render time).
// Saves resolve before any success toast; failures keep the dirty state.
// Secrets are NEVER stored in the config doc — API keys belong in the
// Keys Vault module.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FloppyDisk, ArrowCounterClockwise, Warning, ShieldCheck, Bell, Plus, Trash,
  Gear, Sliders, PlugsConnected, SlidersHorizontal, Globe, Cpu, PencilSimple,
  Clock, Key, GitFork,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { trustConfigCrud } from '@/hooks/queries/useTrustEngineCrud';
import { useModelTrustConfigs } from '@/hooks/useModelTrustConfigs';
import { useTrustPolicies } from '@/hooks/useTrustPolicies';
import { useModelOptions } from '@/hooks/useAiiaData';
import { useAuthStore } from '@/store/authStore';
import type { ModelTrustConfig } from '@/services/modelTrustConfigService';

// ── Doc section types ─────────────────────────────────────────────────────────

interface GlobalSettings {
  piiEnabled: boolean;
  piiSensitivity: number;
  /** Max toxicity score, 0–1. */
  toxicityThreshold: number;
  hallucinationEnabled: boolean;
  hallucinationMethod: string;
  costDailyUsd: string;
  costWeeklyUsd: string;
  costMonthlyUsd: string;
}
interface GuardrailConfig {
  id: string; name: string; enabled: boolean; threshold: string;
  action: 'block' | 'warn' | 'flag'; justification: string;
}
interface ThresholdRow {
  id: string; policy: string; current: string; recommended: string; framework: string; status: 'meets' | 'below';
}
interface AlertThreshold {
  id: string; metric: string; threshold: string; severity: 'critical' | 'high' | 'medium'; enabled: boolean;
}
interface FallbackChain {
  id: string;
  /** Canonical ai_models.id uuids — names resolved at render time. */
  primaryModelId: string;
  fallbackModelIds: string[];
  timeoutSec: string;
}
interface IntegrationConfig {
  id: string; name: string; kind: 'webhook' | 'api_key'; enabled: boolean;
  /** Non-secret config only. Secrets live in the Keys Vault. */
  webhookUrl: string;
}

// ── Defaults (configuration presets for a fresh org — not fabricated metrics) ─

const DEFAULT_GLOBAL: GlobalSettings = {
  piiEnabled: true, piiSensitivity: 95, toxicityThreshold: 0.15,
  hallucinationEnabled: true, hallucinationMethod: 'confidence',
  costDailyUsd: '200', costWeeklyUsd: '1000', costMonthlyUsd: '3500',
};

const DEFAULT_GUARDRAILS: GuardrailConfig[] = [
  { id: 'g1', name: 'PII Detection & Redaction', enabled: true, threshold: '99.5% recall', action: 'block', justification: 'GDPR Art. 25 — Privacy by Design.' },
  { id: 'g2', name: 'Toxicity Filter', enabled: true, threshold: 'Score < 0.15', action: 'warn', justification: 'EU AI Act Art. 9 — Risk management.' },
  { id: 'g3', name: 'Hallucination Guard', enabled: true, threshold: 'Confidence > 0.95', action: 'block', justification: 'ISO 42001 Clause 8.4.' },
  { id: 'g4', name: 'Data Boundary Enforcement', enabled: true, threshold: 'Strict', action: 'block', justification: 'SOC 2 CC6.1 — Logical access controls.' },
  { id: 'g5', name: 'Prompt Injection Detection', enabled: true, threshold: 'BERT score > 0.75', action: 'block', justification: 'OWASP LLM01.' },
  { id: 'g6', name: 'Sensitive Topic Filter', enabled: false, threshold: 'Category list v2', action: 'flag', justification: 'EU AI Act Art. 13 — Disabled pending review.' },
];

const DEFAULT_THRESHOLDS: ThresholdRow[] = [
  { id: 'th1', policy: 'PII Detection & Redaction', current: '99.5%', recommended: '99.5%', framework: 'GDPR Art. 25', status: 'meets' },
  { id: 'th2', policy: 'Toxicity & Safety Filter', current: '< 0.15', recommended: '< 0.10', framework: 'EU AI Act Art. 9', status: 'below' },
  { id: 'th3', policy: 'Hallucination Guard', current: '> 0.95', recommended: '> 0.95', framework: 'ISO 42001 Cl. 8.4', status: 'meets' },
  { id: 'th4', policy: 'Data Boundary Enforcement', current: 'Strict', recommended: 'Strict', framework: 'SOC 2 CC6.1', status: 'meets' },
  { id: 'th5', policy: 'Cost & Rate Limiter', current: '100%', recommended: '90%', framework: 'ISO 42001 Cl. 9.1', status: 'below' },
];

const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { id: 'at1', metric: 'Trust Score Drop', threshold: '< 85%', severity: 'critical', enabled: true },
  { id: 'at2', metric: 'Guardrail Violation Rate', threshold: '> 5% of calls', severity: 'high', enabled: true },
  { id: 'at3', metric: 'Avg Latency Spike', threshold: '> 2000ms', severity: 'high', enabled: true },
  { id: 'at4', metric: 'Fallback Rate', threshold: '> 10% of calls', severity: 'medium', enabled: true },
  { id: 'at5', metric: 'Daily Cost Exceeded', threshold: 'Budget 100%', severity: 'critical', enabled: true },
  { id: 'at6', metric: 'Model Unavailability', threshold: '> 60s downtime', severity: 'critical', enabled: false },
];

const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  { id: 'int-slack', name: 'Slack', kind: 'webhook', enabled: false, webhookUrl: '' },
  { id: 'int-jira', name: 'Jira', kind: 'api_key', enabled: false, webhookUrl: '' },
  { id: 'int-pagerduty', name: 'PagerDuty', kind: 'webhook', enabled: false, webhookUrl: '' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityBadge(severity: AlertThreshold['severity']) {
  const map = {
    critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    high: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    medium: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = map[severity] ?? map.medium;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
}

interface PerModelForm {
  id?: string;
  modelId: string;
  toxicityThreshold: string;
  hallucinationThreshold: string;
  piiDetectionEnabled: boolean;
  jailbreakDetection: boolean;
  outputFiltering: boolean;
  costAlertUsd: string;
  tokenLimitPerReq: string;
  rateLimitRpm: string;
  fallbackModelId: string;
  blockedTopics: string;
  allowedTopics: string;
}
const EMPTY_PER_MODEL_FORM: PerModelForm = {
  modelId: '', toxicityThreshold: '0.80', hallucinationThreshold: '0.70',
  piiDetectionEnabled: true, jailbreakDetection: true, outputFiltering: true,
  costAlertUsd: '', tokenLimitPerReq: '4096', rateLimitRpm: '60',
  fallbackModelId: '', blockedTopics: '', allowedTopics: '',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrustConfig() {
  const currentUser = useAuthStore(s => s.user);

  // Global doc state -----------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState<number | undefined>(undefined);
  /** Unknown doc keys (e.g. alertNotifications written by Runtime Trust) preserved across saves. */
  const [docExtras, setDocExtras] = useState<Record<string, unknown>>({});

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL);
  const [guardrails, setGuardrails] = useState<GuardrailConfig[]>(DEFAULT_GUARDRAILS);
  const [thresholds, setThresholds] = useState<ThresholdRow[]>(DEFAULT_THRESHOLDS);
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>(DEFAULT_ALERT_THRESHOLDS);
  const [fallbackChains, setFallbackChains] = useState<FallbackChain[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(DEFAULT_INTEGRATIONS);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState({
    globalSettings: DEFAULT_GLOBAL, guardrails: DEFAULT_GUARDRAILS, thresholds: DEFAULT_THRESHOLDS,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS, fallbackChains: [] as FallbackChain[], integrations: DEFAULT_INTEGRATIONS,
  });

  const markDirty = () => setDirty(true);

  // Real backends for the Per-Model tab ---------------------------------------
  const { data: modelConfigs, isLoading: configsLoading, error: configsError, save: saveConfig, remove: removeConfig } = useModelTrustConfigs();
  const { data: policies } = useTrustPolicies();
  const { models } = useModelOptions();
  const modelName = (id: string | null | undefined) => (id ? models.find(m => m.id === id)?.name : undefined);

  const [perModelFormOpen, setPerModelFormOpen] = useState(false);
  const [perModelForm, setPerModelForm] = useState<PerModelForm>(EMPTY_PER_MODEL_FORM);

  // Hydrate the persisted configuration document.
  const hydrate = () => {
    setLoading(true);
    setLoadError(null);
    trustConfigCrud.get('default')
      .then(doc => {
        const d = doc as any;
        const next = {
          globalSettings: { ...DEFAULT_GLOBAL, ...(d?.globalSettings ?? {}) } as GlobalSettings,
          guardrails: (Array.isArray(d?.guardrails) && d.guardrails.length ? d.guardrails : DEFAULT_GUARDRAILS) as GuardrailConfig[],
          thresholds: (Array.isArray(d?.thresholds) && d.thresholds.length ? d.thresholds : DEFAULT_THRESHOLDS) as ThresholdRow[],
          alertThresholds: (Array.isArray(d?.alertThresholds) && d.alertThresholds.length ? d.alertThresholds : DEFAULT_ALERT_THRESHOLDS) as AlertThreshold[],
          fallbackChains: (Array.isArray(d?.fallbackChains) ? d.fallbackChains.filter((fc: any) => typeof fc?.primaryModelId === 'string') : []) as FallbackChain[],
          integrations: (Array.isArray(d?.integrations) && d.integrations.length ? d.integrations : DEFAULT_INTEGRATIONS) as IntegrationConfig[],
        };
        setGlobalSettings(next.globalSettings);
        setGuardrails(next.guardrails);
        setThresholds(next.thresholds);
        setAlertThresholds(next.alertThresholds);
        setFallbackChains(next.fallbackChains);
        setIntegrations(next.integrations);
        setSnapshot(next);
        setDocVersion(d?.version);
        if (d) {
          const { id: _id, version: _v, globalSettings: _g, guardrails: _gr, thresholds: _t, alertThresholds: _a, fallbackChains: _f, integrations: _i, costLimits: _legacy, ...extras } = d;
          setDocExtras(extras);
        }
        setDirty(false);
        setLoading(false);
      })
      .catch((e: Error) => {
        setLoadError(e.message);
        setLoading(false);
      });
  };
  useEffect(hydrate, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await trustConfigCrud.upsert({
        ...docExtras,
        id: 'default',
        version: docVersion,
        globalSettings, guardrails, thresholds, alertThresholds, fallbackChains, integrations,
      } as any);
      // Success only after the upsert resolves.
      setSnapshot({ globalSettings, guardrails, thresholds, alertThresholds, fallbackChains, integrations });
      setDocVersion((saved as any)?.version);
      setDirty(false);
      toast.success('Configuration saved — recorded in the platform Audit Log');
    } catch (e) {
      // Keep the dirty state so nothing looks saved when it is not.
      toast.error(`Failed to save configuration: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGlobalSettings(snapshot.globalSettings);
    setGuardrails([...snapshot.guardrails]);
    setThresholds([...snapshot.thresholds]);
    setAlertThresholds([...snapshot.alertThresholds]);
    setFallbackChains([...snapshot.fallbackChains]);
    setIntegrations([...snapshot.integrations]);
    setDirty(false);
    toast.info('Configuration reset to last saved state');
  };

  // Doc-section CRUD handlers ---------------------------------------------------
  const updateGlobal = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value })); markDirty();
  };
  const toggleGuardrail = (id: string) => { setGuardrails(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g)); markDirty(); };
  const updateGuardrail = (id: string, field: keyof GuardrailConfig, value: string) => { setGuardrails(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g)); markDirty(); };
  const deleteGuardrail = (id: string) => { setGuardrails(prev => prev.filter(g => g.id !== id)); markDirty(); };
  const addGuardrail = () => { setGuardrails(prev => [...prev, { id: `g${Date.now()}`, name: 'New Guardrail', enabled: false, threshold: '90%', action: 'warn', justification: '' }]); markDirty(); };
  const toggleAlert = (id: string) => { setAlertThresholds(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)); markDirty(); };
  const deleteAlert = (id: string) => { setAlertThresholds(prev => prev.filter(a => a.id !== id)); markDirty(); };
  const addFallbackChain = () => {
    if (models.length === 0) { toast.error('No registry models available'); return; }
    setFallbackChains(prev => [...prev, { id: `fc${Date.now()}`, primaryModelId: '', fallbackModelIds: [], timeoutSec: '30' }]);
    markDirty();
  };
  const updateChain = (id: string, patch: Partial<FallbackChain>) => { setFallbackChains(prev => prev.map(fc => fc.id === id ? { ...fc, ...patch } : fc)); markDirty(); };
  const deleteChain = (id: string) => { setFallbackChains(prev => prev.filter(fc => fc.id !== id)); markDirty(); };
  const toggleIntegration = (id: string) => { setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i)); markDirty(); };
  const updateIntegration = (id: string, patch: Partial<IntegrationConfig>) => { setIntegrations(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i)); markDirty(); };

  // Per-model handlers ----------------------------------------------------------
  const unconfiguredModels = useMemo(
    () => models.filter(m => !modelConfigs.some(c => c.modelId === m.id)),
    [models, modelConfigs],
  );

  function openPerModelCreate() {
    setPerModelForm(EMPTY_PER_MODEL_FORM);
    setPerModelFormOpen(true);
  }
  function openPerModelEdit(c: ModelTrustConfig) {
    setPerModelForm({
      id: c.id,
      modelId: c.modelId,
      toxicityThreshold: String(c.toxicityThreshold),
      hallucinationThreshold: String(c.hallucinationThreshold),
      piiDetectionEnabled: c.piiDetectionEnabled,
      jailbreakDetection: c.jailbreakDetection,
      outputFiltering: c.outputFiltering,
      costAlertUsd: c.costAlertUsd === null ? '' : String(c.costAlertUsd),
      tokenLimitPerReq: String(c.tokenLimitPerReq),
      rateLimitRpm: String(c.rateLimitRpm),
      fallbackModelId: c.fallbackModelId ?? '',
      blockedTopics: c.blockedTopics.join(', '),
      allowedTopics: c.allowedTopics.join(', '),
    });
    setPerModelFormOpen(true);
  }

  async function submitPerModel() {
    if (!perModelForm.modelId) { toast.error('A registry model is required'); return; }
    const num = (v: string, label: string, allowEmpty = false): number | null => {
      if (v.trim() === '') { if (allowEmpty) return null; throw new Error(`${label} is required`); }
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`${label} must be a number`);
      return n;
    };
    try {
      const rec: Partial<ModelTrustConfig> = {
        id: perModelForm.id,
        modelId: perModelForm.modelId,
        toxicityThreshold: num(perModelForm.toxicityThreshold, 'Toxicity threshold')!,
        hallucinationThreshold: num(perModelForm.hallucinationThreshold, 'Hallucination threshold')!,
        piiDetectionEnabled: perModelForm.piiDetectionEnabled,
        jailbreakDetection: perModelForm.jailbreakDetection,
        outputFiltering: perModelForm.outputFiltering,
        costAlertUsd: num(perModelForm.costAlertUsd, 'Cost alert', true),
        tokenLimitPerReq: num(perModelForm.tokenLimitPerReq, 'Token limit')!,
        rateLimitRpm: num(perModelForm.rateLimitRpm, 'Rate limit')!,
        fallbackModelId: perModelForm.fallbackModelId || null,
        blockedTopics: perModelForm.blockedTopics.split(',').map(s => s.trim()).filter(Boolean),
        allowedTopics: perModelForm.allowedTopics.split(',').map(s => s.trim()).filter(Boolean),
      };
      const saved = await saveConfig.mutateAsync(rec);
      toast.success(`Trust config for ${modelName(saved.modelId) ?? 'model'} ${perModelForm.id ? 'updated' : 'created'}`);
      setPerModelFormOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function deletePerModel(c: ModelTrustConfig) {
    try {
      await removeConfig.mutateAsync(c.id);
      toast.success(`Trust config for ${modelName(c.modelId) ?? 'model'} removed`);
    } catch (e) {
      toast.error(`Failed to remove config: ${(e as Error).message}`);
    }
  }

  if (loading) return <PageSkeleton title="Trust Configuration" />;

  return (
    <div className="space-y-6">

      <PageHeader
        title="Trust Configuration"
        subtitle="Global guardrail settings, thresholds, fallback chains and per-model trust controls"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Runtime Trust', href: '/trust-engine' }, { label: 'Configuration' }]}
        actions={
          <div className="flex items-center gap-3">
            {dirty && <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}><Warning size={14} />Unsaved changes</span>}
            <Button variant="outline" onClick={handleReset} disabled={!dirty || saving} style={{ borderRadius: 0 }}>
              <ArrowCounterClockwise className="h-4 w-4" />Reset to Last Saved
            </Button>
            <Button onClick={handleSave} disabled={!dirty} loading={saving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <FloppyDisk className="h-4 w-4" />Save Configuration
            </Button>
          </div>
        }
      />

      {/* Load error state with retry */}
      {loadError && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load configuration</p>
            <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{loadError} — editing defaults; saving may overwrite the stored configuration.</p>
          </div>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={hydrate}>Retry</Button>
        </div>
      )}

      {/* Audit trail note — real entries live in the platform Audit Log module */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <Clock size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0 }} />
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          Every save is recorded in the platform{' '}
          <Link to="/audit-trail" className="underline" style={{ color: 'hsl(var(--brand))' }}>Audit Log</Link>
          {currentUser ? <> as <strong>{currentUser.name || currentUser.email}</strong></> : null}.
        </p>
      </div>

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
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Detect and redact PII in all model inputs/outputs</p>
                </div>
                <Switch checked={globalSettings.piiEnabled} onCheckedChange={v => updateGlobal('piiEnabled', v)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Sensitivity: {globalSettings.piiSensitivity}%</label>
                <input type="range" min={50} max={100} value={globalSettings.piiSensitivity}
                  onChange={e => updateGlobal('piiSensitivity', Number(e.target.value))} className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Toxicity */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Toxicity Threshold</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Max Toxicity Score: {globalSettings.toxicityThreshold.toFixed(2)}</label>
              <input type="range" min={5} max={30} value={Math.round(globalSettings.toxicityThreshold * 100)}
                onChange={e => updateGlobal('toxicityThreshold', Number(e.target.value) / 100)} className="w-full" />
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
                <Switch checked={globalSettings.hallucinationEnabled} onCheckedChange={v => updateGlobal('hallucinationEnabled', v)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Detection Method</label>
                <Select value={globalSettings.hallucinationMethod} onValueChange={v => updateGlobal('hallucinationMethod', v)}>
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
                {([
                  ['costDailyUsd', 'Daily Limit ($)'],
                  ['costWeeklyUsd', 'Weekly Limit ($)'],
                  ['costMonthlyUsd', 'Monthly Limit ($)'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>{label}</label>
                    <Input value={globalSettings[key]} onChange={e => updateGlobal(key, e.target.value)} style={{ borderRadius: 0 }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Guardrail toggles */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} style={{ color: 'hsl(var(--brand))' }} />
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Default Guardrails</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={addGuardrail} style={{ borderRadius: 0, height: 28 }}><Plus size={13} />Add Row</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
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
                              <AlertDialogHeader><AlertDialogTitle>Delete Guardrail</AlertDialogTitle><AlertDialogDescription>Delete "{g.name}"? The change persists when you save the configuration.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteGuardrail(g.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fallback chains — registry-keyed */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitFork size={16} style={{ color: 'hsl(var(--brand))' }} />
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Chains</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={addFallbackChain} style={{ borderRadius: 0, height: 28 }}><Plus size={13} />Add Chain</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fallbackChains.length === 0 ? (
                <p className="px-4 py-8 text-xs text-center" style={{ color: 'hsl(var(--text-4))' }}>
                  No fallback chains configured. Chains route traffic to a registry fallback model when the primary fails.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Primary Model', 'Fallback 1', 'Fallback 2', 'Timeout (s)', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fallbackChains.map(fc => (
                        <tr key={fc.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td className="px-4 py-2">
                            <Select value={fc.primaryModelId || undefined} onValueChange={v => updateChain(fc.id, { primaryModelId: v })}>
                              <SelectTrigger className="h-7 w-48 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Select model…" /></SelectTrigger>
                              <SelectContent style={{ borderRadius: 0 }}>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          {[0, 1].map(idx => (
                            <td key={idx} className="px-4 py-2">
                              <Select
                                value={fc.fallbackModelIds[idx] ?? '__none'}
                                onValueChange={v => {
                                  const next = [...fc.fallbackModelIds];
                                  if (v === '__none') next.splice(idx, 1);
                                  else next[idx] = v;
                                  updateChain(fc.id, { fallbackModelIds: next.filter(Boolean) });
                                }}
                              >
                                <SelectTrigger className="h-7 w-44 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent style={{ borderRadius: 0 }}>
                                  <SelectItem value="__none">None</SelectItem>
                                  {models.filter(m => m.id !== fc.primaryModelId).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            <Input value={fc.timeoutSec} onChange={e => updateChain(fc.id, { timeoutSec: e.target.value })} className="h-7 text-xs font-mono w-16" style={{ borderRadius: 0 }} />
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteChain(fc.id)}><Trash size={13} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Per-Model Config — real model_trust_configs rows */}
        <TabsContent value="per-model" className="space-y-4">
          {configsError && (
            <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
              <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load per-model configs</p>
              <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{configsError.message}</p>
            </div>
          )}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Per-Model Trust Configuration</CardTitle>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                    Model-specific overrides, keyed to the model registry. Changes save directly to the database.
                  </p>
                </div>
                <Button size="sm" onClick={openPerModelCreate} disabled={unconfiguredModels.length === 0}
                  style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                  <Plus size={13} />Add Model Config
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {configsLoading ? (
                <p className="px-4 py-8 text-xs text-center" style={{ color: 'hsl(var(--text-4))' }}>Loading…</p>
              ) : modelConfigs.length === 0 ? (
                <div className="py-12 text-center">
                  <SlidersHorizontal size={28} className="mx-auto mb-2 text-[hsl(var(--text-4))]" />
                  <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>No per-model trust configurations yet.</p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Add a registry model to give it model-specific guardrail thresholds and limits.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Model', 'Toxicity ≤', 'Hallucination ≤', 'PII', 'Jailbreak', 'Output Filter', 'Cost Alert', 'Tokens/Req', 'RPM', 'Fallback Model', 'Linked Policies', ''].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modelConfigs.map(c => {
                        const linked = policies.filter(p => p.linkedModels.includes(c.modelId));
                        const name = modelName(c.modelId);
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {name ? (
                                <Link to={`/models/inventory/${c.modelId}`}
                                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 hover:underline"
                                  style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                                  <Cpu size={11} />{name}
                                </Link>
                              ) : (
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{c.toxicityThreshold}</td>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{c.hallucinationThreshold}</td>
                            {[c.piiDetectionEnabled, c.jailbreakDetection, c.outputFiltering].map((flag, i) => (
                              <td key={i} className="px-3 py-2.5">
                                <Badge style={{
                                  background: flag ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))',
                                  color: flag ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                                  borderRadius: 0, fontSize: 9,
                                }}>{flag ? 'On' : 'Off'}</Badge>
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{c.costAlertUsd === null ? '—' : `$${c.costAlertUsd}`}</td>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{c.tokenLimitPerReq}</td>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{c.rateLimitRpm}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {c.fallbackModelId ? (
                                modelName(c.fallbackModelId) ? (
                                  <Link to={`/models/inventory/${c.fallbackModelId}`} className="text-xs hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                                    {modelName(c.fallbackModelId)}
                                  </Link>
                                ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                              ) : (
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {linked.length === 0
                                  ? <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>
                                  : linked.map(p => (
                                    <span key={p.id} title={p.name}>
                                      <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 9 }}>
                                        {p.policyRef}
                                      </Badge>
                                    </span>
                                  ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <Button aria-label="Edit config" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openPerModelEdit(c)}>
                                  <PencilSimple size={13} style={{ color: 'hsl(var(--text-4))' }} />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button aria-label="Delete config" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash size={13} /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent style={{ borderRadius: 0 }}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Model Config</AlertDialogTitle>
                                      <AlertDialogDescription>Remove the trust configuration for {name ?? 'this model'}? The model falls back to global settings.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deletePerModel(c)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              <div className="overflow-x-auto">
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
                            background: th.status === 'meets' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-wn-bg))',
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
              </div>
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
              <div className="overflow-x-auto">
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
                              <AlertDialogHeader><AlertDialogTitle>Delete Alert</AlertDialogTitle><AlertDialogDescription>Remove this alert threshold? The change persists when you save the configuration.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAlert(a.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Integrations — non-secret config only */}
        <TabsContent value="integrations" className="space-y-4">
          {integrations.map(int => (
            <Card key={int.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Globe size={18} style={{ color: 'hsl(var(--brand))' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{int.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{int.kind === 'webhook' ? 'Webhook' : 'API Key'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={int.enabled} onCheckedChange={() => toggleIntegration(int.id)} />
                    <Badge style={{
                      background: int.enabled ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))',
                      color: int.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                      borderRadius: 0, fontSize: 10,
                    }}>
                      {int.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                {int.enabled && (
                  <div className="space-y-3">
                    {int.kind === 'webhook' ? (
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Webhook URL</label>
                        <Input
                          value={int.webhookUrl}
                          onChange={e => updateIntegration(int.id, { webhookUrl: e.target.value })}
                          style={{ borderRadius: 0 }}
                          placeholder="https://hooks.example.com/…"
                        />
                        <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                          If this URL contains a secret token, store it in the{' '}
                          <Link to="/security/keys" className="underline" style={{ color: 'hsl(var(--brand))' }}>Keys Vault</Link> instead.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <Key size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          API keys and secrets are never stored in this configuration. Manage the {int.name} credential in the{' '}
                          <Link to="/security/keys" className="underline" style={{ color: 'hsl(var(--brand))' }}>Keys Vault</Link> module.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled style={{ borderRadius: 0 }}>
                        Test Connection
                      </Button>
                      <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>Connection testing is not yet available.</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Per-Model Config create/edit dialog */}
      <Dialog open={perModelFormOpen} onOpenChange={setPerModelFormOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              {perModelForm.id
                ? `Edit Trust Config — ${modelName(perModelForm.modelId) ?? 'Unavailable'}`
                : 'Add Model Trust Config'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[62vh] overflow-y-auto pr-1">
            {!perModelForm.id && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Registry Model *</label>
                <Select value={perModelForm.modelId || undefined} onValueChange={v => setPerModelForm({ ...perModelForm, modelId: v })}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select registry model…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {unconfiguredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Toxicity Threshold (0–1)</label>
                <Input value={perModelForm.toxicityThreshold} onChange={e => setPerModelForm({ ...perModelForm, toxicityThreshold: e.target.value })} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Hallucination Threshold (0–1)</label>
                <Input value={perModelForm.hallucinationThreshold} onChange={e => setPerModelForm({ ...perModelForm, hallucinationThreshold: e.target.value })} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Cost Alert ($/day, optional)</label>
                <Input value={perModelForm.costAlertUsd} onChange={e => setPerModelForm({ ...perModelForm, costAlertUsd: e.target.value })} style={{ borderRadius: 0 }} placeholder="e.g., 25" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Token Limit / Request</label>
                <Input value={perModelForm.tokenLimitPerReq} onChange={e => setPerModelForm({ ...perModelForm, tokenLimitPerReq: e.target.value })} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Rate Limit (RPM)</label>
                <Input value={perModelForm.rateLimitRpm} onChange={e => setPerModelForm({ ...perModelForm, rateLimitRpm: e.target.value })} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Fallback Model</label>
                <Select
                  value={perModelForm.fallbackModelId || '__none'}
                  onValueChange={v => setPerModelForm({ ...perModelForm, fallbackModelId: v === '__none' ? '' : v })}
                >
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="__none">None</SelectItem>
                    {models.filter(m => m.id !== perModelForm.modelId).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {([
              ['piiDetectionEnabled', 'PII Detection', 'Detect and redact PII for this model'],
              ['jailbreakDetection', 'Jailbreak Detection', 'Block prompt-injection and jailbreak attempts'],
              ['outputFiltering', 'Output Filtering', 'Filter model outputs against guardrail rules'],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{desc}</p>
                </div>
                <Switch checked={perModelForm[key]} onCheckedChange={v => setPerModelForm({ ...perModelForm, [key]: v })} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Blocked Topics (comma-separated)</label>
              <Input value={perModelForm.blockedTopics} onChange={e => setPerModelForm({ ...perModelForm, blockedTopics: e.target.value })} style={{ borderRadius: 0 }} placeholder="e.g., legal_advice, medical_advice" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Allowed Topics (comma-separated, optional)</label>
              <Input value={perModelForm.allowedTopics} onChange={e => setPerModelForm({ ...perModelForm, allowedTopics: e.target.value })} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPerModelFormOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={submitPerModel} loading={saveConfig.isPending} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {perModelForm.id ? 'Save Changes' : 'Create Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
