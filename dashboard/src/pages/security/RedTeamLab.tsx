// SPDX-License-Identifier: Apache-2.0
// Red Team Lab — adversarial campaign console on the platform contract.
// Reads/writes the org-scoped red_team_campaigns table via useCampaigns()
// (writes throw, the hook fires the real success/error toast). Target models
// are stored as ai_models.id uuids and resolved to names at render; the picker
// selects real registry models, never free-text codes.

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sword, Eye, PencilSimple, Trash, Plus, Fire, CheckCircle, Lightning,
  Crosshair, X,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCampaigns } from '../../hooks/useSecurityGroup';
import { useModelsData } from '../../hooks/useModelsData';
import type { CampaignRecord } from '../../services/securityGroupService';

const STATUSES = ['Planning', 'Active', 'Completed', 'Archived'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const ATTACK_TYPES = [
  'Prompt Injection', 'Jailbreak', 'Data Exfiltration', 'Model Inversion',
  'Adversarial Input', 'Authentication Bypass', 'Supply Chain Attack',
  'API Abuse', 'Membership Inference', 'Evasion Attack',
];

const BLANK = {
  campaignId: '', name: '', objective: '', lead: '', status: 'Planning',
  severity: 'Medium', targetModelIds: [] as string[], attackTypes: [] as string[],
  findingsCount: '', successRate: '', startedAt: '', completedAt: '',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function campaignStatusBadge(status?: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Planning: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    Active: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    Completed: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    Archived: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  };
  const raw = status || 'Planning';
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const s = map[normalized] || map['Planning'];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{normalized}</Badge>;
}

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function RedTeamLab() {
  const { orgName } = useSettingsStore();
  const { items, isLoading, error, save, remove, isSaving } = useCampaigns();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const [selected, setSelected] = useState<CampaignRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const campaigns = items as CampaignRecord[];
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';

  const filtered = useMemo(
    () => (modelParam ? campaigns.filter(c => (c.targetModelIds ?? []).includes(modelParam)) : campaigns),
    [campaigns, modelParam],
  );

  const totalFindings = campaigns.reduce((a, c) => a + (c.findingsCount ?? 0), 0);
  const activeCampaigns = campaigns.filter(c => (c.status ?? '').toLowerCase() === 'active').length;
  const critical = campaigns.filter(c => (c.severity ?? '').toLowerCase() === 'critical').length;
  const withRate = campaigns.filter(c => c.successRate != null);
  const avgSuccess = withRate.length
    ? Math.round(withRate.reduce((a, c) => a + (c.successRate ?? 0), 0) / withRate.length)
    : null;

  function openCreate() {
    setEditingId(null);
    setForm({ ...BLANK });
    setDialogOpen(true);
  }

  function openEdit(c: CampaignRecord) {
    setEditingId(c.id ?? null);
    setForm({
      campaignId: c.campaignId ?? '', name: c.name ?? '', objective: c.objective ?? '',
      lead: c.lead ?? '', status: c.status ?? 'Planning', severity: c.severity ?? 'Medium',
      targetModelIds: c.targetModelIds ?? [], attackTypes: c.attackTypes ?? [],
      findingsCount: c.findingsCount != null ? String(c.findingsCount) : '',
      successRate: c.successRate != null ? String(c.successRate) : '',
      startedAt: c.startedAt ? c.startedAt.slice(0, 10) : '', completedAt: c.completedAt ? c.completedAt.slice(0, 10) : '',
    });
    setDialogOpen(true);
  }

  const toggle = (key: 'targetModelIds' | 'attackTypes', value: string) =>
    setForm(p => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter(v => v !== value) : [...p[key], value],
    }));

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await save({
        ...(editingId ? { id: editingId } : {}),
        campaignId: form.campaignId || undefined,
        name: form.name.trim(),
        objective: form.objective || undefined,
        lead: form.lead || undefined,
        status: form.status,
        severity: form.severity,
        targetModelIds: form.targetModelIds,
        attackTypes: form.attackTypes,
        findingsCount: form.findingsCount === '' ? 0 : Number(form.findingsCount),
        successRate: form.successRate === '' ? undefined : Number(form.successRate),
        startedAt: form.startedAt || undefined,
        completedAt: form.completedAt || undefined,
      });
      setDialogOpen(false);
      setForm({ ...BLANK });
      setEditingId(null);
    } catch { /* hook fired the error toast */ }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await remove(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch { setDeleteTarget(null); }
  }

  if (isLoading) return <PageSkeleton title="Red Team Lab" />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load Red Team Lab"
        error={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Red Team Lab"
        subtitle={`${orgName} — Adversarial testing campaigns and AI security exercises`}
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Security', href: '/security' }, { label: 'Red Team Lab' }]}
        badge={<Sword size={22} weight="fill" className="text-destructive ml-2" />}
        actions={
          <Button style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }} onClick={openCreate}>
            <Plus size={14} />Launch Campaign
          </Button>
        }
      />

      {/* Model-scoped filter chip (deep link from a model) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Metrics — computed only over real records */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Campaigns" value={String(campaigns.length)} variant="info" icon={<Sword size={16} weight="fill" className="text-[hsl(var(--s-in-tx))]" />} />
        <MetricTile label="Active" value={String(activeCampaigns)} variant="warn" icon={<Lightning size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} sub="In progress" />
        <MetricTile label="Critical Campaigns" value={String(critical)} variant="error" icon={<Fire size={16} weight="fill" className="text-destructive" />} sub="Highest severity" />
        <MetricTile label="Avg Success Rate" value={avgSuccess == null ? '—' : `${avgSuccess}%`} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-[hsl(var(--s-ok-tx))]" />} sub={withRate.length ? `Across ${withRate.length} recorded` : 'No rates recorded'} />
      </div>

      {/* Table / empty states */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Sword size={32} weight="duotone" />}
          title="No Red Team campaigns yet"
          description="Launch your first campaign to track adversarial evaluations, jailbreak tests, and attack scenarios."
          action={<Button onClick={openCreate}><Plus size={14} />Launch Campaign</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sword size={32} weight="duotone" />}
          title="No campaigns for this model"
          description="No campaigns target the filtered model. Clear the filter to see all campaigns."
          action={<Button variant="outline" onClick={() => setSearchParams({})}>Clear filter</Button>}
        />
      ) : (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Campaign', 'Objective', 'Target Models', 'Findings', 'Severity', 'Status', 'Lead', 'Started', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{c.name}</p>
                        {c.campaignId && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{c.campaignId}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{c.objective || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.targetModelIds ?? []).length === 0
                            ? <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                            : (c.targetModelIds ?? []).map(id => (
                              <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{c.findingsCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>{c.severity ?? '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">{campaignStatusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{c.lead || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fmtDate(c.startedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(c)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                            <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(c)}>
                            <Trash size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 620 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editingId ? 'Edit Campaign' : 'Launch Red Team Campaign'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Campaign Name *</Label>
                <Input placeholder="e.g. LLM Jailbreak Campaign Q3 2026" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Reference ID</Label>
                <Input placeholder="Optional (e.g. RTC-2026-01)" value={form.campaignId} onChange={e => setForm(p => ({ ...p, campaignId: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Team Lead</Label>
                <Input placeholder="Owner name" value={form.lead} onChange={e => setForm(p => ({ ...p, lead: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Findings Count</Label>
                <Input type="number" min={0} value={form.findingsCount} onChange={e => setForm(p => ({ ...p, findingsCount: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Success Rate (%)</Label>
                <Input type="number" min={0} max={100} value={form.successRate} onChange={e => setForm(p => ({ ...p, successRate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Started</Label>
                <Input type="date" value={form.startedAt} onChange={e => setForm(p => ({ ...p, startedAt: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Completed</Label>
                <Input type="date" value={form.completedAt} onChange={e => setForm(p => ({ ...p, completedAt: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Objective</Label>
                <Textarea placeholder="Describe the objectives, scope, and success criteria..." value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} style={{ borderRadius: 0, minHeight: 70 }} />
              </div>
            </div>

            {/* Target models — real ai_models.id multi-select */}
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Target Models</Label>
              {models.length === 0 ? (
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in the registry yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                  {models.map(m => {
                    const on = form.targetModelIds.includes(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggle('targetModelIds', m.id)}
                        className="text-xs px-2 py-1 border transition-colors"
                        style={{ borderRadius: 0, borderColor: on ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: on ? 'hsl(var(--brand-subtle))' : 'transparent', color: on ? 'hsl(var(--brand))' : 'hsl(var(--text-2))' }}>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attack types */}
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Attack Types</Label>
              <div className="flex flex-wrap gap-2">
                {ATTACK_TYPES.map(t => {
                  const on = form.attackTypes.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggle('attackTypes', t)}
                      className="text-xs px-2 py-1 border transition-colors"
                      style={{ borderRadius: 0, borderColor: on ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: on ? 'hsl(var(--brand-subtle))' : 'transparent', color: on ? 'hsl(var(--brand))' : 'hsl(var(--text-2))' }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }} onClick={handleSave} disabled={!form.name.trim() || isSaving}>
              <Plus size={14} />{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Launch Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Campaign"
        message={<span>Delete <strong>{deleteTarget?.name}</strong>? This permanently removes the campaign record.</span>}
        confirmLabel="Delete Campaign"
      />

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Sword size={18} weight="fill" className="text-destructive" />
                  {selected.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="targets" style={{ borderRadius: 0 }}>Targets</TabsTrigger>
                  <TabsTrigger value="vectors" style={{ borderRadius: 0 }}>Attack Types</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">{campaignStatusBadge(selected.status)}</div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.severity || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Lead</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.lead || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Findings</span>
                      <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.findingsCount ?? 0}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Success Rate</span>
                      <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.successRate == null ? '—' : `${selected.successRate}%`}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Duration</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{fmtDate(selected.startedAt)} — {selected.completedAt ? fmtDate(selected.completedAt) : 'Ongoing'}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Objective</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.objective || 'No objective recorded.'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="targets" className="space-y-2 mt-4">
                  {(selected.targetModelIds ?? []).length === 0 ? (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No target models linked.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(selected.targetModelIds ?? []).map(id => (
                        <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="vectors" className="space-y-3 mt-4">
                  {(selected.attackTypes ?? []).length === 0 ? (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No attack types recorded.</p>
                  ) : (selected.attackTypes ?? []).map((vec, i) => (
                    <div key={i} className="flex items-center gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Crosshair size={14} className="text-destructive" />
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{vec}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { const c = selected; setSelected(null); openEdit(c); }}><PencilSimple size={14} /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
