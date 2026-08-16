import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye, MagnifyingGlass, Funnel, Export, Plus, Warning,
  ShieldCheck, Clock, User, GridFour,
  X, Scales, Target,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRisksData, type RiskRecord } from '../../hooks/useRisksData';
import { useModelsData } from '../../hooks/useModelsData';
import { useIncidents } from '../../hooks/useRiskIncidents';
import { fetchAllControls } from '../../services/controlService';

// ── Types ────────────────────────────────────────────────────────────────────

interface RiskItem {
  id: string;
  riskId: string | null;       // business code (e.g. RSK-001); id stays the uuid key
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  residualLikelihood: number | null;
  residualImpact: number | null;
  owner: string;
  treatmentStatus: string;
  overdue: boolean;
  frameworkMapping: string[];
  treatmentPlan: string;
  controlIds: string[];
  modelIds: string[];
  incidentIds: string[];
  createdDate: string;
  lastUpdated: string;
  deadline: string | null;
}

const DEFAULT_CATEGORIES = ['AI Model', 'Data', 'Operational', 'Compliance', 'Security', 'Third-Party'];

// ── Mapping: RiskRecord (risks table) → RiskItem (UI) ────────────────────────

function toItem(r: RiskRecord): RiskItem {
  const status = r.status || 'Open';
  const settled = /mitigated|closed|resolved|accepted/i.test(status);
  const overdue = !!r.deadline && !settled && new Date(r.deadline).getTime() < Date.now();
  return {
    id: r.id,
    riskId: r.risk_id ?? null,
    title: r.title,
    description: r.description ?? '',
    category: r.category || 'Uncategorized',
    likelihood: r.likelihood,
    impact: r.impact,
    score: r.risk_score,
    residualLikelihood: r.residual_likelihood ?? null,
    residualImpact: r.residual_impact ?? null,
    owner: r.owner || '',
    treatmentStatus: status.replace(/^[a-z]/, c => c.toUpperCase()),
    overdue,
    frameworkMapping: r.frameworks ?? [],
    treatmentPlan: r.mitigation ?? '',
    controlIds: r.linked_control_ids ?? [],
    modelIds: r.linked_model_ids ?? [],
    incidentIds: r.linked_incident_ids ?? [],
    createdDate: (r.created_at ?? '').slice(0, 10),
    lastUpdated: (r.updated_at ?? '').slice(0, 10),
    deadline: r.deadline ? r.deadline.slice(0, 10) : null,
  };
}

// ── Score Color Helper ───────────────────────────────────────────────────────

function scoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 20) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))', label: 'Critical' };
  if (score >= 12) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', label: 'High' };
  if (score >= 6) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', label: 'Medium' };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Low' };
}

function treatmentColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (/mitigated|closed|resolved/.test(s)) return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  if (/in progress|mitigating/.test(s)) return { bg: 'hsl(217 91% 60% / 0.15)', text: 'hsl(var(--s-in-tx))' };
  if (/accepted/.test(s)) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  if (/overdue/.test(s)) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))' };
  // open / planned / monitoring / anything else
  return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
}

function categoryColor(cat: string): { bg: string; text: string } {
  const c = cat.toLowerCase();
  if (/model|ai\b/.test(c)) return { bg: 'hsl(271 81% 56% / 0.15)', text: 'hsl(271 81% 66%)' };
  if (/data|privacy|gdpr/.test(c)) return { bg: 'hsl(217 91% 60% / 0.15)', text: 'hsl(var(--s-in-tx))' };
  if (/operational|governance/.test(c)) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  if (/compliance|regulatory|ethics/.test(c)) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))' };
  if (/security|cyber/.test(c)) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(25 95% 63%)' };
  return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
}

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))', border: 'hsl(var(--s-er-bg))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-bg))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-bg))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── 5x5 Heat Map ─────────────────────────────────────────────────────────────

function riskShortLabel(r: RiskItem): string {
  // Prefer the business code (RSK-001). Legacy ids read like 'risk-001';
  // uuid ids are truncated for the cell chip — never shown in full.
  if (r.riskId) return r.riskId;
  return r.id.length > 10 ? r.id.slice(0, 6) : r.id;
}

