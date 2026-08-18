import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FileText, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, Play, FilePdf, CheckCircle,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useOrgName } from '../../hooks/useOrganization';
import { useChartTheme } from '../../hooks/useChartTheme';
import { supabase } from '../../lib/supabase';
import { useReports, useReportRuns, useGenerateReport } from '../../hooks/useSecurityGroup';
import type { ReportTemplate, ReportRun } from '../../services/securityGroupService';
import { PageSkeleton } from '../../components/ui/PageSkeleton';

// Canonical vocabulary (matches the security_reports migration/seeds).
// Values are stored canonically; display labels are prettified.
const CATEGORIES = ['posture', 'vulnerabilities', 'red_team', 'compliance', 'executive'];
const CATEGORY_LABELS: Record<string, string> = {
  posture: 'Posture', vulnerabilities: 'Vulnerabilities', red_team: 'Red team',
  compliance: 'Compliance', executive: 'Executive',
};
const categoryLabel = (c?: string) => (c ? CATEGORY_LABELS[c] ?? c : '—');

const FREQUENCIES = ['on_demand', 'weekly', 'monthly', 'quarterly'];
const FREQUENCY_LABELS: Record<string, string> = {
  on_demand: 'On demand', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
};
const frequencyLabel = (f?: string) => (f ? FREQUENCY_LABELS[f] ?? f : '—');

// The section keys the generator service can actually snapshot.
const SECTION_LABELS: Record<string, string> = {
  threats: 'Threats',
  scans: 'Scans',
  vulnerabilities: 'Vulnerabilities',
  attack_surface: 'Attack Surface',
  red_team_campaigns: 'Red Team Campaigns',
  red_team_findings: 'Red Team Findings',
  model_arena: 'Model Arena',
  policy_firewall_rules: 'Policy Firewall Rules',
};
const SECTION_KEYS = Object.keys(SECTION_LABELS);

