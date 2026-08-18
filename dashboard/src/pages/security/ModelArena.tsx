// SPDX-License-Identifier: Apache-2.0
// Model Arena — security benchmark runs on the platform contract. Reads/writes
// the org-scoped model_arena_runs table via useArena() (writes throw; the hook
// fires the real success/error toast). Each run links to the registry via
// model_id (ai_models.id uuid), resolved to a name at render. Scores may be
// unrecorded — they render "—" (never NaN/undefined%), and charts/aggregates
// only include recorded values.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Robot, MagnifyingGlass, Plus, Eye, PencilSimple, Trash, Export, X } from '@phosphor-icons/react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import { useOrgName } from '../../hooks/useOrganization';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useArena } from '../../hooks/useSecurityGroup';
import { useModelsData } from '../../hooks/useModelsData';
import type { ArenaRecord } from '../../services/securityGroupService';

const STATUSES = ['completed', 'running', 'queued', 'failed'];
const NONE = '__none';

// higher-is-better score dimensions
const HIGHER = ['promptInjectionResistance', 'jailbreakResistance', 'outputSafety'] as const;
// lower-is-better rate dimensions
const LOWER = ['piiLeakage', 'hallucinationRate', 'biasScore'] as const;

function scoreColor(score: number) {
  if (score >= 85) return 'hsl(var(--s-ok-tx))';
  if (score >= 70) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}
function rateColor(v: number) {
  return v > 15 ? 'hsl(var(--destructive))' : v > 8 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))';
}
const pctHigher = (v?: number | null) => (v == null ? '—' : `${v}%`);
const num = (v: string) => (v === '' ? undefined : Number(v));

function statusStyle(status?: string) {
  switch (status) {
    case 'completed': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'running': return { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))' };
    case 'queued': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'failed': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  }
}

// Radar over recorded 0–100 dimensions only (rates inverted to resistance).
function radarData(m: ArenaRecord) {
  return [
    { subject: 'Prompt Injection', value: m.promptInjectionResistance },
    { subject: 'Jailbreak Resist', value: m.jailbreakResistance },
    { subject: 'Output Safety', value: m.outputSafety },
    { subject: 'PII Resistance', value: m.piiLeakage == null ? null : 100 - m.piiLeakage },
    { subject: 'Accuracy', value: m.hallucinationRate == null ? null : 100 - m.hallucinationRate },
    { subject: 'Bias Resistance', value: m.biasScore == null ? null : 100 - m.biasScore },
  ].filter((d): d is { subject: string; value: number } => d.value != null);
}

const BLANK = {
  name: '', modelId: NONE, provider: '', status: 'completed',
  promptInjectionResistance: '', jailbreakResistance: '', outputSafety: '',
  piiLeakage: '', hallucinationRate: '', biasScore: '', overallScore: '',
  evaluatedAt: '', runBy: '',
};

function exportCsv(rows: ArenaRecord[], modelName: (id?: string | null) => string) {
  if (!rows.length) return;
  const cols = ['name', 'model', 'provider', 'status', 'promptInjectionResistance', 'jailbreakResistance', 'outputSafety', 'piiLeakage', 'hallucinationRate', 'biasScore', 'overallScore', 'evaluatedAt', 'runBy'];
  const line = (r: ArenaRecord) => [
    r.name, modelName(r.modelId), r.provider ?? '', r.status ?? '',
    r.promptInjectionResistance ?? '', r.jailbreakResistance ?? '', r.outputSafety ?? '',
    r.piiLeakage ?? '', r.hallucinationRate ?? '', r.biasScore ?? '', r.overallScore ?? '',
    r.evaluatedAt ?? '', r.runBy ?? '',
  ].map(v => JSON.stringify(v ?? '')).join(',');
  const csv = [cols.join(','), ...rows.map(line)].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'model-arena.csv';
  a.click();
}

