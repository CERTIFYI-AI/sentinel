import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, Brain, CheckCircle, Warning,
  MagnifyingGlass, Funnel, Export, Siren, ChartLine, FilePdf,
  ShieldWarning, ArrowUp, ArrowDown, Minus, Info,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  MODELS, Model, severityColor, statusColor, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fairnessColor(score: number, threshold = 85) {
  if (score < 75) return { bg: 'hsl(0 72% 51% / 0.15)', text: 'hsl(var(--destructive))' };
  if (score < threshold) return { bg: 'hsl(45 93% 47% / 0.15)', text: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(var(--s-ok-tx))' };
}

function driftBadge(d: Model['driftStatus']) {
  const map: Record<string, { bg: string; color: string }> = {
    stable: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
    warning: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    critical: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  };
  const s = map[d];
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {d.charAt(0).toUpperCase() + d.slice(1)}
    </Badge>
  );
}

function riskTierBadge(tier: Model['riskTier']) {
  const map: Record<string, { bg: string; color: string }> = {
    unacceptable: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
    high: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
    limited: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    minimal: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
  };
  const s = map[tier];
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ModelInventoryPage() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();

  const [models, setModels] = useState<Model[]>(MODELS);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [detailTab, setDetailTab] = useState('card');
  const [editModel, setEditModel] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const totalModels = models.length;
  const production = models.filter(m => m.status === 'production').length;
  const driftAlerts = models.filter(m => m.driftStatus === 'warning' || m.driftStatus === 'critical').length;
  const highRisk = models.filter(m => m.riskTier === 'high' || m.riskTier === 'unacceptable').length;

  // Filters
  const filtered = models.filter(m => {
    const matchSearch = m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.owner.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || m.riskTier === riskFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchRisk && matchStatus;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    setModels(prev => prev.filter(m => m.id !== deleteTarget.id));
    toast(`${deleteTarget.id} ${deleteTarget.name} removed`, 'error');
    setDeleteTarget(null);
  };

  // Drift performance data for the detail chart (12 months)
  const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Model Inventory</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · EU AI Act compliant AI model registry</p>
        </div>
        <Button onClick={() => setRegisterOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus className="h-4 w-4 mr-2" />Register Model
        </Button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Models', value: totalModels, color: 'hsl(var(--text-1))', icon: Brain },
          { label: 'Production', value: production, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'Drift Alerts', value: driftAlerts, color: 'hsl(var(--s-wn-tx))', icon: Warning },
          { label: 'High-Risk (EU AI Act)', value: highRisk, color: 'hsl(var(--destructive))', icon: ShieldWarning },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Drift Banner */}
      {driftAlerts > 0 && (
        <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}>
          <Siren size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {driftAlerts} models require immediate attention — EU AI Act Art. 9 obligations triggered
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>
              Models with drift alerts must be reviewed and documented per Article 9 risk management requirements.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-52 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search models..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Risk Tier" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Risk Tiers</SelectItem>
            {['high', 'limited', 'minimal'].map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {['production', 'staging', 'development', 'retired'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} models</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Brain size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No models match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Name', 'Type', 'Version', 'Risk Tier', 'Fairness %', 'Drift', 'Status', 'Owner', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const fc = fairnessColor(m.fairnessScore);
                    const isCritical = m.driftStatus === 'critical';
                    const sc = statusColor(m.status);
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-muted/30 transition-colors"
                        style={{
                          borderBottom: '1px solid hsl(var(--border))',
                          borderLeft: isCritical ? '4px solid hsl(0 72% 51%)' : '4px solid transparent',
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{m.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.type}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{m.version}</td>
                        <td className="px-4 py-3">{riskTierBadge(m.riskTier)}</td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: fc.bg, color: fc.text, borderRadius: 0, fontSize: 11, fontWeight: 600 }}>
                            {m.fairnessScore}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{driftBadge(m.driftStatus)}</td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.owner}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              title="View model detail"
                              onClick={() => navigate(`/models/inventory/${m.id}`)}>
                              <Eye size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setEditModel(m)}>
                              <PencilSimple size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setDeleteTarget(m)}>
                              <Trash size={14} />
                            </Button>
                            {isCritical && (
                              <Button size="sm" className="h-7 px-2 text-xs" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: '#fff' }}
                                onClick={() => toast(`Review initiated for ${m.name}`, 'info')}>
                                Initiate Review
                              </Button>
                            )}
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description={`This will permanently remove ${deleteTarget?.id} from the model registry. This action cannot be undone.`}
        confirmLabel="Delete Model"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Model Detail Sheet */}
      <Sheet open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selectedModel?.name} <span className="text-xs font-mono font-normal" style={{ color: 'hsl(var(--text-4))' }}>{selectedModel?.id}</span>
            </SheetTitle>
          </SheetHeader>
          {selectedModel && (
            <div className="mt-4 overflow-y-auto h-[calc(100vh-120px)]">
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="card" style={{ borderRadius: 0 }}>Model Card</TabsTrigger>
                  <TabsTrigger value="performance" style={{ borderRadius: 0 }}>Performance</TabsTrigger>
                  <TabsTrigger value="bias" style={{ borderRadius: 0 }}>Bias History</TabsTrigger>
                  <TabsTrigger value="docs" style={{ borderRadius: 0 }}>Technical Docs</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                {/* Model Card Tab */}
                <TabsContent value="card" className="mt-4 space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {riskTierBadge(selectedModel.riskTier)}
                    <Badge style={{ ...statusColor(selectedModel.status), borderRadius: 0, fontSize: 10 }}>
                      {selectedModel.status}
                    </Badge>
                    {driftBadge(selectedModel.driftStatus)}
                    {selectedModel.type.includes('LLM') && (
                      <Badge style={{ background: 'hsl(270 70% 56% / 0.15)', color: 'hsl(270 70% 56%)', borderRadius: 0, fontSize: 10 }}>
                        GPAI / LLM
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Intended Purpose</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.description}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Known Limitations</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {selectedModel.biasMetrics.filter(b => b.status === 'Fail').length > 0
                          ? `Fairness failures in: ${selectedModel.biasMetrics.filter(b => b.status === 'Fail').map(b => b.metric).join(', ')}`
                          : 'No known limitations documented'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Risk Classification</p>
                      <p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.riskTier.toUpperCase()} — {selectedModel.euAiActArticle}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                      <p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.owner}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Department</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.department}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Last Validated</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedModel.lastValidated)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Monthly Inferences</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.monthlyInferences}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(var(--text-4))' }}>Lifecycle Phase</p>
                      <p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.lifecyclePhase} ({selectedModel.daysInPhase}d)</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }}
                      onClick={() => toast('Model card exported as PDF', 'info')}>
                      <FilePdf size={14} className="mr-1" />Export as PDF
                    </Button>
                  </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Accuracy</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.accuracy}%</p>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Latency</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedModel.latencyMs}ms</p>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Fairness</p>
                      <p className="text-lg font-bold" style={{ color: fairnessColor(selectedModel.fairnessScore).text }}>{selectedModel.fairnessScore}%</p>
                    </div>
                  </div>

                  {/* Fairness trend chart */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Accuracy Trend (6 Months)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selectedModel.performanceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: ct.axis, fontSize: 10 }}
                          label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }} />
                        <RechartsTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                        <Line type="monotone" dataKey="accuracy" stroke={ct.brand} strokeWidth={2} dot={false} name="Accuracy %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Drift score with threshold */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Drift Score (threshold: 0.20)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={selectedModel.performanceHistory.map((p, idx) => ({
                        month: p.month,
                        drift: selectedModel.driftStatus === 'critical'
                          ? [0.08, 0.10, 0.12, 0.18, 0.24, 0.28][idx] || 0.15
                          : selectedModel.driftStatus === 'warning'
                            ? [0.05, 0.06, 0.08, 0.12, 0.16, 0.19][idx] || 0.10
                            : [0.03, 0.04, 0.03, 0.05, 0.04, 0.04][idx] || 0.04,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                        <YAxis domain={[0, 0.4]} tick={{ fill: ct.axis, fontSize: 10 }}
                          label={{ value: 'Drift Score', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }} />
                        <RechartsTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                        <ReferenceLine y={0.20} stroke="hsl(0 72% 51%)" strokeDasharray="5 5" label={{ value: 'Threshold', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
                        <Line type="monotone" dataKey="drift" stroke="hsl(45 93% 47%)" strokeWidth={2} dot={false} name="Drift Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                {/* Bias History Tab */}
                <TabsContent value="bias" className="mt-4 space-y-4">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Bias Metrics — Current</p>
                  <div className="space-y-2">
                    {selectedModel.biasMetrics.map((bm, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{bm.metric}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Threshold: {bm.threshold}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold" style={{ color: bm.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>
                            {bm.value}
                          </span>
                          <Badge style={{
                            background: bm.status === 'Pass' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(0 72% 51% / 0.15)',
                            color: bm.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                            borderRadius: 0, fontSize: 10,
                          }}>
                            {bm.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Technical Docs Tab */}
                <TabsContent value="docs" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Framework Compliance</p>
                      <div className="mt-2 space-y-2">
                        {selectedModel.complianceMapping.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span style={{ color: 'hsl(var(--text-1))' }}>{c.framework} — {c.clause}</span>
                            <Badge style={{ ...statusColor(c.status.toLowerCase().replace('-', '_').replace(' ', '_')), borderRadius: 0, fontSize: 10 }}>
                              {c.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Guardrails</p>
                      <div className="mt-2 space-y-2">
                        {selectedModel.guardrails.map((g, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span style={{ color: 'hsl(var(--text-1))' }}>{g.name}: {g.threshold}</span>
                            <Badge style={{
                              background: g.enabled ? 'hsl(142 71% 45% / 0.15)' : 'hsl(var(--s-nt-bg))',
                              color: g.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-nt-tx))',
                              borderRadius: 0, fontSize: 10,
                            }}>
                              {g.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Incident History</p>
                  {selectedModel.incidents.length === 0 ? (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No incidents recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedModel.incidents.map((inc, idx) => {
                        const sc = severityColor(inc.severity);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{inc.id} — {inc.type}</p>
                              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(inc.date)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>{inc.severity}</Badge>
                              <Badge style={{
                                background: inc.resolved ? 'hsl(142 71% 45% / 0.15)' : 'hsl(0 72% 51% / 0.15)',
                                color: inc.resolved ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                                borderRadius: 0, fontSize: 10,
                              }}>
                                {inc.resolved ? 'Resolved' : 'Open'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editModel} onOpenChange={() => setEditModel(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Edit {editModel?.name}</DialogTitle>
          </DialogHeader>
          {editModel && (
            <EditModelForm
              model={editModel}
              onSave={(updated) => {
                setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
                toast(`${updated.id} updated`);
                setEditModel(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Register Model Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Model</DialogTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>EU AI Act compliant model registration</p>
          </DialogHeader>
          <RegisterModelForm
            onSubmit={(newModel) => {
              setModels(prev => [...prev, newModel]);
              toast(`${newModel.id} ${newModel.name} registered`);
              setRegisterOpen(false);
            }}
            nextId={`MDL-${String(models.length + 1).padStart(3, '0')}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Edit Model Form ───────────────────────────────────────────────────────────

function EditModelForm({ model, onSave }: { model: Model; onSave: (m: Model) => void }) {
  const [name, setName] = useState(model.name);
  const [version, setVersion] = useState(model.version);
  const [owner, setOwner] = useState(model.owner);
  const [status, setStatus] = useState(model.status);

  return (
    <div className="space-y-3 py-2">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Version</label>
        <Input value={version} onChange={e => setVersion(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner</label>
        <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</label>
        <Select value={status} onValueChange={v => setStatus(v as Model['status'])}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['production', 'staging', 'development', 'retired'].map(s =>
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({ ...model, name, version, owner, status })}
          style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Register Model Form ───────────────────────────────────────────────────────

function RegisterModelForm({ onSubmit, nextId }: { onSubmit: (m: Model) => void; nextId: string }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [provider, setProvider] = useState('');
  const [modelType, setModelType] = useState('ML — Classification');
  const [riskTier, setRiskTier] = useState<Model['riskTier']>('limited');
  const [intendedUse, setIntendedUse] = useState('');
  const [limitations, setLimitations] = useState('');
  const [trainingData, setTrainingData] = useState('');
  const [fairnessThreshold, setFairnessThreshold] = useState('85');
  const [owner, setOwner] = useState('');
  const [isHighRisk, setIsHighRisk] = useState(false);

  const canSubmit = name && version && riskTier && owner;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const newModel: Model = {
      id: nextId, name, version, type: modelType, owner, status: 'development',
      riskTier: isHighRisk ? 'high' : riskTier, fairnessScore: 0, driftStatus: 'stable',
      lastValidated: '', framework: 'EU AI Act', department: '', description: intendedUse || name,
      accuracy: 0, latencyMs: 0, monthlyInferences: '0', euAiActArticle: isHighRisk ? 'Annex III' : 'Art. 52',
      biasMetrics: [], performanceHistory: [], guardrails: [], complianceMapping: [],
      incidents: [], lifecyclePhase: 'Registration', daysInPhase: 0, lifecycleProgress: 5,
    };
    onSubmit(newModel);
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Model name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Version *</label>
          <Input value={version} onChange={e => setVersion(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="v1.0.0" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Provider</label>
        <Input value={provider} onChange={e => setProvider(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. OpenAI, Internal" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
          <Select value={modelType} onValueChange={setModelType}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['GPAI / LLM', 'Task-specific ML', 'ML — Classification', 'ML — Regression', 'ML — NLP', 'ML — Anomaly Detection'].map(t =>
                <SelectItem key={t} value={t}>{t}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Risk Classification *</label>
          <Select value={riskTier} onValueChange={v => setRiskTier(v as Model['riskTier'])}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['high', 'limited', 'minimal'].map(r =>
                <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)} Risk</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Intended Use (max 256 chars)</label>
        <textarea value={intendedUse} onChange={e => setIntendedUse(e.target.value.slice(0, 256))}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe the intended use of this model..." />
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{intendedUse.length}/256</p>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Known Limitations</label>
        <Input value={limitations} onChange={e => setLimitations(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Describe known limitations" />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Training Data Sources</label>
        <Input value={trainingData} onChange={e => setTrainingData(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. DS-001, DS-002" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Fairness Threshold (%)</label>
          <Input type="number" value={fairnessThreshold} onChange={e => setFairnessThreshold(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Owner name" />
        </div>
      </div>
      <div className="flex items-center gap-2 py-1">
        <input type="checkbox" checked={isHighRisk} onChange={e => setIsHighRisk(e.target.checked)}
          className="h-4 w-4" style={{ borderRadius: 0 }} />
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>EU AI Act High-Risk AI System (Annex III)</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? '#fff' : undefined }}>
          <Plus size={14} className="mr-1" />Register Model
        </Button>
      </div>
    </div>
  );
}
