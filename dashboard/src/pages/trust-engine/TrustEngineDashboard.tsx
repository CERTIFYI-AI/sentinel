// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Runtime Trust — the Trust Engine overview. Policies are the real org-scoped
// trust_policies rows (uuid-keyed; policy_ref is display-only); KPIs and the
// 14-day trend derive from live_traces outcomes. No fabricated metrics: every
// number on this page is computed from the database, and empty orgs get honest
// empty states.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck, Eye, PencilSimple, Trash, Plus, Copy, Pause, Play,
  Warning, CheckCircle, Lightning, Bell, X, Cpu,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useTrustPolicies, useTraceAnalytics } from '../../hooks/useTrustPolicies';
import { useModelOptions } from '@/hooks/useAiiaData';
import { nextPolicyRef, type TrustPolicy, type TrustPolicyAction, type TrustPolicySeverity } from '@/services/trustPolicyService';
import { trustConfigCrud } from '@/hooks/queries/useTrustEngineCrud';
import { formatNumber, timeAgo } from '../../data/seed';

// ── Constants ────────────────────────────────────────────────────────────────

const POLICY_TYPES = ['pii', 'toxicity', 'jailbreak', 'hallucination', 'cost', 'latency', 'security', 'other'];
const POLICY_ACTIONS: TrustPolicyAction[] = ['block', 'warn', 'redact', 'route_hitl', 'log'];
const POLICY_SEVERITIES: TrustPolicySeverity[] = ['critical', 'high', 'medium', 'low'];

interface AlertNotificationsConfig {
  thresholdPct: number;
  email: boolean;
  slack: boolean;
  pagerduty: boolean;
  slackChannel: string;
}
const DEFAULT_ALERT_CONFIG: AlertNotificationsConfig = {
  thresholdPct: 95, email: true, slack: false, pagerduty: false, slackChannel: 'security-alerts',
};

