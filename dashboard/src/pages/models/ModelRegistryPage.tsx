import { useModelsData } from "@/hooks/useModelsData";
import { downloadCsv } from "@/lib/csv";
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, Brain, CheckCircle, Warning,
  MagnifyingGlass, Funnel, Export, Siren, ShieldWarning,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Model, severityColor, statusColor, formatDate,
} from '../../data/seed';
import { recordToModel, modelToRecord } from '@/lib/modelMapping';
import { logModelActivity } from '@/services/modelDetailService';
import { useAuthStore } from '../../store/authStore';
import { useOrgName } from '../../hooks/useOrganization';

import { useChartTheme } from '../../hooks/useChartTheme';


// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fairnessColor(score: number | null, threshold = 85) {
  if (score == null) return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-4))' };  // unmeasured — neutral, not "failing"
  if (score < 75) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  if (score < threshold) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
}

function driftBadge(d: Model['driftStatus']) {
  const map: Record<string, { bg: string; color: string }> = {
    stable: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warning: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
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
    unacceptable: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    high: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    limited: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    minimal: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  };
  const s = map[tier];
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

// ── Lifecycle Stepper ────────────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  { key: 'development', label: 'Development', color: 'hsl(var(--s-in-tx))' },
  { key: 'staging', label: 'Staging', color: 'hsl(var(--brand))' },
  { key: 'production', label: 'Production', color: 'hsl(var(--s-ok-tx))' },
  { key: 'deprecated', label: 'Deprecated', color: 'hsl(var(--s-wn-tx))' },
  { key: 'retired', label: 'Retired', color: 'hsl(var(--text-4))' },
] as const;

function resolveLifecycleIndex(status: string): number {
  const s = status.toLowerCase();
  const idx = LIFECYCLE_STAGES.findIndex(st => st.key === s);
  return idx >= 0 ? idx : 0;
}


// ── Main Component ────────────────────────────────────────────────────────────