function statusStyle(status?: string) {
  switch (status) {
    case 'completed': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'generating': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'failed': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function formatBytes(n?: number) {
  if (!n || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const EMPTY_TEMPLATE: ReportTemplate = {
  name: '', category: 'posture', description: '', frequency: 'monthly',
  sections: [], recipients: [], format: 'json',
};

export default function ReportGenerator() {
  const orgName = useOrgName();
  const ct = useChartTheme();

  const { items: templates, isLoading, error, save, remove, isSaving } = useReports();
  const runsQuery = useReportRuns();
  const runs = (runsQuery.data ?? []) as ReportRun[];
  const generate = useGenerateReport();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('templates');

  const [viewItem, setViewItem] = useState<ReportTemplate | null>(null);
  const [editItem, setEditItem] = useState<ReportTemplate | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReportTemplate | null>(null);
  const [generateItem, setGenerateItem] = useState<ReportTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ReportTemplate>(EMPTY_TEMPLATE);

  if (isLoading) return <PageSkeleton title="Report Generator" showStats rows={5} />;

  const templateName = (id?: string) => templates.find(t => t.id === id)?.name ?? 'Unavailable';

  const filteredTemplates = templates.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || (t.name ?? '').toLowerCase().includes(q) || (t.category ?? '').toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categoryData = Array.from(
    templates.reduce((acc, t) => {
      const key = t.category || 'uncategorized';
      acc.set(key, (acc.get(key) || 0) + (t.generationCount ?? 0));
      return acc;
    }, new Map<string, number>())
  ).map(([key, count]) => ({ name: key === 'uncategorized' ? 'Uncategorized' : categoryLabel(key), count }));

  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean))) as string[];

  const stats = [
    { label: 'Report Templates', value: templates.length, icon: FileText },
    { label: 'Runs Generated', value: runs.length, icon: FilePdf },
    { label: 'Completed', value: runs.filter(r => r.status === 'completed').length, icon: CheckCircle },
    { label: 'Data Captured', value: formatBytes(runs.reduce((s, r) => s + (r.sizeBytes ?? 0), 0)), icon: Download },
  ];

  function toggleSection(list: string[] | undefined, key: string): string[] {
    const set = new Set(list ?? []);
    if (set.has(key)) set.delete(key); else set.add(key);
    return Array.from(set);
  }

  const sectionPicker = (selected: string[] | undefined, onChange: (keys: string[]) => void) => (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Sections (data captured on generation)</label>
      <div className="grid grid-cols-2 gap-1 border p-2" style={{ borderColor: 'hsl(var(--border))' }}>
        {SECTION_KEYS.map(k => (
          <label key={k} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'hsl(var(--text-2))' }}>
            <input type="checkbox" checked={(selected ?? []).includes(k)} onChange={() => onChange(toggleSection(selected, k))} />
            {SECTION_LABELS[k]}
          </label>
        ))}
      </div>
    </div>
  );

  async function handleGenerate() {
    if (!generateItem) return;
    const { data: user } = await supabase.auth.getUser();
    const by = user.user?.email ?? user.user?.id ?? 'Unknown';
    try {
      await generate.mutateAsync({ template: generateItem, by });
      setGenerateItem(null);
      setActiveTab('history');
    } catch { /* hook toasts error */ }
  }

  async function handleCreate() {
    if (!formData.name.trim()) { toast.error('Template name is required'); return; }
    try {
      await save({ ...formData, id: crypto.randomUUID() });
      setCreateOpen(false);
      setFormData(EMPTY_TEMPLATE);
    } catch { /* hook toasts error */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try { await save(editItem); setEditItem(null); } catch { /* hook toasts error */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try { await remove(deleteItem.id); setDeleteItem(null); } catch { /* hook toasts error */ }
  }

  function downloadRun(run: ReportRun) {
    const blob = new Blob([JSON.stringify(run.content ?? {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (templateName(run.reportId) || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.download = `${base}-${run.generatedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Report Generator</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Security report templates & data-snapshot generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setFormData(EMPTY_TEMPLATE); setCreateOpen(true); }}>
            <Plus size={14} /> New Template
          </Button>
        </div>
      </div>

      {/* Query error state */}
      {(error || runsQuery.error) && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load reports</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{((error || runsQuery.error) as Error).message}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Chart */}
      {categoryData.length > 0 && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Generation Count by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="count" fill={ct.brand} radius={0} name="Reports Generated" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Templates + History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
            <TabsTrigger value="templates" style={{ borderRadius: 0 }}>Templates</TabsTrigger>
            <TabsTrigger value="history" style={{ borderRadius: 0 }}>Generation History</TabsTrigger>
          </TabsList>

          {activeTab === 'templates' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
                <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0, width: 200 }} />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <FileText size={40} />
              <p className="mt-3 text-sm font-medium">
                {templates.length === 0 ? 'No report templates yet. Create one to start generating snapshots.' : 'No templates match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map(t => (
                <Card key={t.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <FileText size={14} style={{ color: 'hsl(var(--text-3))' }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{t.name}</p>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                            {categoryLabel(t.category)} · {frequencyLabel(t.frequency)} · {t.generationCount ?? 0} generated
                          </p>
                          {t.description && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{t.description}</p>}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(t.sections ?? []).slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{SECTION_LABELS[s] ?? s}</Badge>
                            ))}
                            {(t.sections ?? []).length > 3 && (
                              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>+{(t.sections ?? []).length - 3} more</span>
                            )}
                            {(t.sections ?? []).length === 0 && (
                              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No sections selected</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          Last: {t.lastGeneratedAt ? formatDate(t.lastGeneratedAt) : 'Never'}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" style={{ borderRadius: 0 }} disabled={(t.sections ?? []).length === 0} onClick={() => setGenerateItem(t)}>
                            <Play size={12} /> Generate
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(t)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...t })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(t)}>
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
                  <FileText size={40} />
                  <p className="mt-3 text-sm font-medium">No reports generated yet.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['Report Name', 'Generated At', 'By', 'Status', 'Format', 'Size', 'Actions'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(r => (
                      <tr
                        key={r.id}
                        style={{ borderTop: '1px solid hsl(var(--border))' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-1))' }}>{templateName(r.reportId)}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          {new Date(r.generatedAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r.generatedBy || '—'}</td>
                        <td className="p-3">
                          <Badge style={{ background: statusStyle(r.status).bg, color: statusStyle(r.status).text, border: `1px solid ${statusStyle(r.status).border}`, borderRadius: 0, fontSize: 11 }}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs uppercase" style={{ color: 'hsl(var(--text-2))' }}>{r.format}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatBytes(r.sizeBytes)}</td>
                        <td className="p-3">
                          {r.status === 'completed' && r.content != null && (
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => downloadRun(r)} title="Download report">
                              <Download size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{categoryLabel(viewItem.category)}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{frequencyLabel(viewItem.frequency)}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="sections" style={{ borderRadius: 0 }}>Sections</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Category', value: categoryLabel(viewItem.category) },
                    { label: 'Frequency', value: frequencyLabel(viewItem.frequency) },
                    { label: 'Last Generated', value: viewItem.lastGeneratedAt ? formatDate(viewItem.lastGeneratedAt) : 'Never' },
                    { label: 'Generated Count', value: String(viewItem.generationCount ?? 0) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Recipients</p>
                    {(viewItem.recipients ?? []).length > 0
                      ? (viewItem.recipients ?? []).map(r => (
                          <p key={r} className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r}</p>
                        ))
                      : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>}
                  </div>
                  {viewItem.description && <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>}
                </TabsContent>
                <TabsContent value="sections" className="mt-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Report Sections</p>
                  {(viewItem.sections ?? []).length > 0 ? (
                    <ol className="space-y-2">
                      {(viewItem.sections ?? []).map((s, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold w-5 text-center" style={{ color: 'hsl(var(--brand))' }}>{i + 1}</span>
                          <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{SECTION_LABELS[s] ?? s}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No sections selected — this template would produce an empty snapshot.</p>
                  )}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" disabled={(viewItem.sections ?? []).length === 0} onClick={() => { setGenerateItem(viewItem); setViewItem(null); }}>
                  <Play size={14} /> Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Report Template</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Description', key: 'description' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Recipients (comma-separated)</label>
                <Input value={(editItem.recipients ?? []).join(', ')} onChange={e => setEditItem(prev => prev ? { ...prev, recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                  <select value={editItem.category} onChange={e => setEditItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Frequency</label>
                  <select value={editItem.frequency} onChange={e => setEditItem(prev => prev ? { ...prev, frequency: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
                  </select>
                </div>
              </div>
              {sectionPicker(editItem.sections, keys => setEditItem(prev => prev ? { ...prev, sections: keys } : null))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Report Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Template Name', key: 'name' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Recipients (comma-separated)</label>
              <Input value={(formData.recipients ?? []).join(', ')} onChange={e => setFormData(prev => ({ ...prev, recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Frequency</label>
                <select value={formData.frequency} onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
                </select>
              </div>
            </div>
            {sectionPicker(formData.sections, keys => setFormData(prev => ({ ...prev, sections: keys })))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name || isSaving}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Confirm */}
      <AlertDialog open={!!generateItem} onOpenChange={o => !o && setGenerateItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Generate Report</AlertDialogTitle>
            <AlertDialogDescription>
              Generate <strong>{generateItem?.name}</strong>? This captures a live snapshot of the selected sections and stores it as a downloadable run.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerate} disabled={generate.isPending} style={{ background: 'hsl(var(--brand))', borderRadius: 0 }}>
              <Play size={14} className="mr-1" /> {generate.isPending ? 'Generating…' : 'Generate Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