function HeatMap({ risks, onCellClick }: { risks: RiskItem[]; onCellClick: (r: RiskItem) => void }) {
  const matrix: Record<string, RiskItem[]> = {};
  risks.forEach(r => {
    const key = `${r.likelihood}-${r.impact}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(r);
  });

  const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <GridFour size={16} style={{ color: 'hsl(var(--text-4))' }} />
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Heat Map (Likelihood x Impact)</span>
        </div>
        <div className="flex items-end gap-2">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center mr-1" style={{ minHeight: 280 }}>
            <span className="text-[10px] font-medium" style={{
              color: 'hsl(var(--text-4))',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}>Likelihood</span>
          </div>
          {/* Y-axis values */}
          <div className="flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map(l => (
              <div key={l} className="flex items-center justify-end" style={{ height: 52, width: 80 }}>
                <span className="text-[10px] mr-2" style={{ color: 'hsl(var(--text-4))' }}>{l} — {likelihoodLabels[l - 1]}</span>
              </div>
            ))}
          </div>
          {/* Grid */}
          <div>
            <div className="grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map(l =>
                [1, 2, 3, 4, 5].map(i => {
                  const s = l * i;
                  const sc = scoreColor(s);
                  const cellRisks = matrix[`${l}-${i}`] || [];
                  return (
                    <div
                      key={`${l}-${i}`}
                      className="flex flex-col items-center justify-center gap-0.5"
                      style={{
                        width: 80,
                        height: 52,
                        background: sc.bg,
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 0,
                        cursor: cellRisks.length > 0 ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (cellRisks.length === 1) onCellClick(cellRisks[0]);
                      }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: sc.text }}>{s}</span>
                      {cellRisks.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {cellRisks.slice(0, 3).map(r => (
                            <span
                              key={r.id}
                              className="text-[8px] font-mono px-1"
                              title={r.title}
                              style={{
                                background: sc.text,
                                color: 'hsl(var(--bg-surface))',
                                borderRadius: 0,
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); onCellClick(r); }}
                            >
                              {riskShortLabel(r)}
                            </span>
                          ))}
                          {cellRisks.length > 3 && (
                            <span className="text-[8px] font-mono" style={{ color: sc.text }}>+{cellRisks.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {/* X-axis labels */}
            <div className="grid grid-cols-5 gap-1 mt-1">
              {impactLabels.map((label, idx) => (
                <div key={idx} className="text-center" style={{ width: 80 }}>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{idx + 1} — {label}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-1">
              <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>Impact</span>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>Legend:</span>
          {[
            { label: 'Critical (>=20)', color: 'hsl(var(--destructive))' },
            { label: 'High (12-19)', color: 'hsl(var(--s-wn-tx))' },
            { label: 'Medium (6-11)', color: 'hsl(var(--s-wn-tx))' },
            { label: 'Low (<6)', color: 'hsl(var(--s-ok-tx))' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div style={{ width: 10, height: 10, background: l.color, borderRadius: 0, opacity: 0.3 }} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mini Matrix for Detail Drawer ────────────────────────────────────────────

function MiniMatrix({ likelihood, impact }: { likelihood: number; impact: number }) {
  const cells = [];
  for (let row = 5; row >= 1; row--) {
    for (let col = 1; col <= 5; col++) {
      const s = row * col;
      const sc = scoreColor(s);
      const isActive = row === likelihood && col === impact;
      cells.push(
        <div
          key={`${row}-${col}`}
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            background: sc.bg,
            border: isActive ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
            borderRadius: 0,
          }}
        >
          {isActive && (
            <div style={{ width: 10, height: 10, background: 'hsl(var(--brand))', borderRadius: '50%' }} />
          )}
        </div>
      );
    }
  }
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Impact &#8594;</span>
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col items-center justify-center mr-1">
          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Likelihood &#8594;
          </span>
        </div>
        <div className="grid grid-cols-5 gap-0.5">{cells}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function RiskRegisterNew() {
  const { orgName } = useSettingsStore();
  const { risks: records, isLoading, error, saveRisk, isSaving } = useRisksData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  // Controls lookup for resolving linked_control_ids → names (never raw uuids)
  const { data: controls = [] } = useQuery({
    queryKey: ['controls'],
    queryFn: fetchAllControls,
    staleTime: 60_000,
  });
  const controlById = useMemo(() => {
    const m = new Map<string, { ref: string; name: string }>();
    for (const c of controls as any[]) {
      if (c?.id) m.set(String(c.id), { ref: c.control_ref ?? '', name: c.name ?? c.title ?? '' });
    }
    return m;
  }, [controls]);

  // Model + incident lookups — resolve ids to names at render (never raw uuids)
  const { models } = useModelsData();
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';
  const { items: incidents } = useIncidents();
  const incidentLabel = (id: string) => {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return 'Unavailable';
    return inc.incidentId ? `${inc.incidentId} — ${inc.title}` : inc.title;
  };

  // Deep link: /risks?model=<uuid> filters to risks linked to that model
  const modelParam = searchParams.get('model');
  const clearModelFilter = () => {
    searchParams.delete('model');
    setSearchParams(searchParams, { replace: true });
  };

  const risks: RiskItem[] = useMemo(() => (records as RiskRecord[]).map(toItem), [records]);
  const selectedRisk = useMemo(
    () => risks.find(r => r.id === selectedId) ?? null,
    [risks, selectedId],
  );

  // ── Add Risk dialog state ──────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('AI Model');
  const [newLikelihood, setNewLikelihood] = useState(3);
  const [newImpact, setNewImpact] = useState(3);
  const [newDescription, setNewDescription] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newTreatment, setNewTreatment] = useState('');
  const [newFramework, setNewFramework] = useState('');

  // ── Deep link: /risks?open=<id> opens that record ──────────────────────────
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (openParam && risks.some(r => r.id === openParam)) {
      setSelectedId(openParam);
      setDetailTab('overview');
      setSheetOpen(true);
    }
  }, [openParam, risks]);

  const closeSheet = (open: boolean) => {
    setSheetOpen(open);
    if (!open && searchParams.has('open')) {
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const categories = useMemo(
    () => Array.from(new Set(risks.map(r => r.category).filter(Boolean))).sort(),
    [risks],
  );
  const addCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])),
    [categories],
  );

  const filtered = useMemo(() => {
    return risks.filter(r => {
      if (modelParam && !r.modelIds.includes(modelParam)) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase()) && !(r.riskId ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      return true;
    });
  }, [risks, search, filterCategory, modelParam]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalRisks = risks.length;
  const criticalHighCount = risks.filter(r => r.score >= 12).length;
  const mitigatedCount = risks.filter(r => /mitigated|closed|resolved/i.test(r.treatmentStatus)).length;
  const openCount = risks.filter(r => /open/i.test(r.treatmentStatus)).length;

  // ── Detail Drawer ──────────────────────────────────────────────────────────
  const openDetail = (risk: RiskItem) => {
    setSelectedId(risk.id);
    setDetailTab('overview');
    setSheetOpen(true);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Risk ID', 'Title', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Owner', 'Treatment Status', 'Framework Mapping', 'Created', 'Last Updated'];
    const rows = filtered.map(r => [
      r.id, `"${r.title.replace(/"/g, '""')}"`, r.category, r.likelihood, r.impact, r.score,
      r.owner, r.treatmentStatus, `"${r.frameworkMapping.join('; ')}"`, r.createdDate, r.lastUpdated,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `risk-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Risk register exported as CSV');
  };

  // ── Add Risk (persists via riskService; writes throw on failure) ──────────
  const handleAddRisk = async () => {
    if (!newTitle.trim()) { toast.error('Risk title is required'); return; }
    if (!newDescription.trim()) { toast.error('Description is required'); return; }
    if (!newOwner.trim()) { toast.error('Risk owner is required'); return; }
    try {
      await saveRisk({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        likelihood: newLikelihood,
        impact: newImpact,
        risk_score: newLikelihood * newImpact,
        status: 'Open',
        owner: newOwner.trim(),
        mitigation: newTreatment.trim(),
        frameworks: newFramework.trim()
          ? newFramework.split(',').map(f => f.trim()).filter(Boolean)
          : [],
      });
      // Success toast fires from the mutation only after the write resolved.
      setAddOpen(false);
      setNewTitle(''); setNewCategory('AI Model'); setNewLikelihood(3); setNewImpact(3);
      setNewDescription(''); setNewOwner(''); setNewTreatment(''); setNewFramework('');
    } catch {
      // Error toast fires from the mutation; keep the dialog open so nothing
      // the user typed is lost.
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Risk Register</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} — Enterprise AI risk inventory and treatment tracking
          </p>
        </div>
        <div role="alert" className="p-4 flex items-center gap-2" style={{
          background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--destructive))', borderRadius: 0,
        }}>
          <Warning size={16} style={{ color: 'hsl(var(--destructive))' }} />
          <span className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
            Failed to load the risk register: {(error as Error).message}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Risk Register</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} — Enterprise AI risk inventory and treatment tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            style={{ borderRadius: 0 }}
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            <Export size={14} />
            Export CSV
          </Button>
          <Button
            size="sm"
            style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
            onClick={() => setAddOpen(true)}
          >
            <Plus size={14} />
            Add Risk
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Risks" value={totalRisks} variant="default" />
        <MetricTile label="Critical / High" value={criticalHighCount} variant="error" />
        <MetricTile label="Mitigated" value={mitigatedCount} variant="ok" />
        <MetricTile label="Open" value={openCount} variant="warn" />
      </div>

      {/* Heat Map */}
      <HeatMap risks={risks} onCellClick={openDetail} />

      {/* Model-scoped filter chip (deep-link from a model) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search risks by ID or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]" style={{ borderRadius: 0 }}>
            <Funnel size={14} className="mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {risks.length} risks
        </div>
      </div>

      {/* Risk Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Risk ID', 'Title', 'Category', 'Models', 'Likelihood', 'Impact', 'Risk Score', 'Owner', 'Treatment Status', 'Framework Mapping', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No risks recorded yet</p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      Use &quot;Add Risk&quot; to register the first risk for {orgName}.
                    </p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Warning size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No risks match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const sc = scoreColor(r.score);
                  const tc = treatmentColor(r.overdue ? 'Overdue' : r.treatmentStatus);
                  const cc = categoryColor(r.category);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[hsl(var(--bg-muted))] transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      onClick={() => openDetail(r)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium" title={r.id} style={{ color: 'hsl(var(--brand))' }}>{riskShortLabel(r)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{r.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: cc.bg, color: cc.text, borderRadius: 0, fontSize: 10 }}>
                          {r.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {r.modelIds.length === 0 ? (
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {r.modelIds.slice(0, 1).map(id => (
                              <InterlinkChip
                                key={id}
                                label={modelName(id)}
                                to={`/models/inventory/${id}`}
                                onClick={e => e.stopPropagation()}
                              />
                            ))}
                            {r.modelIds.length > 1 && (
                              <span className="text-[10px] px-1" style={{ color: 'hsl(var(--text-4))' }}>
                                +{r.modelIds.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{r.likelihood}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{r.impact}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                          {r.score} — {sc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.owner || 'Unassigned'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: tc.bg, color: tc.text, borderRadius: 0, fontSize: 10 }}>
                          {r.overdue ? 'Overdue' : r.treatmentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {r.frameworkMapping.length === 0 ? (
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.frameworkMapping.slice(0, 2).map((fw, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5" style={{
                                background: 'hsl(var(--bg-muted))',
                                color: 'hsl(var(--text-4))',
                                borderRadius: 0,
                                border: '1px solid hsl(var(--border))',
                              }}>
                                {fw}
                              </span>
                            ))}
                            {r.frameworkMapping.length > 2 && (
                              <span className="text-[10px] px-1" style={{ color: 'hsl(var(--text-4))' }}>
                                +{r.frameworkMapping.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          style={{ borderRadius: 0 }}
                          onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                        >
                          <Eye size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedRisk && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" title={selectedRisk.id} style={{ color: 'hsl(var(--brand))' }}>{riskShortLabel(selectedRisk)}</span>
                  <Badge style={{ background: scoreColor(selectedRisk.score).bg, color: scoreColor(selectedRisk.score).text, borderRadius: 0, fontSize: 10, fontWeight: 700 }}>
                    Score: {selectedRisk.score}
                  </Badge>
                  <Badge style={{ background: treatmentColor(selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus).bg, color: treatmentColor(selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus).text, borderRadius: 0, fontSize: 10 }}>
                    {selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus}
                  </Badge>
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>
                  {selectedRisk.title}
                </SheetTitle>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="w-full justify-start gap-0" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  {['overview', 'assessment', 'treatment', 'controls', 'history'].map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-xs capitalize"
                      style={{ borderRadius: 0 }}
                    >
                      {tab === 'assessment' ? 'Risk Assessment' : tab === 'treatment' ? 'Treatment Plan' : tab === 'controls' ? 'Controls Linked' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    {selectedRisk.description ? (
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{selectedRisk.description}</p>
                    ) : (
                      <p className="text-sm italic" style={{ color: 'hsl(var(--text-4))' }}>No description recorded.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Category</p>
                      <Badge style={{ background: categoryColor(selectedRisk.category).bg, color: categoryColor(selectedRisk.category).text, borderRadius: 0, fontSize: 10 }}>
                        {selectedRisk.category}
                      </Badge>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                      <div className="flex items-center gap-1">
                        <User size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Created</p>
                      <div className="flex items-center gap-1">
                        <Clock size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.createdDate}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Last Updated</p>
                      <div className="flex items-center gap-1">
                        <Clock size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</p>
                    {selectedRisk.modelIds.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No models linked to this risk yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRisk.modelIds.map(id => (
                          <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Linked Incidents</p>
                    {selectedRisk.incidentIds.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No incidents linked to this risk.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRisk.incidentIds.map(id => (
                          <InterlinkChip key={id} label={incidentLabel(id)} to={`/risk/incidents?open=${id}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Framework Mapping</p>
                    {selectedRisk.frameworkMapping.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No framework references mapped yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedRisk.frameworkMapping.map((fw, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-1" style={{
                            background: 'hsl(var(--bg-muted))',
                            color: 'hsl(var(--text-3))',
                            borderRadius: 0,
                            border: '1px solid hsl(var(--border))',
                          }}>
                            <Scales size={10} className="inline mr-1" />{fw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Risk Assessment Tab */}
                <TabsContent value="assessment" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Likelihood</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.likelihood}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>of 5</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <X size={20} style={{ color: 'hsl(var(--text-4))' }} />
                    </div>
                    <div className="p-4 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Impact</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.impact}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>of 5</p>
                    </div>
                  </div>
                  <div className="p-4 text-center" style={{
                    background: scoreColor(selectedRisk.score).bg,
                    border: `2px solid ${scoreColor(selectedRisk.score).text}`,
                    borderRadius: 0,
                  }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Inherent Risk Score</p>
                    <p className="text-4xl font-bold" style={{ color: scoreColor(selectedRisk.score).text }}>
                      {selectedRisk.score}
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: scoreColor(selectedRisk.score).text }}>
                      {scoreColor(selectedRisk.score).label} Risk
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      {selectedRisk.likelihood} (Likelihood) x {selectedRisk.impact} (Impact)
                    </p>
                  </div>
                  {selectedRisk.residualLikelihood != null && selectedRisk.residualImpact != null && (
                    <div className="p-4 text-center" style={{
                      background: scoreColor(selectedRisk.residualLikelihood * selectedRisk.residualImpact).bg,
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Residual Risk Score</p>
                      <p className="text-3xl font-bold" style={{ color: scoreColor(selectedRisk.residualLikelihood * selectedRisk.residualImpact).text }}>
                        {selectedRisk.residualLikelihood * selectedRisk.residualImpact}
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: scoreColor(selectedRisk.residualLikelihood * selectedRisk.residualImpact).text }}>
                        {scoreColor(selectedRisk.residualLikelihood * selectedRisk.residualImpact).label} Residual Risk
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        {selectedRisk.residualLikelihood} (Residual Likelihood) x {selectedRisk.residualImpact} (Residual Impact)
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-4))' }}>Position on Risk Matrix</p>
                    <MiniMatrix likelihood={selectedRisk.likelihood} impact={selectedRisk.impact} />
                  </div>
                </TabsContent>

                {/* Treatment Plan Tab */}
                <TabsContent value="treatment" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Treatment Strategy</span>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge style={{ background: treatmentColor(selectedRisk.treatmentStatus).bg, color: treatmentColor(selectedRisk.treatmentStatus).text, borderRadius: 0, fontSize: 10 }}>
                        {selectedRisk.treatmentStatus}
                      </Badge>
                    </div>
                    {selectedRisk.treatmentPlan ? (
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
                        {selectedRisk.treatmentPlan}
                      </p>
                    ) : (
                      <p className="text-sm italic" style={{ color: 'hsl(var(--text-4))' }}>No treatment plan recorded yet.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Risk Owner</p>
                      <div className="flex items-center gap-1">
                        <User size={12} style={{ color: 'hsl(var(--text-3))' }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Inherent Score</p>
                      <Badge style={{ background: scoreColor(selectedRisk.score).bg, color: scoreColor(selectedRisk.score).text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                        {selectedRisk.score} — {scoreColor(selectedRisk.score).label}
                      </Badge>
                    </div>
                  </div>
                  {selectedRisk.deadline && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Treatment Deadline</p>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.deadline}</span>
                    </div>
                  )}
                  {selectedRisk.overdue && (
                    <div className="p-3 flex items-center gap-2" style={{
                      background: 'hsl(var(--s-er-bg))',
                      border: '1px solid hsl(var(--s-er-bg))',
                      borderRadius: 0,
                    }}>
                      <Warning size={16} style={{ color: 'hsl(var(--destructive))' }} />
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--destructive))' }}>
                        Treatment is overdue. Escalation required.
                      </span>
                    </div>
                  )}
                </TabsContent>

                {/* Controls Linked Tab */}
                <TabsContent value="controls" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Controls</span>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                      {selectedRisk.controlIds.length}
                    </span>
                  </div>
                  {selectedRisk.controlIds.length === 0 ? (
                    <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <ShieldCheck size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No controls linked to this risk</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRisk.controlIds.map((ctrlId) => {
                        const ctrl = controlById.get(ctrlId);
                        return (
                          <Link
                            key={ctrlId}
                            to={`/controls/${ctrlId}`}
                            className="p-3 flex items-center justify-between hover:bg-[hsl(var(--bg-surface))] transition-colors"
                            style={{
                              background: 'hsl(var(--bg-muted))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 0,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                              {ctrl ? (
                                <>
                                  {ctrl.ref && <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{ctrl.ref}</span>}
                                  <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.name || 'Unnamed control'}</span>
                                </>
                              ) : (
                                <span className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                              )}
                            </div>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>&#8250;</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      Controls are mapped to this risk to provide mitigation assurance and reduce residual risk exposure.
                    </p>
                  </div>
                </TabsContent>

                {/* History Tab — derived from real record timestamps only */}
                <TabsContent value="history" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk History</span>
                  </div>
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: 'hsl(var(--border))' }} />
                    <div className="space-y-4">
                      {[
                        ...(selectedRisk.lastUpdated && selectedRisk.lastUpdated !== selectedRisk.createdDate
                          ? [{ date: selectedRisk.lastUpdated, action: 'Risk record last updated' }]
                          : []),
                        { date: selectedRisk.createdDate, action: 'Risk registered' },
                      ].map((entry, idx) => (
                        <div key={idx} className="relative flex gap-3">
                          <div className="absolute -left-[9px] top-1 w-3 h-3" style={{
                            background: idx === 0 ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                            borderRadius: '50%',
                            border: '2px solid hsl(var(--bg-surface))',
                          }} />
                          <div className="ml-3">
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{entry.date}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    Detailed change history is captured in the platform <Link to="/audit-trail" className="underline" style={{ color: 'hsl(var(--brand))' }}>Audit Trail</Link>.
                  </p>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Risk Dialog ───────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Register New Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Risk Title *</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Model drift in production scoring pipeline"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Category *</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {addCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Risk Owner *</Label>
                <Input
                  value={newOwner}
                  onChange={e => setNewOwner(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Likelihood (1–5)</Label>
                <Select value={String(newLikelihood)} onValueChange={v => setNewLikelihood(Number(v))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} — {['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'][n - 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Impact (1–5)</Label>
                <Select value={String(newImpact)} onValueChange={v => setNewImpact(Number(v))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} — {['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'][n - 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
              <div className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Risk Score</div>
              <div className="text-2xl font-black" style={{
                color: newLikelihood * newImpact >= 15 ? 'hsl(var(--destructive))' : newLikelihood * newImpact >= 8 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
              }}>
                {newLikelihood * newImpact}
              </div>
              <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {newLikelihood * newImpact >= 15 ? 'Critical' : newLikelihood * newImpact >= 8 ? 'High' : newLikelihood * newImpact >= 4 ? 'Medium' : 'Low'}
                {' '}(Likelihood {newLikelihood} × Impact {newImpact})
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Description *</Label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Describe the risk, its source, and potential consequences..."
                rows={3}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Treatment Plan</Label>
              <Textarea
                value={newTreatment}
                onChange={e => setNewTreatment(e.target.value)}
                placeholder="Proposed mitigation or remediation steps..."
                rows={2}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Framework Mapping</Label>
              <Input
                value={newFramework}
                onChange={e => setNewFramework(e.target.value)}
                placeholder="e.g. EU AI Act Art. 9, ISO 42001 A.6.1 (comma-separated)"
                style={{ borderRadius: 0 }}
              />
              <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>Separate multiple references with commas</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>
              Cancel
            </Button>
            <Button onClick={handleAddRisk} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />{isSaving ? 'Saving…' : 'Register Risk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
