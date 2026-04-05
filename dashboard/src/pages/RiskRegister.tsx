import { useState } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Warning, XCircle, CheckCircle, TrendUp, TrendDown, Minus as MinusIcon
} from '@phosphor-icons/react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RISKS, severityColor, statusColor, formatDate, MODELS } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

function StatCard({ icon, value, label, sub }: { icon: React.ReactNode; value: string | number; label: string; sub?: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
        {sub && <div className="text-xs text-[hsl(var(--text-4))]">{sub}</div>}
      </div>
    </Card>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI/ML': '#6366f1',
  'Compliance': '#f59e0b',
  'Operational': '#22c55e',
  'Security': '#ef4444',
  'Governance': '#8b5cf6',
  'Third-Party': '#3b82f6',
};

const TrendIcon = ({ t }: { t: string }) => {
  if (t === 'up') return <TrendUp size={14} className="text-red-400" />;
  if (t === 'down') return <TrendDown size={14} className="text-green-400" />;
  return <MinusIcon size={14} className="text-[hsl(var(--text-4))]" />;
};

export default function RiskRegister() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<typeof RISKS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof RISKS[0] | null>(null);
  const [risks, setRisks] = useState(RISKS);
  const [editForm, setEditForm] = useState({ title: '', owner: '', description: '' });

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    open: risks.filter(r => r.status === 'open').length,
    mitigated: risks.filter(r => r.status === 'mitigated').length,
    avgScore: (risks.reduce((s, r) => s + r.score, 0) / risks.length).toFixed(1),
    trendingUp: risks.filter(r => r.trending === 'up').length,
  };

  const filtered = risks.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    const matchSev = severityFilter === 'all' || r.severity === severityFilter;
    const matchStat = statusFilter === 'all' || r.status === statusFilter;
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter;
    return matchSearch && matchSev && matchStat && matchCat;
  });

  // Chart data
  const categoryData = Object.entries(
    risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const severityData = [
    { name: 'Critical', count: risks.filter(r => r.severity === 'critical').length, fill: '#ef4444' },
    { name: 'High', count: risks.filter(r => r.severity === 'high').length, fill: '#f97316' },
    { name: 'Medium', count: risks.filter(r => r.severity === 'medium').length, fill: '#f59e0b' },
    { name: 'Low', count: risks.filter(r => r.severity === 'low').length, fill: '#22c55e' },
  ];

  const categories = [...new Set(risks.map(r => r.category))];

  const handleEdit = (r: typeof RISKS[0]) => {
    setEditForm({ title: r.title, owner: r.owner, description: r.description });
    setSelected(r);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setRisks(prev => prev.map(r => r.id === selected?.id ? { ...r, ...editForm } : r));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setRisks(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  const scoreColor = (s: number) => s >= 16 ? '#ef4444' : s >= 9 ? '#f97316' : s >= 4 ? '#f59e0b' : '#22c55e';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Risk Register</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI risk identification, scoring, and mitigation tracking</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> Register Risk</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Warning size={20} />} value={stats.total} label="Total Risks" />
        <StatCard icon={<XCircle size={20} />} value={stats.critical} label="Critical" sub={`${stats.open} Open`} />
        <StatCard icon={<CheckCircle size={20} />} value={`${stats.avgScore}/25`} label="Avg Risk Score" sub={`${stats.mitigated} Mitigated`} />
        <StatCard icon={<TrendUp size={20} />} value={stats.trendingUp} label="Trending Up" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-4">Risk by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => <span style={{ color: chart.tooltipText, fontSize: 12 }}>{value}</span>}
              />
              <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-4">Risks by Severity</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={severityData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="name" stroke={chart.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={chart.axis} tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: chart.axis, fontSize: 11 } }} />
              <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }} />
              {severityData.map((entry, i) => (
                <Bar key={i} dataKey="count" fill={entry.fill} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Search risks..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="mitigated">Mitigated</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['ID', 'Title', 'Category', 'Severity', 'Status', 'Score', 'L', 'I', 'Owner', 'Trend', 'Last Updated', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const rc = severityColor(r.severity);
                const sc = statusColor(r.status);
                return (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))/50] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[220px]">
                      <div className="truncate" title={r.title}>{r.title}</div>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{r.category}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-bold" style={{ color: scoreColor(r.score), background: `${scoreColor(r.score)}20`, border: `1px solid ${scoreColor(r.score)}50` }}>{r.score}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-[hsl(var(--text-1))]">{r.likelihood}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-[hsl(var(--text-1))]">{r.impact}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))] text-xs">{r.owner}</td>
                    <td className="px-4 py-3"><TrendIcon t={r.trending} /></td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(r.lastUpdated)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(r)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(r)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected && !editOpen} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[640px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Warning size={18} /> {selected.title}
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Category', selected.category], ['Severity', selected.severity],
                      ['Status', selected.status], ['Risk Score', `${selected.score}/25`],
                      ['Likelihood', `${selected.likelihood}/5`], ['Impact', `${selected.impact}/5`],
                      ['Owner', selected.owner], ['Linked Model', selected.linkedModel || '—'],
                      ['Created', formatDate(selected.createdDate)], ['Last Updated', formatDate(selected.lastUpdated)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                        <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                        <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="mitigations" className="space-y-2">
                  <div className="text-xs text-[hsl(var(--text-4))] mb-2">Mitigation actions for {selected.id}</div>
                  {selected.mitigations.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                      <div className="w-5 h-5 mt-0.5 border border-[hsl(var(--border))] flex items-center justify-center text-xs text-[hsl(var(--text-4))]">{i + 1}</div>
                      <div className="text-sm text-[hsl(var(--text-1))]">{m}</div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Risk — {selected?.id}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Title</label>
              <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Owner</label>
              <Input value={editForm.owner} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Description</label>
              <textarea
                className="w-full mt-1 px-3 py-2 text-sm bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--text-1))] resize-none"
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