export default function ModelArena() {
  const orgName = useOrgName();
  const ct = useChartTheme();
  const { items, isLoading, error, save, remove, isSaving } = useArena();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [radarId, setRadarId] = useState<string>('');
  const [viewItem, setViewItem] = useState<ArenaRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [deleteItem, setDeleteItem] = useState<ArenaRecord | null>(null);

  const runs = items as ArenaRecord[];
  const modelName = (id?: string | null) => (id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : '');

  const scoped = useMemo(
    () => (modelParam ? runs.filter(r => r.modelId === modelParam) : runs),
    [runs, modelParam],
  );

  const filtered = useMemo(() => scoped.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || (m.name ?? '').toLowerCase().includes(q) || (m.provider ?? '').toLowerCase().includes(q) || modelName(m.modelId).toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStat;
  }), [scoped, search, filterStatus, models]);

  const withOverall = scoped.filter(r => r.overallScore != null);
  const overallData = [...withOverall].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)).map(m => ({ name: m.name, score: m.overallScore as number }));
  const best = withOverall.length ? withOverall.reduce((a, r) => ((r.overallScore ?? 0) > (a.overallScore ?? 0) ? r : a)) : null;
  const avgOverall = withOverall.length ? Math.round(withOverall.reduce((s, r) => s + (r.overallScore ?? 0), 0) / withOverall.length) : null;
  const linkedModels = new Set(scoped.map(r => r.modelId).filter(Boolean)).size;

  const radarRun = scoped.find(r => r.id === radarId) ?? scoped[0];

  function openCreate() {
    setEditingId(null);
    setForm({ ...BLANK, modelId: modelParam ?? NONE });
    setDialogOpen(true);
  }
  function openEdit(m: ArenaRecord) {
    setEditingId(m.id ?? null);
    setForm({
      name: m.name ?? '', modelId: m.modelId ?? NONE, provider: m.provider ?? '', status: m.status ?? 'completed',
      promptInjectionResistance: m.promptInjectionResistance != null ? String(m.promptInjectionResistance) : '',
      jailbreakResistance: m.jailbreakResistance != null ? String(m.jailbreakResistance) : '',
      outputSafety: m.outputSafety != null ? String(m.outputSafety) : '',
      piiLeakage: m.piiLeakage != null ? String(m.piiLeakage) : '',
      hallucinationRate: m.hallucinationRate != null ? String(m.hallucinationRate) : '',
      biasScore: m.biasScore != null ? String(m.biasScore) : '',
      overallScore: m.overallScore != null ? String(m.overallScore) : '',
      evaluatedAt: m.evaluatedAt ? m.evaluatedAt.slice(0, 10) : '', runBy: m.runBy ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await save({
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        modelId: form.modelId === NONE ? undefined : form.modelId,
        provider: form.provider || undefined,
        status: form.status,
        promptInjectionResistance: num(form.promptInjectionResistance),
        jailbreakResistance: num(form.jailbreakResistance),
        outputSafety: num(form.outputSafety),
        piiLeakage: num(form.piiLeakage),
        hallucinationRate: num(form.hallucinationRate),
        biasScore: num(form.biasScore),
        overallScore: num(form.overallScore),
        evaluatedAt: form.evaluatedAt || undefined,
        runBy: form.runBy || undefined,
      });
      setDialogOpen(false);
      setForm({ ...BLANK });
      setEditingId(null);
    } catch { /* hook fired the error toast */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try {
      await remove(deleteItem.id);
      if (viewItem?.id === deleteItem.id) setViewItem(null);
      setDeleteItem(null);
    } catch { setDeleteItem(null); }
  }

  if (isLoading) return <PageSkeleton title="Model Arena" />;
  if (error) return <ErrorState title="Failed to load benchmark runs" error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Arena"
        subtitle={`${orgName} — Security benchmark scores & model comparison`}
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Security', href: '/security' }, { label: 'Model Arena' }]}
        badge={<Robot size={20} weight="fill" className="text-[hsl(var(--brand))] ml-2" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(scoped, modelName)} disabled={scoped.length === 0} style={{ borderRadius: 0 }}><Export size={14} /> Export CSV</Button>
            <Button size="sm" onClick={openCreate} style={{ borderRadius: 0 }}><Plus size={14} /> Add Run</Button>
          </div>
        }
      />

      {/* Model-scoped filter chip */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam) || 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"><X size={14} /></button>
          </span>
        </div>
      )}

      {scoped.length === 0 ? (
        <EmptyState
          icon={<Robot size={32} weight="duotone" />}
          title={modelParam ? 'No benchmark runs for this model' : 'No benchmark runs yet'}
          description={modelParam ? 'No arena runs target the filtered model.' : 'Add your first benchmark run to compare model security scores.'}
          action={modelParam
            ? <Button variant="outline" onClick={() => setSearchParams({})}>Clear filter</Button>
            : <Button onClick={openCreate}><Plus size={14} /> Add Run</Button>}
        />
      ) : (
        <>
          {/* Stat cards — computed only over recorded values */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Runs', value: String(scoped.length) },
              { label: 'Avg Overall Score', value: avgOverall == null ? '—' : `${avgOverall}%` },
              { label: 'Top Score', value: best?.overallScore != null ? `${best.overallScore}%` : '—', sub: best?.name },
              { label: 'Linked Models', value: String(linkedModels) },
            ].map(s => (
              <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardContent className="p-4">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                  {s.sub && <p className="text-[10px] mt-1 truncate" style={{ color: 'hsl(var(--text-4))' }}>{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Radar + Bar */}
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Security Radar</CardTitle>
                  {radarRun && (
                    <Select value={radarRun.id ?? ''} onValueChange={setRadarId}>
                      <SelectTrigger className="w-48" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>{scoped.map(m => <SelectItem key={m.id} value={m.id ?? ''}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {radarRun && radarData(radarRun).length >= 3 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData(radarRun)}>
                      <PolarGrid stroke={ct.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: ct.axis }} />
                      <Radar dataKey="value" stroke={ct.brand} fill={ct.brand} fillOpacity={0.3} name={radarRun.name} />
                      <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-center py-16" style={{ color: 'hsl(var(--text-4))' }}>Not enough recorded scores to draw a radar (needs 3+)</p>
                )}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Security Score Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                {overallData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={overallData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Score', angle: 0, position: 'insideBottom', style: { fill: ct.axis } }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} width={110} />
                      <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                      <Bar dataKey="score" radius={0} name="Score">
                        {overallData.map((entry, i) => <Cell key={i} fill={scoreColor(entry.score)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-center py-16" style={{ color: 'hsl(var(--text-4))' }}>No overall scores recorded yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
              <Input placeholder="Search runs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {scoped.length} runs</span>
          </div>

          {/* Comparison Table */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
                  <Robot size={40} />
                  <p className="mt-3 text-sm font-medium">No runs match your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr>
                        {['Run', 'Model', 'Provider', 'Status', 'Inj. Resist', 'Jailbreak', 'Safety', 'PII Leak', 'Halluc.', 'Bias', 'Overall', 'Actions'].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...filtered].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1)).map(m => (
                        <tr key={m.id} style={{ borderTop: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="p-3">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                            {m.evaluatedAt && <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{m.evaluatedAt.slice(0, 10)}</p>}
                          </td>
                          <td className="p-3">
                            {m.modelId ? <InterlinkChip label={modelName(m.modelId)} to={`/models/inventory/${m.modelId}`} /> : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                          </td>
                          <td className="p-3">{m.provider ? <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{m.provider}</Badge> : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}</td>
                          <td className="p-3">
                            <Badge style={{ background: statusStyle(m.status).bg, color: statusStyle(m.status).text, borderRadius: 0, fontSize: 11 }}>{m.status ?? '—'}</Badge>
                          </td>
                          {HIGHER.map(k => (
                            <td key={k} className="p-3">
                              {m[k] == null ? <span className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>—</span> : <span className="text-sm font-bold" style={{ color: scoreColor(m[k] as number) }}>{m[k]}%</span>}
                            </td>
                          ))}
                          {LOWER.map(k => (
                            <td key={k} className="p-3">
                              {m[k] == null ? <span className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>—</span> : <span className="text-sm font-bold" style={{ color: rateColor(m[k] as number) }}>{m[k]}%</span>}
                            </td>
                          ))}
                          <td className="p-3">
                            {m.overallScore == null ? <span className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>—</span> : (
                              <div className="flex items-center gap-2">
                                <div style={{ width: 50, height: 6, background: 'hsl(var(--bg-muted))' }}>
                                  <div style={{ width: `${m.overallScore}%`, height: '100%', background: scoreColor(m.overallScore) }} />
                                </div>
                                <span className="text-sm font-bold" style={{ color: scoreColor(m.overallScore) }}>{m.overallScore}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewItem(m)}><Eye size={14} /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}><PencilSimple size={14} /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteItem(m)}><Trash size={14} className="text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0 }} className="overflow-y-auto">
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap items-center">
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, borderRadius: 0 }}>{viewItem.status ?? '—'}</Badge>
                  {viewItem.provider && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.provider}</Badge>}
                  {viewItem.overallScore != null && <Badge style={{ background: 'hsl(var(--bg-muted))', color: scoreColor(viewItem.overallScore), borderRadius: 0 }}>Score: {viewItem.overallScore}</Badge>}
                  {viewItem.modelId && <InterlinkChip label={modelName(viewItem.modelId)} to={`/models/inventory/${viewItem.modelId}`} />}
                </div>
              </SheetHeader>
              <Tabs defaultValue="benchmarks">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="benchmarks" style={{ borderRadius: 0 }}>Benchmarks</TabsTrigger>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                </TabsList>
                <TabsContent value="benchmarks" className="mt-4">
                  <div className="space-y-2">
                    {[
                      { label: 'Prompt Injection Resistance', value: viewItem.promptInjectionResistance, higher: true },
                      { label: 'Jailbreak Resistance', value: viewItem.jailbreakResistance, higher: true },
                      { label: 'Output Safety', value: viewItem.outputSafety, higher: true },
                      { label: 'PII Leakage Rate', value: viewItem.piiLeakage, higher: false },
                      { label: 'Hallucination Rate', value: viewItem.hallucinationRate, higher: false },
                      { label: 'Bias Score', value: viewItem.biasScore, higher: false },
                    ].map(b => (
                      <div key={b.label} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <span className="text-xs w-44" style={{ color: 'hsl(var(--text-2))' }}>{b.label}</span>
                        {b.value == null ? (
                          <span className="text-xs flex-1 text-right" style={{ color: 'hsl(var(--text-4))' }}>Not recorded</span>
                        ) : (
                          <>
                            <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg-muted))' }}>
                              <div style={{ width: `${b.value}%`, height: '100%', background: b.higher ? scoreColor(b.value) : rateColor(b.value) }} />
                            </div>
                            <span className="text-xs font-bold w-10 text-right" style={{ color: b.higher ? scoreColor(b.value) : rateColor(b.value) }}>{b.value}%</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Overall Score', value: pctHigher(viewItem.overallScore) },
                    { label: 'Evaluated At', value: viewItem.evaluatedAt ? viewItem.evaluatedAt.slice(0, 10) : '—' },
                    { label: 'Run By', value: viewItem.runBy || '—' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { const m = viewItem; setViewItem(null); openEdit(m); }}><PencilSimple size={14} /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 580 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editingId ? 'Edit Benchmark Run' : 'Add Benchmark Run'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Run Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Q3 Safety Benchmark" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Registry Model</Label>
                <Select value={form.modelId} onValueChange={v => setForm(p => ({ ...p, modelId: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select model…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Provider</Label>
                <Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} placeholder="e.g. OpenAI" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Evaluated At</Label>
                <Input type="date" value={form.evaluatedAt} onChange={e => setForm(p => ({ ...p, evaluatedAt: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Run By</Label>
                <Input value={form.runBy} onChange={e => setForm(p => ({ ...p, runBy: e.target.value }))} placeholder="Evaluator name" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide pt-1" style={{ color: 'hsl(var(--text-4))' }}>Scores (0–100, optional — blank stays blank)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'promptInjectionResistance', label: 'Inj. Resistance' },
                { key: 'jailbreakResistance', label: 'Jailbreak Resist' },
                { key: 'outputSafety', label: 'Output Safety' },
                { key: 'piiLeakage', label: 'PII Leakage %' },
                { key: 'hallucinationRate', label: 'Hallucination %' },
                { key: 'biasScore', label: 'Bias %' },
                { key: 'overallScore', label: 'Overall Score' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</Label>
                  <Input type="number" min={0} max={100} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isSaving} style={{ borderRadius: 0 }}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Run'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Remove Benchmark Run"
        message={<span>Remove <strong>{deleteItem?.name}</strong> from the arena? This action cannot be undone.</span>}
        confirmLabel="Remove"
      />
    </div>
  );
}