export default function ModelRegistryPage() {
  const orgName = useOrgName();
  const ct = useChartTheme();
  const navigate = useNavigate();
  const actor = useAuthStore(s => s.user?.name || s.user?.email || 'You');

  const { models: records, isLoading, saveModel, deleteModel: deleteModelRecord } = useModelsData();
  const models = useMemo<Model[]>(() => records.map(recordToModel), [records]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTab, setDetailTab] = useState('card');
  const [editModel, setEditModel] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

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

  // Persist a real review action: record it on the model's activity log, then
  // open the model so the reviewer lands where the governance actions live.
  const initiateReview = async (m: Model) => {
    try {
      await logModelActivity({ modelId: m.id, event: 'Compliance review initiated', actor, kind: 'warning' });
      toast(`Review initiated for ${m.name}`, 'info');
      navigate(`/models/inventory/${m.id}`);
    } catch {
      toast('Failed to initiate review', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteModelRecord(target.id);
      toast(`${target.name} removed`, 'error');
    } catch {
      toast('Failed to remove model', 'error');
    }
  };

  // CSV export of the (filtered) registry. Routed through downloadCsv, which is
  // formula-injection-safe: an owner name or model name of "=WEBSERVICE(...)"
  // — attacker-influenceable text that can arrive from a synced integration —
  // is neutralised so the auditor's spreadsheet renders it, never runs it
  // (CWE-1236). The previous inline exporter quoted correctly but did not.
  const exportCsv = useCallback(() => {
    const n = downloadCsv(
      `model-registry-${new Date().toISOString().slice(0, 10)}`,
      filtered,
      [
        { header: 'ID', value: m => m.id },
        { header: 'Name', value: m => m.name },
        { header: 'Type', value: m => m.type },
        { header: 'Version', value: m => m.version },
        { header: 'Risk Tier', value: m => m.riskTier },
        { header: 'Fairness %', value: m => m.fairnessScore == null ? '—' : m.fairnessScore },
        { header: 'Drift', value: m => m.driftStatus },
        { header: 'Status', value: m => m.status },
        { header: 'Owner', value: m => m.owner },
        { header: 'Last Validated', value: m => m.lastValidated },
      ],
    );
    toast(`Exported ${n} models to CSV`, 'success');
  }, [filtered, toast]);

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
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      <PageHeader
        title="Model Registry"
        subtitle={`${orgName} · Enterprise AI Model Governance Registry`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}
              style={{ borderRadius: 0 }} title="Export current view to CSV">
              <Export className="h-4 w-4" />Export CSV
            </Button>
            <Button onClick={() => setRegisterOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus className="h-4 w-4" />Register Model
            </Button>
          </div>
        }
      />

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
        <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-bg))' }}>
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
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: 'hsl(var(--text-4))' }}>
              <Brain size={32} className="mb-2 opacity-40" />
              {models.length === 0 ? (
                <>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No models registered yet</p>
                  <p className="text-xs mt-1">Register your first AI model to begin governance tracking.</p>
                  <Button onClick={() => setRegisterOpen(true)} className="mt-3" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                    <Plus className="h-4 w-4" />Register Model
                  </Button>
                </>
              ) : (
                <p className="text-sm">No models match your filters</p>
              )}
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
                          borderLeft: isCritical ? '4px solid hsl(var(--s-er-tx))' : '4px solid transparent',
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
                            {m.fairnessScore == null ? '—' : `${m.fairnessScore}%`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{driftBadge(m.driftStatus)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>
                              {m.status}
                            </Badge>
                            <div className="flex items-center gap-0.5">
                              {LIFECYCLE_STAGES.map((stage, idx) => {
                                const activeIdx = resolveLifecycleIndex(m.status);
                                const isActive = idx === activeIdx;
                                const isPast = idx < activeIdx;
                                return (
                                  <div key={stage.key} className="flex items-center">
                                    <div
                                      title={stage.label}
                                      style={{
                                        width: isActive ? 8 : 6,
                                        height: isActive ? 8 : 6,
                                        borderRadius: 0,
                                        background: isActive || isPast ? stage.color : 'hsl(var(--border))',
                                        border: isActive ? `1px solid ${stage.color}` : 'none',
                                      }}
                                    />
                                    {idx < LIFECYCLE_STAGES.length - 1 && (
                                      <div style={{ width: 4, height: 1, background: isPast ? LIFECYCLE_STAGES[idx].color : 'hsl(var(--border))' }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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
                              title="Edit model" aria-label={`Edit ${m.name}`}
                              onClick={() => setEditModel(m)}>
                              <PencilSimple size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              title="Delete model" aria-label={`Delete ${m.name}`}
                              onClick={() => setDeleteTarget(m)}>
                              <Trash size={14} />
                            </Button>
                            {isCritical && (
                              <Button size="sm" className="h-7 px-2 text-xs" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
                                onClick={() => initiateReview(m)}>
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


      {/* Edit Dialog */}
      <Dialog open={!!editModel} onOpenChange={() => setEditModel(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editModel?.name}</DialogTitle>
          </DialogHeader>
          {editModel && (
            <EditModelForm
              model={editModel}
              onSave={async (updated) => {
                setEditModel(null);
                try {
                  await saveModel({ ...modelToRecord(updated), id: updated.id });
                  toast(`${updated.name} updated`);
                } catch {
                  toast('Failed to update model', 'error');
                }
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
            onSubmit={async (newModel) => {
              setRegisterOpen(false);
              try {
                // Omit the UI display id so the DB generates a uuid on insert.
                await saveModel(modelToRecord(newModel));
                toast(`${newModel.name} registered`);
              } catch {
                toast('Failed to register model', 'error');
              }
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
  const [riskTier, setRiskTier] = useState<Model['riskTier']>(model.riskTier);
  const [intendedUse, setIntendedUse] = useState(model.description || '');
  const [trainingData, setTrainingData] = useState('');
  const [fairnessThreshold, setFairnessThreshold] = useState(String(model.fairnessScore || 85));
  const [isHighRisk, setIsHighRisk] = useState(model.riskTier === 'high' || model.riskTier === 'unacceptable');

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Version</label>
          <Input value={version} onChange={e => setVersion(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Risk Classification *</label>
        <Select value={riskTier} onValueChange={v => setRiskTier(v as Model['riskTier'])}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {(['unacceptable', 'high', 'limited', 'minimal'] as const).map(r =>
              <SelectItem key={r} value={r}>{r === 'unacceptable' ? 'Prohibited' : r.charAt(0).toUpperCase() + r.slice(1) + ' Risk'}</SelectItem>
            )}
          </SelectContent>
        </Select>
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
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Training Data Sources</label>
        <Input value={trainingData} onChange={e => setTrainingData(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. DS-001, DS-002" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Fairness Threshold (%)</label>
          <Input type="number" min={0} max={100} value={fairnessThreshold} onChange={e => setFairnessThreshold(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
      </div>
      <div className="flex items-center gap-2 py-1">
        <input type="checkbox" checked={isHighRisk} onChange={e => setIsHighRisk(e.target.checked)}
          className="h-4 w-4" style={{ borderRadius: 0 }} />
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>EU AI Act High-Risk AI System (Annex III)</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({
          ...model, name, version, owner, status,
          riskTier: isHighRisk ? 'high' : riskTier,
          description: intendedUse,
          fairnessScore: Number(fairnessThreshold) || model.fairnessScore,
        })}
          style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
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
  const [businessOwner, setBusinessOwner] = useState('');
  const [technicalOwner, setTechnicalOwner] = useState('');
  const [department, setDepartment] = useState('');
  const [dataClass, setDataClass] = useState('Internal');
  const [deploymentEnv, setDeploymentEnv] = useState('Cloud (SaaS)');
  const [humanOversight, setHumanOversight] = useState(true);
  const [isHighRisk, setIsHighRisk] = useState(false);

  // High-risk AI systems (Annex III) legally require human oversight (Art. 14).
  const oversight = isHighRisk ? true : humanOversight;
  const canSubmit = Boolean(name && version && riskTier && businessOwner);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const newModel: Model = {
      id: nextId, name, version, type: modelType, owner: businessOwner, status: 'development',
      riskTier: isHighRisk ? 'high' : riskTier, fairnessScore: null, driftStatus: 'stable',
      lastValidated: '', framework: 'EU AI Act', department, description: intendedUse || name,
      // Brand-new model: no telemetry yet, so metrics are unmeasured (null → "—"),
      // never a fabricated 0. Matches recordToModel once it reloads from the DB.
      accuracy: null, latencyMs: null, monthlyInferences: '—', euAiActArticle: isHighRisk ? 'Annex III' : 'Art. 52',
      biasMetrics: [], performanceHistory: [], guardrails: [], complianceMapping: [],
      incidents: [], lifecyclePhase: 'Registration', daysInPhase: 0, lifecycleProgress: 5,
      provider, businessOwner, technicalOwner, dataClassification: dataClass,
      deploymentEnv, humanOversight: oversight, intendedPurpose: intendedUse,
      knownLimitations: limitations, trainingDataSources: trainingData, technicalDocs: [],
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
      {/* Accountability — business + technical owner + BU */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Business Owner *</label>
          <Input value={businessOwner} onChange={e => setBusinessOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Accountable owner" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Technical Owner</label>
          <Input value={technicalOwner} onChange={e => setTechnicalOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="ML/eng lead" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Department / Business Unit</label>
          <Input value={department} onChange={e => setDepartment(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Lending, Fraud" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Fairness Threshold (%)</label>
          <Input type="number" value={fairnessThreshold} onChange={e => setFairnessThreshold(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
      </div>
      {/* Classification — data sensitivity + deployment surface */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Data Classification</label>
          <Select value={dataClass} onValueChange={setDataClass}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['Public', 'Internal', 'Confidential', 'Restricted', 'PII / Special Category'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Deployment Environment</label>
          <Select value={deploymentEnv} onValueChange={setDeploymentEnv}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['Cloud (SaaS)', 'Cloud (Self-hosted)', 'On-Premise', 'Hybrid', 'Edge / Device'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Governance flags */}
      <div className="space-y-1.5 py-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isHighRisk} onChange={e => setIsHighRisk(e.target.checked)} className="h-4 w-4" style={{ borderRadius: 0 }} />
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>EU AI Act High-Risk AI System (Annex III)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer" title={isHighRisk ? 'Mandatory for high-risk systems (Art. 14)' : undefined}>
          <input type="checkbox" checked={oversight} disabled={isHighRisk} onChange={e => setHumanOversight(e.target.checked)} className="h-4 w-4" style={{ borderRadius: 0 }} />
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Human oversight in place (Art. 14){isHighRisk && <span className="ml-1 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>— required for high-risk</span>}</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? 'hsl(var(--bg-surface))' : undefined }}>
          <Plus size={14} />Register Model
        </Button>
      </div>
    </div>
  );
}