interface PolicyForm {
  name: string;
  type: string;
  action: TrustPolicyAction;
  severity: TrustPolicySeverity;
  threshold: string;
  frameworkRef: string;
  isActive: boolean;
  linkedModels: string[];
}
const EMPTY_FORM: PolicyForm = {
  name: '', type: 'pii', action: 'block', severity: 'high',
  threshold: '', frameworkRef: '', isActive: false, linkedModels: [],
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function actionBadge(action: TrustPolicyAction) {
  const map: Record<TrustPolicyAction, { bg: string; color: string }> = {
    block: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    redact: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    route_hitl: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    log: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  };
  const s = map[action] ?? map.log;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{action.replace('_', ' ')}</Badge>;
}

function severityBadge(sev: TrustPolicySeverity) {
  const map: Record<TrustPolicySeverity, { bg: string; color: string }> = {
    critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    high: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    medium: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  };
  const s = map[sev] ?? map.medium;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{sev}</Badge>;
}

/** Pill link to the canonical model route; never a raw uuid. */
function ModelPill({ id, name }: { id: string; name?: string }) {
  if (!name) {
    return <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>Unavailable</span>;
  }
  return (
    <Link
      to={`/models/inventory/${id}`}
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 transition-colors hover:underline"
      style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0 }}
    >
      <Cpu size={11} />{name}
    </Link>
  );
}

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
      borderRadius: 0, color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey}>{p.name}: <span className="font-bold">{formatNumber(p.value)}</span></p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrustEngineDashboard() {
  const navigate = useNavigate();
  const ct = useChartTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const { data: policies, isLoading: policiesLoading, error: policiesError, save, remove } = useTrustPolicies();
  const { analytics, isLoading: tracesLoading, error: tracesError } = useTraceAnalytics(modelParam);
  const { models } = useModelOptions();

  const modelName = (id: string | null | undefined) =>
    id ? models.find(m => m.id === id)?.name : undefined;

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Sheets / dialogs
  const [selectedPolicy, setSelectedPolicy] = useState<TrustPolicy | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<TrustPolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustPolicy | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PolicyForm>(EMPTY_FORM);

  // Alert config (persisted in the trust_config doc)
  const [alertConfigOpen, setAlertConfigOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertNotificationsConfig>(DEFAULT_ALERT_CONFIG);
  const [alertSaving, setAlertSaving] = useState(false);

  useEffect(() => {
    if (!alertConfigOpen) return;
    trustConfigCrud.get('default')
      .then(doc => {
        const stored = (doc as any)?.alertNotifications;
        if (stored) setAlertConfig({ ...DEFAULT_ALERT_CONFIG, ...stored });
      })
      .catch(() => { /* sheet keeps defaults; save still surfaces real errors */ });
  }, [alertConfigOpen]);

  const saveAlertConfig = async () => {
    setAlertSaving(true);
    try {
      const doc = await trustConfigCrud.get('default');
      await trustConfigCrud.upsert({ ...(doc ?? {}), id: 'default', alertNotifications: alertConfig } as any);
      toast.success('Alert configuration saved');
      setAlertConfigOpen(false);
    } catch (e) {
      toast.error(`Failed to save alert configuration: ${(e as Error).message}`);
    } finally {
      setAlertSaving(false);
    }
  };

  // Model-scoped view: policies whose linked_models contain the model.
  const scopedPolicies = useMemo(
    () => modelParam ? policies.filter(p => p.linkedModels.includes(modelParam)) : policies,
    [policies, modelParam],
  );

  const filtered = useMemo(() => scopedPolicies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.policyRef.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    const matchStatus = !filterStatus || (filterStatus === 'active' ? p.isActive : !p.isActive);
    const matchType = !filterType || p.type === filterType;
    return matchSearch && matchStatus && matchType;
  }), [scopedPolicies, search, filterStatus, filterType]);

  const activePolicies = scopedPolicies.filter(p => p.isActive).length;

  // Form handling ------------------------------------------------------------
  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, linkedModels: modelParam ? [modelParam] : [] });
    setFormOpen(true);
  }
  function openEdit(p: TrustPolicy) {
    setEditingId(p.id);
    setForm({
      name: p.name, type: p.type, action: p.action, severity: p.severity,
      threshold: p.threshold === null ? '' : String(p.threshold),
      frameworkRef: p.frameworkRef ?? '', isActive: p.isActive, linkedModels: [...p.linkedModels],
    });
    setFormOpen(true);
  }

  async function submitForm() {
    if (!form.name.trim()) { toast.error('Policy name is required'); return; }
    const threshold = form.threshold.trim() === '' ? null : Number(form.threshold);
    if (threshold !== null && Number.isNaN(threshold)) { toast.error('Threshold must be a number'); return; }
    const rec: Partial<TrustPolicy> = {
      id: editingId ?? undefined,
      name: form.name.trim(),
      type: form.type,
      action: form.action,
      severity: form.severity,
      threshold,
      frameworkRef: form.frameworkRef.trim() || null,
      isActive: form.isActive,
      linkedModels: form.linkedModels,
      ...(editingId ? {} : { policyRef: nextPolicyRef(policies) }),
    };
    try {
      const saved = await save.mutateAsync(rec);
      toast.success(editingId ? `Policy ${saved.policyRef} updated` : `Policy ${saved.policyRef} created`);
      setFormOpen(false);
      if (selectedPolicy?.id === saved.id) setSelectedPolicy(saved);
    } catch (e) {
      toast.error(`Failed to save policy: ${(e as Error).message}`);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeactivateTarget(null);
    try {
      await save.mutateAsync({ id: target.id, isActive: false });
      toast.success(`${target.policyRef} — ${target.name} deactivated`);
    } catch (e) {
      toast.error(`Failed to deactivate policy: ${(e as Error).message}`);
    }
  }

  async function handleActivate(p: TrustPolicy) {
    try {
      await save.mutateAsync({ id: p.id, isActive: true });
      toast.success(`${p.policyRef} — ${p.name} activated`);
    } catch (e) {
      toast.error(`Failed to activate policy: ${(e as Error).message}`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await remove.mutateAsync(target.id);
      toast.success(`Policy ${target.policyRef} deleted`);
      if (selectedPolicy?.id === target.id) { setSheetOpen(false); setSelectedPolicy(null); }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleClone(p: TrustPolicy) {
    try {
      const saved = await save.mutateAsync({
        policyRef: nextPolicyRef(policies),
        name: `${p.name} (Copy)`,
        type: p.type, action: p.action, severity: p.severity,
        conditionJson: p.conditionJson, threshold: p.threshold,
        frameworkRef: p.frameworkRef, linkedModels: [...p.linkedModels],
        isActive: false,
      });
      toast.success(`Cloned "${p.name}" as ${saved.policyRef} (inactive)`);
    } catch (e) {
      toast.error(`Failed to clone policy: ${(e as Error).message}`);
    }
  }

  // KPI cards -----------------------------------------------------------------
  const trustKpiCards: StatCardRowItem[] = [
    {
      label: 'Trust Index',
      value: analytics?.trustIndex === null || analytics === null ? '—' : `${analytics.trustIndex}%`,
      icon: <ShieldCheck size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      description: 'Trust index derived from trace outcomes over the last 14 days',
      delta: 'Derived from trace outcomes',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Traces Evaluated (14d)',
      value: formatNumber(analytics?.total14d ?? 0),
      icon: <Lightning size={18} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} />,
      description: `Traces evaluated in the last 14 days: ${analytics?.total14d ?? 0}`,
    },
    {
      label: 'Violations (7d)',
      value: String(analytics?.blocked7d ?? 0),
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      description: `Blocked traces in the last 7 days: ${analytics?.blocked7d ?? 0}`,
      delta: 'Blocked traces',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Active Policies',
      value: String(activePolicies),
      icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      description: `Active trust policies: ${activePolicies} of ${scopedPolicies.length}`,
      delta: `${scopedPolicies.length} total`,
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
  ];

  const activeFilterCount = (filterStatus ? 1 : 0) + (filterType ? 1 : 0) + (modelParam ? 1 : 0);

  if (policiesLoading || tracesLoading) return <PageSkeleton title="Runtime Trust" showStats />;

  return (
    <div className="space-y-6">

      <PageHeader
        title="Runtime Trust"
        subtitle="Runtime trust policies and guardrail outcomes across live inference traffic"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Runtime Trust' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAlertConfigOpen(true)} style={{ borderRadius: 0 }}>
              <Bell size={14} />Alert Config
            </Button>
            <Button onClick={openCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />Create Policy
            </Button>
          </div>
        }
      />

      {/* Real query error states */}
      {policiesError && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load trust policies</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{policiesError.message}</p>
        </div>
      )}
      {tracesError && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load trace analytics</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{tracesError.message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (deep-link from Model Detail) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam) ?? 'Unavailable'}</strong></span>
            <button
              aria-label="Clear model filter"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <StatCardRow cards={trustKpiCards} />

      {/* 14-day trace outcome trend + recent incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Trace Outcomes — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics && analytics.total14d > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={analytics.days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5)}
                    tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                  <ReTooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--bg-muted))', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: ct.text }} />
                  <Bar dataKey="success" name="Success" stackId="s" fill="hsl(var(--s-ok-tx))" stroke="hsl(var(--bg-surface))" strokeWidth={1} maxBarSize={28} />
                  <Bar dataKey="blocked" name="Blocked" stackId="s" fill="hsl(var(--s-er-tx))" stroke="hsl(var(--bg-surface))" strokeWidth={1} maxBarSize={28} />
                  <Bar dataKey="error" name="Error" stackId="s" fill="hsl(var(--s-wn-tx))" stroke="hsl(var(--bg-surface))" strokeWidth={1} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-14 text-center">
                <Lightning size={28} className="mx-auto mb-2 text-[hsl(var(--text-4))]" />
                <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
                  No inference traces recorded in the last 14 days{modelParam ? ' for this model' : ''}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Recent Blocked & Error Traces
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analytics && analytics.recentIncidents.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {analytics.recentIncidents.map(inc => {
                  const policy = inc.policyId ? policies.find(p => p.id === inc.policyId) : null;
                  const isBlocked = inc.status === 'blocked';
                  return (
                    <div key={inc.id} className="px-4 py-2.5 flex items-start gap-2">
                      <Badge style={{
                        background: isBlocked ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))',
                        color: isBlocked ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))',
                        borderRadius: 0, fontSize: 9, flexShrink: 0, marginTop: 2,
                      }}>{inc.status}</Badge>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inc.modelId
                            ? <ModelPill id={inc.modelId} name={modelName(inc.modelId)} />
                            : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>}
                          {policy && (
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                              {policy.policyRef} · {policy.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          {inc.traceRef ?? 'Trace'} · {timeAgo(inc.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-10 text-xs text-center" style={{ color: 'hsl(var(--text-4))' }}>
                No blocked or error traces in the last 14 days{modelParam ? ' for this model' : ''}.
              </p>
            )}
            <div className="px-4 py-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <button className="text-xs underline" style={{ color: 'hsl(var(--brand))' }} onClick={() => navigate('/trust-engine/traces')}>
                View all inference traces
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policies by name, ref, type…"
        filters={[
          {
            key: 'status', label: 'Status', value: filterStatus, onChange: setFilterStatus,
            options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }],
          },
          {
            key: 'type', label: 'Type', value: filterType, onChange: setFilterType,
            options: POLICY_TYPES.map(t => ({ label: t, value: t })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">
            {filtered.length} polic{filtered.length === 1 ? 'y' : 'ies'}
          </span>
        }
      />

      {/* Policies Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Trust Policies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Ref', 'Policy', 'Type', 'Action', 'Severity', 'Linked Models', 'Triggers (7d)', 'Block Rate', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(var(--brand))' }}>{p.policyRef}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.name}</span>
                      {p.frameworkRef && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{p.frameworkRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{p.type}</Badge>
                    </td>
                    <td className="px-4 py-3">{actionBadge(p.action)}</td>
                    <td className="px-4 py-3">{severityBadge(p.severity)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {p.linkedModels.length === 0
                          ? <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>
                          : p.linkedModels.slice(0, 2).map(id => <ModelPill key={id} id={id} name={modelName(id)} />)}
                        {p.linkedModels.length > 2 && (
                          <span className="text-[10px] px-1 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                            +{p.linkedModels.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(p.triggers7d)}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{p.blockRate}%</td>
                    <td className="px-4 py-3">
                      <Badge style={{
                        background: p.isActive ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))',
                        color: p.isActive ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                        borderRadius: 0, fontSize: 10,
                      }}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button aria-label="View policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedPolicy(p); setSheetOpen(true); }}>
                          <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                        </Button>
                        <Button aria-label="Edit policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                          <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        </Button>
                        <Button aria-label="Clone policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleClone(p)}>
                          <Copy size={14} className="text-[hsl(var(--s-in-tx))]" />
                        </Button>
                        {p.isActive ? (
                          <Button aria-label="Deactivate policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeactivateTarget(p)}>
                            <Pause size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />
                          </Button>
                        ) : (
                          <Button aria-label="Activate policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleActivate(p)}>
                            <Play size={14} className="text-[hsl(var(--s-ok-tx))]" />
                          </Button>
                        )}
                        <Button aria-label="Delete policy" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(p)}>
                          <Trash size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              scopedPolicies.length === 0 && !policiesError ? (
                <div className="py-12 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
                  <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
                    {modelParam ? 'No trust policies are linked to this model yet.' : 'No trust policies configured for your organization yet.'}
                  </p>
                  <Button className="mt-4" style={{ borderRadius: 0 }} onClick={openCreate}>
                    <Plus size={15} /> Create Policy
                  </Button>
                </div>
              ) : (
                <div className="py-12 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                  No policies match the current filters.
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deactivate ConfirmDialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        type="warning"
        title={`Deactivate ${deactivateTarget?.policyRef}`}
        message={
          <p>
            Deactivating <strong>{deactivateTarget?.name}</strong> stops it from evaluating live traffic
            {deactivateTarget?.frameworkRef ? <> and may affect <strong>{deactivateTarget.frameworkRef}</strong> coverage</> : null}.
          </p>
        }
        confirmLabel="Deactivate Policy"
      />

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Policy"
        message={<p>Delete <strong>{deleteTarget?.policyRef} — {deleteTarget?.name}</strong>? This cannot be undone. Policies referenced by recorded traces cannot be deleted — deactivate them instead.</p>}
        confirmLabel="Delete"
      />

      {/* Alert Configuration Dialog — persisted in the trust_config doc */}
      <Dialog open={alertConfigOpen} onOpenChange={setAlertConfigOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
              <Bell size={16} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
              Runtime Trust Alert Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                Configure where trust alerts are sent. Alerts trigger when the trust index drops below the configured threshold.
                Settings persist in the shared Trust Engine configuration.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Alert Threshold (Trust Index %)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={70} max={99} value={alertConfig.thresholdPct}
                  onChange={e => setAlertConfig({ ...alertConfig, thresholdPct: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'hsl(var(--brand))' }} />
                <span className="text-sm font-bold" style={{ color: alertConfig.thresholdPct < 90 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))', minWidth: 40 }}>
                  {alertConfig.thresholdPct}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Notification Channels</label>
              {(['email', 'slack', 'pagerduty'] as const).map(ch => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={alertConfig[ch]}
                    onChange={e => setAlertConfig({ ...alertConfig, [ch]: e.target.checked })}
                    style={{ width: 14, height: 14, accentColor: 'hsl(var(--brand))' }} />
                  <span style={{ fontSize: 13, color: 'hsl(var(--text-1))', textTransform: 'capitalize' }}>{ch}</span>
                  <Badge style={{
                    background: alertConfig[ch] ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                    color: alertConfig[ch] ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                    borderRadius: 0, fontSize: 9, marginLeft: 'auto',
                  }}>
                    {alertConfig[ch] ? 'Enabled' : 'Disabled'}
                  </Badge>
                </label>
              ))}
            </div>
            {alertConfig.slack && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Slack Channel</label>
                <Input value={alertConfig.slackChannel} onChange={e => setAlertConfig({ ...alertConfig, slackChannel: e.target.value })}
                  placeholder="#security-alerts" style={{ borderRadius: 0 }} />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAlertConfigOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={saveAlertConfig} loading={alertSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Policy Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              {editingId ? `Edit Policy ${policies.find(p => p.id === editingId)?.policyRef ?? ''}` : 'Create Trust Policy'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Policy Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., PII Detection & Redaction" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Action</label>
                <Select value={form.action} onValueChange={v => setForm({ ...form, action: v as TrustPolicyAction })}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {POLICY_ACTIONS.map(a => <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Severity</label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v as TrustPolicySeverity })}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {POLICY_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Threshold</label>
                <Input value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })}
                  placeholder="e.g., 0.85" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Framework Reference</label>
              <Input value={form.frameworkRef} onChange={e => setForm({ ...form, frameworkRef: e.target.value })}
                placeholder="e.g., GDPR Art. 5" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Linked Models (registry)</label>
              <div className="max-h-40 overflow-y-auto border p-2 space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
                {models.length === 0 && <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in the registry.</p>}
                {models.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.linkedModels.includes(m.id)}
                      onChange={e => setForm({
                        ...form,
                        linkedModels: e.target.checked
                          ? [...form.linkedModels, m.id]
                          : form.linkedModels.filter(id => id !== m.id),
                      })}
                      style={{ width: 13, height: 13, accentColor: 'hsl(var(--brand))' }}
                    />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Active</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Active policies evaluate live traffic immediately</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={submitForm} loading={save.isPending} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {editingId ? 'Save Changes' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedPolicy && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ShieldCheck size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedPolicy.policyRef} — {selectedPolicy.name}
                </SheetTitle>
              </SheetHeader>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => { setSheetOpen(false); openEdit(selectedPolicy); }}>
                  <PencilSimple size={12} /> Edit
                </Button>
              </div>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Triggers (7d)</span>
                    <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(selectedPolicy.triggers7d)}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Block Rate</span>
                    <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.blockRate}%</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Avg Latency</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedPolicy.avgLatencyMs === null ? '—' : `${selectedPolicy.avgLatencyMs} ms`}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Framework</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.frameworkRef ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{selectedPolicy.type}</Badge>
                  {actionBadge(selectedPolicy.action)}
                  {severityBadge(selectedPolicy.severity)}
                  <Badge style={{
                    background: selectedPolicy.isActive ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))',
                    color: selectedPolicy.isActive ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                    borderRadius: 0, fontSize: 10,
                  }}>{selectedPolicy.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedPolicy.linkedModels.length === 0
                      ? <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models linked — edit the policy to link registry models.</span>
                      : selectedPolicy.linkedModels.map(id => <ModelPill key={id} id={id} name={modelName(id)} />)}
                  </div>
                </div>
                {selectedPolicy.threshold !== null && (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Threshold</span>
                    <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.threshold}</p>
                  </div>
                )}
                {selectedPolicy.conditionJson && (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Condition</span>
                    <pre className="text-[11px] font-mono mt-1 whitespace-pre-wrap break-all" style={{ color: 'hsl(var(--text-2))' }}>
                      {JSON.stringify(selectedPolicy.conditionJson, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
