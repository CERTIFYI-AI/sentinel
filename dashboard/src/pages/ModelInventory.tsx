import { useState } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Robot, CheckCircle, Warning, XCircle,
  ArrowUp, ArrowDown, Minus
} from '@phosphor-icons/react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { MODELS, severityColor, statusColor, formatDate, formatNumber } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const StatCard = ({ icon, value, label, sub }: { icon: React.ReactNode; value: string | number; label: string; sub?: string }) => (
  <Card className="p-4 flex items-start gap-3">
    <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
    <div>
      <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
      <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      {sub && <div className="text-xs text-[hsl(var(--text-4))]">{sub}</div>}
    </div>
  </Card>
);

const SeverityBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = {
    unacceptable: 'bg-red-900/30 text-red-400 border border-red-700',
    high: 'bg-orange-900/30 text-orange-400 border border-orange-700',
    limited: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
    minimal: 'bg-green-900/30 text-green-400 border border-green-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium ${colors[tier] || colors.minimal}`}>
      {tier}
    </span>
  );
};

const DriftBadge = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    stable: { color: 'text-green-400', icon: <CheckCircle size={14} /> },
    warning: { color: 'text-yellow-400', icon: <Warning size={14} /> },
    critical: { color: 'text-red-400', icon: <XCircle size={14} /> },
  };
  const item = map[status] || map.stable;
  return (
    <span className={`flex items-center gap-1 text-xs ${item.color}`}>
      {item.icon} {status}
    </span>
  );
};

export default function ModelInventory() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selected, setSelected] = useState<typeof MODELS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof MODELS[0] | null>(null);
  const [models, setModels] = useState(MODELS);
  const [editForm, setEditForm] = useState({ name: '', version: '', owner: '', department: '' });

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.owner.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchRisk = riskFilter === 'all' || m.riskTier === riskFilter;
    return matchSearch && matchStatus && matchRisk;
  });

  const stats = {
    total: models.length,
    production: models.filter(m => m.status === 'production').length,
    driftAlerts: models.filter(m => m.driftStatus === 'warning' || m.driftStatus === 'critical').length,
    highRisk: models.filter(m => m.riskTier === 'high' || m.riskTier === 'unacceptable').length,
  };

  const handleEdit = (m: typeof MODELS[0]) => {
    setEditForm({ name: m.name, version: m.version, owner: m.owner, department: m.department });
    setSelected(m);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setModels(prev => prev.map(m => m.id === selected?.id ? { ...m, ...editForm } : m));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setModels(prev => prev.filter(m => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Model Inventory</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI/ML model registry and compliance tracking</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} /> Register Model
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Robot size={20} />} value={stats.total} label="Total Models" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.production} label="In Production" />
        <StatCard icon={<Warning size={20} />} value={stats.driftAlerts} label="Drift Alerts" />
        <StatCard icon={<XCircle size={20} />} value={stats.highRisk} label="High Risk" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Risk Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Tiers</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="unacceptable">Unacceptable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['ID', 'Name', 'Version', 'Type', 'Owner', 'Status', 'Risk Tier', 'Fairness', 'Drift', 'Last Validated', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const sc = statusColor(m.status);
                return (
                  <tr key={m.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))/50] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{m.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{m.name}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.version}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.type}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.owner}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge tier={m.riskTier} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={m.fairnessScore} className="w-16 h-1.5" />
                        <span className="text-xs text-[hsl(var(--text-3))]">{m.fairnessScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><DriftBadge status={m.driftStatus} /></td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))]">{formatDate(m.lastValidated)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(m)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(m)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(m)}>
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
        <SheetContent className="w-[720px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Robot size={18} /> {selected.name}
                  <span className="text-xs font-mono text-[hsl(var(--text-4))] ml-1">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="bias">Bias & Fairness</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Version', selected.version], ['Framework', selected.framework],
                      ['Department', selected.department], ['Owner', selected.owner],
                      ['Risk Tier', selected.riskTier], ['Status', selected.status],
                      ['Accuracy', selected.accuracy + '%'], ['Latency', selected.latencyMs + ' ms'],
                      ['Monthly Inferences', selected.monthlyInferences], ['EU AI Act', selected.euAiActArticle],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                        <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                        <div className="text-sm text-[hsl(var(--text-1))] mt-0.5 font-medium">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Guardrails</div>
                    <div className="space-y-2">
                      {selected.guardrails.map(g => (
                        <div key={g.name} className="flex items-center justify-between p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${g.enabled ? 'bg-green-400' : 'bg-[hsl(var(--text-4))]'}`} />
                            <span className="text-sm text-[hsl(var(--text-1))]">{g.name}</span>
                          </div>
                          <span className="text-xs text-[hsl(var(--text-4))]">{g.threshold}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Compliance Mapping</div>
                    <div className="space-y-2">
                      {selected.complianceMapping.map(c => {
                        const sc = statusColor(c.status.toLowerCase());
                        return (
                          <div key={c.framework} className="flex items-center justify-between p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                            <div>
                              <div className="text-sm font-medium text-[hsl(var(--text-1))]">{c.framework}</div>
                              <div className="text-xs text-[hsl(var(--text-4))]">{c.clause}</div>
                            </div>
                            <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{c.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bias" className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-[hsl(var(--text-1))]">Overall Fairness Score</div>
                    <div className="text-2xl font-bold" style={{ color: selected.fairnessScore >= 85 ? '#4ade80' : selected.fairnessScore >= 70 ? '#facc15' : '#f87171' }}>
                      {selected.fairnessScore}%
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selected.biasMetrics.map(b => (
                      <div key={b.metric} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[hsl(var(--text-1))]">{b.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[hsl(var(--text-3))]">{(b.value * 100).toFixed(0)}%</span>
                            <span className={`text-xs px-1.5 py-0.5 ${b.status === 'Pass' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{b.status}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[hsl(var(--border))] relative">
                          <div className="h-full" style={{ width: `${b.value * 100}%`, background: b.status === 'Pass' ? '#4ade80' : '#f87171' }} />
                          <div className="absolute top-0 h-full w-0.5 bg-yellow-400" style={{ left: `${b.threshold * 100}%` }} />
                        </div>
                        <div className="text-xs text-[hsl(var(--text-4))]">Threshold: {(b.threshold * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-3 uppercase tracking-wide">Accuracy Trend (6 Months)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selected.performanceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="month" stroke={chart.axis} tick={{ fontSize: 12 }} />
                        <YAxis domain={['auto', 'auto']} stroke={chart.axis} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }} />
                        <Line type="monotone" dataKey="accuracy" stroke={chart.brand} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-3 uppercase tracking-wide">Latency Trend (ms)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selected.performanceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="month" stroke={chart.axis} tick={{ fontSize: 12 }} />
                        <YAxis stroke={chart.axis} tick={{ fontSize: 12 }} tickFormatter={v => `${v}ms`} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }} />
                        <Line type="monotone" dataKey="latency" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model — {selected?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(['name', 'version', 'owner', 'department'] as const).map(field => (
              <div key={field}>
                <label className="text-xs text-[hsl(var(--text-4))] capitalize">{field}</label>
                <Input
                  value={editForm[field]}
                  onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
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
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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
