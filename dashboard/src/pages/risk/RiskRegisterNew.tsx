import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye, MagnifyingGlass, Funnel, Export, Plus, Warning,
  ShieldCheck, Clock, User, GridFour,
  X, Scales, Target, PencilSimple, Trash, Flag, Wrench, HandCoins, UsersThree,
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
import { PageHeader } from '@/components/ui/PageHeader';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Checkbox } from '../../components/ui/checkbox';
import { useOrgName } from '../../hooks/useOrganization';
import { useRisksData, type RiskRecord } from '../../hooks/useRisksData';
import { useModelsData } from '../../hooks/useModelsData';
import { useIncidents, useRemediations, useFinancialRisks, useHitlReviews } from '../../hooks/useRiskIncidents';
import { fetchAllControls } from '../../services/controlService';
import { scoreBand } from '../../services/riskService';
import { exportCsv } from '@/lib/exportUtils';

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
  statusRaw: string;
  overdue: boolean;
  frameworkMapping: string[];
  treatmentPlan: string;
  treatment: string | null;
  controlIds: string[];
  modelIds: string[];
  incidentIds: string[];
  createdDate: string;
  lastUpdated: string;
  deadline: string | null;
  nextReviewDate: string | null;
  reviewFrequency: string | null;
  reviewOverdue: boolean;
  isEscalated: boolean;
  escalationReason: string | null;
  kriMetric: string | null;
  kriThreshold: number | null;
  kriCurrentValue: number | null;
}

const DEFAULT_CATEGORIES = ['AI Model', 'Data', 'Operational', 'Compliance', 'Security', 'Third-Party'];

// ── Mapping: RiskRecord (risks table) → RiskItem (UI) ────────────────────────

function toItem(r: RiskRecord): RiskItem {
  const status = r.status || 'Open';
  const settled = /mitigated|closed|resolved|accepted/i.test(status);
  const overdue = !!r.deadline && !settled && new Date(r.deadline).getTime() < Date.now();
  const reviewOverdue = !!r.next_review_date && !settled
    && new Date(r.next_review_date).getTime() < Date.now();
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
    statusRaw: status.toLowerCase(),
    overdue,
    frameworkMapping: r.frameworks ?? [],
    treatmentPlan: r.mitigation ?? '',
    treatment: r.treatment ?? null,
    controlIds: r.linked_control_ids ?? [],
    modelIds: r.linked_model_ids ?? [],
    incidentIds: r.linked_incident_ids ?? [],
    createdDate: (r.created_at ?? '').slice(0, 10),
    lastUpdated: (r.updated_at ?? '').slice(0, 10),
    deadline: r.deadline ? r.deadline.slice(0, 10) : null,
    nextReviewDate: r.next_review_date ? r.next_review_date.slice(0, 10) : null,
    reviewFrequency: r.review_frequency ?? null,
    reviewOverdue,
    isEscalated: r.is_escalated ?? false,
    escalationReason: r.escalation_reason ?? null,
    kriMetric: r.kri_metric ?? null,
    kriThreshold: r.kri_threshold ?? null,
    kriCurrentValue: r.kri_current_value ?? null,
  };
}

// ── Score Color Helper ───────────────────────────────────────────────────────
// Delegates to the platform's single source of truth for score banding
// (riskService.scoreBand) — never duplicate the thresholds here.

function scoreColor(score: number): { bg: string; text: string; label: string } {
  const b = scoreBand(score);
  return { bg: b.bg, text: b.text, label: b.label };
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

function formatMoney(n: number | null | undefined, currency: string): string {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, onClick, active }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
  onClick?: () => void; active?: boolean;
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))', border: 'hsl(var(--s-er-bg))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-bg))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-bg))' },
  };
  const c = colors[variant];
  const card = (
    <Card style={{
      borderRadius: 0,
      background: c.bg,
      border: active ? '1px solid hsl(var(--brand))' : `1px solid ${c.border}`,
      outline: active ? '1px solid hsl(var(--brand))' : undefined,
    }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
  if (!onClick) return card;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className="text-left w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
      style={{ borderRadius: 0 }}
    >
      {card}
    </button>
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
            { label: 'Critical (>=20)', color: scoreBand(20).text },
            { label: 'High (12-19)', color: scoreBand(12).text },
            { label: 'Medium (6-11)', color: scoreBand(6).text },
            { label: 'Low (<6)', color: scoreBand(1).text },
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
  const orgName = useOrgName();
  const { risks: records, isLoading, error, saveRisk, removeRisk, isSaving } = useRisksData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [deleteTarget, setDeleteTarget] = useState<RiskItem | null>(null);

  // Interlinked records for the detail Sheet — all real, org-scoped queries.
  const { items: remediations, isLoading: remLoading } = useRemediations();
  const { items: financialRisks, isLoading: finLoading } = useFinancialRisks();
  const { items: hitlReviews, isLoading: hitlLoading } = useHitlReviews();

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

  // Incidents linked from EITHER side of the seam: ids stored on the risk
  // (risks.linked_incident_ids) merged with incidents whose linked_risk_ids
  // contains this risk — so the interlink works regardless of which side
  // wrote the link.
  const mergedIncidentIds = useMemo(() => {
    if (!selectedRisk) return [] as string[];
    const setIds = new Set(selectedRisk.incidentIds);
    for (const inc of incidents) {
      if (inc.id && (inc.linkedRiskIds ?? []).includes(selectedRisk.id)) setIds.add(inc.id);
    }
    return Array.from(setIds);
  }, [selectedRisk, incidents]);

  // Interlinked records for the selected risk — filtered client-side from the
  // real org-scoped tables (remediation_plans.risk_id, hitl_reviews.linked_risk_id,
  // financial_risks.linked_risk_id).
  const riskRemediations = useMemo(
    () => (selectedRisk ? remediations.filter(p => p.riskId === selectedRisk.id) : []),
    [remediations, selectedRisk],
  );
  const riskHitl = useMemo(
    () => (selectedRisk ? hitlReviews.filter(h => h.linkedRiskId === selectedRisk.id) : []),
    [hitlReviews, selectedRisk],
  );
  const riskFinancials = useMemo(
    () => (selectedRisk ? financialRisks.filter(f => f.linkedRiskId === selectedRisk.id) : []),
    [financialRisks, selectedRisk],
  );

  // ── Add / Edit Risk dialog state ───────────────────────────────────────────
  const NONE = '__none__';
  const STATUS_OPTIONS = ['open', 'assessed', 'in_progress', 'mitigated', 'accepted', 'closed'];
  const TREATMENT_OPTIONS = ['accept', 'mitigate', 'transfer', 'avoid'];
  const REVIEW_FREQUENCIES = ['monthly', 'quarterly', 'semiannual', 'annual'];
  const EMPTY_FORM = {
    title: '', category: 'AI Model', likelihood: 3, impact: 3,
    description: '', owner: '', treatmentPlan: '', framework: '',
    status: 'open', treatment: NONE,
    residualLikelihood: NONE, residualImpact: NONE,
    deadline: '', nextReviewDate: '', reviewFrequency: NONE,
    isEscalated: false, escalationReason: '',
    kriMetric: '', kriThreshold: '', kriCurrentValue: '',
  };
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setAddOpen(true);
  };

  const openEditDialog = (r: RiskItem) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      category: r.category || 'AI Model',
      likelihood: r.likelihood,
      impact: r.impact,
      description: r.description,
      owner: r.owner,
      treatmentPlan: r.treatmentPlan,
      framework: r.frameworkMapping.join(', '),
      status: r.statusRaw || 'open',
      treatment: r.treatment ?? NONE,
      residualLikelihood: r.residualLikelihood != null ? String(r.residualLikelihood) : NONE,
      residualImpact: r.residualImpact != null ? String(r.residualImpact) : NONE,
      deadline: r.deadline ?? '',
      nextReviewDate: r.nextReviewDate ?? '',
      reviewFrequency: r.reviewFrequency ?? NONE,
      isEscalated: r.isEscalated,
      escalationReason: r.escalationReason ?? '',
      kriMetric: r.kriMetric ?? '',
      kriThreshold: r.kriThreshold != null ? String(r.kriThreshold) : '',
      kriCurrentValue: r.kriCurrentValue != null ? String(r.kriCurrentValue) : '',
    });
    setAddOpen(true);
  };

  // Keep an unknown legacy status (e.g. "mitigating") selectable when editing.
  const statusOptions = STATUS_OPTIONS.includes(form.status)
    ? STATUS_OPTIONS
    : [form.status, ...STATUS_OPTIONS];

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
      if (escalatedOnly && !r.isEscalated) return false;
      return true;
    });
  }, [risks, search, filterCategory, modelParam, escalatedOnly]);

  // ── Metrics — computed over the FILTERED set so KPIs, heat map and table
  // always describe the same rows; tiles are relabelled when a filter scopes
  // the register (model deep-link, category, search, escalated).
  const scoped = !!modelParam || filterCategory !== 'all' || !!search || escalatedOnly;
  const kpiSuffix = scoped ? ' (filtered)' : '';
  const totalRisks = filtered.length;
  const criticalHighCount = filtered.filter(r => /Critical|High/.test(scoreBand(r.score).label)).length;
  const mitigatedCount = filtered.filter(r => /mitigated|closed|resolved/i.test(r.treatmentStatus)).length;
  const openCount = filtered.filter(r => /open/i.test(r.treatmentStatus)).length;
  const escalatedCount = filtered.filter(r => r.isEscalated).length;

  // ── Detail Drawer ──────────────────────────────────────────────────────────
  const openDetail = (risk: RiskItem) => {
    setSelectedId(risk.id);
    setDetailTab('overview');
    setSheetOpen(true);
  };

  // ── Export CSV — business code as identity, plus residual/status/owner ─────
  const exportCSV = () => {
    if (filtered.length === 0) { toast.error('There are no risks to export.'); return; }
    exportCsv(
      filtered.map(r => ({
        'Risk ID': riskShortLabel(r),
        'Title': r.title,
        'Category': r.category,
        'Likelihood': r.likelihood,
        'Impact': r.impact,
        'Risk Score': r.score,
        'Band': scoreBand(r.score).label,
        'Residual Score': r.residualLikelihood != null && r.residualImpact != null
          ? r.residualLikelihood * r.residualImpact : '',
        'Status': r.treatmentStatus,
        'Treatment': r.treatment ?? '',
        'Owner': r.owner,
        'Deadline': r.deadline ?? '',
        'Next Review': r.nextReviewDate ?? '',
        'Escalated': r.isEscalated ? 'yes' : 'no',
        'Framework Mapping': r.frameworkMapping.join('; '),
        'Created': r.createdDate,
        'Last Updated': r.lastUpdated,
      })),
      `risk-register-${new Date().toISOString().split('T')[0]}.csv`,
    );
    toast.success(`Exported ${filtered.length} risk${filtered.length === 1 ? '' : 's'} as CSV`);
  };

  // ── Save (add or edit) — persists via riskService; writes throw on failure ─
  const handleSaveRisk = async () => {
    if (!form.title.trim()) { toast.error('Risk title is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.owner.trim()) { toast.error('Risk owner is required'); return; }
    if (form.kriThreshold.trim() !== '' && Number.isNaN(Number(form.kriThreshold))) { toast.error('KRI threshold must be a number'); return; }
    if (form.kriCurrentValue.trim() !== '' && Number.isNaN(Number(form.kriCurrentValue))) { toast.error('KRI current value must be a number'); return; }
    try {
      await saveRisk({
        ...(editId ? { id: editId } : {}),
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        likelihood: form.likelihood,
        impact: form.impact,
        risk_score: form.likelihood * form.impact,
        status: form.status,
        owner: form.owner.trim(),
        mitigation: form.treatmentPlan.trim(),
        frameworks: form.framework.trim()
          ? form.framework.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        treatment: form.treatment === NONE ? null : form.treatment,
        residual_likelihood: form.residualLikelihood === NONE ? null : Number(form.residualLikelihood),
        residual_impact: form.residualImpact === NONE ? null : Number(form.residualImpact),
        deadline: form.deadline || null,
        next_review_date: form.nextReviewDate || null,
        review_frequency: form.reviewFrequency === NONE ? null : form.reviewFrequency,
        is_escalated: form.isEscalated,
        escalation_reason: form.isEscalated ? (form.escalationReason.trim() || null) : null,
        kri_metric: form.kriMetric.trim() || null,
        kri_threshold: form.kriThreshold.trim() === '' ? null : Number(form.kriThreshold),
        kri_current_value: form.kriCurrentValue.trim() === '' ? null : Number(form.kriCurrentValue),
      });
      // Success toast fires from the mutation only after the write resolved.
      setAddOpen(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    } catch {
      // Error toast fires from the mutation; keep the dialog open so nothing
      // the user typed is lost.
    }
  };

  // ── Delete — behind a ConfirmDialog; the service throws on failure ─────────
  const confirmDelete = async () => {
    if (!deleteTarget) return false;
    await removeRisk(deleteTarget.id);
    if (selectedId === deleteTarget.id) {
      setSelectedId(null);
      closeSheet(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Risk Register"
          subtitle={`${orgName} — Enterprise AI risk inventory and treatment tracking`}
        />
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
      <PageHeader
        title="Risk Register"
        subtitle={`${orgName} — Enterprise AI risk inventory and treatment tracking`}
        icon={ShieldCheck}
        actions={
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
              onClick={openCreate}
            >
              <Plus size={14} />
              Add Risk
            </Button>
          </div>
        }
      />

      {/* KPI Tiles — computed over the same filtered set the table shows */}
      <div className="grid grid-cols-5 gap-4">
        <MetricTile label={`Total Risks${kpiSuffix}`} value={totalRisks} variant="default" />
        <MetricTile label={`Critical / High${kpiSuffix}`} value={criticalHighCount} variant="error" />
        <MetricTile label={`Mitigated${kpiSuffix}`} value={mitigatedCount} variant="ok" />
        <MetricTile label={`Open${kpiSuffix}`} value={openCount} variant="warn" />
        <MetricTile
          label={escalatedOnly ? 'Escalated (filtering)' : `Escalated${kpiSuffix}`}
          value={escalatedCount}
          variant="error"
          active={escalatedOnly}
          onClick={() => setEscalatedOnly(v => !v)}
        />
      </div>

      {/* Heat Map — same filtered set as the KPIs and the table */}
      <HeatMap risks={filtered} onCellClick={openDetail} />

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
                {['Risk ID', 'Title', 'Category', 'Models', 'Likelihood', 'Impact', 'Risk Score', 'Residual', 'Owner', 'Treatment Status', 'Framework Mapping', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No risks recorded yet</p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      Use &quot;Add Risk&quot; to register the first risk for {orgName}.
                    </p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
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
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs font-mono font-medium" title={r.id} style={{ color: 'hsl(var(--brand))' }}>{riskShortLabel(r)}</span>
                          {r.isEscalated && (
                            <span title={r.escalationReason ? `Escalated: ${r.escalationReason}` : 'Escalated'}>
                              <Flag size={12} weight="fill" aria-label="Escalated" style={{ color: 'hsl(var(--destructive))' }} />
                            </span>
                          )}
                        </span>
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
                        {r.residualLikelihood != null && r.residualImpact != null ? (() => {
                          const rs = r.residualLikelihood * r.residualImpact;
                          const rc = scoreColor(rs);
                          return (
                            <span title={`Residual: ${r.residualLikelihood} × ${r.residualImpact}`}>
                              <Badge style={{ background: rc.bg, color: rc.text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                                {rs} — {rc.label}
                              </Badge>
                            </span>
                          );
                        })() : (
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.owner || 'Unassigned'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge style={{ background: tc.bg, color: tc.text, borderRadius: 0, fontSize: 10 }}>
                            {r.overdue ? 'Overdue' : r.treatmentStatus}
                          </Badge>
                          {r.reviewOverdue && (
                            <span title={`Next review was due ${r.nextReviewDate}`}>
                              <Badge style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>
                                Review overdue
                              </Badge>
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`View ${riskShortLabel(r)}`}
                            style={{ borderRadius: 0 }}
                            onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${riskShortLabel(r)}`}
                            style={{ borderRadius: 0 }}
                            onClick={(e) => { e.stopPropagation(); openEditDialog(r); }}
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${riskShortLabel(r)}`}
                            style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono" title={selectedRisk.id} style={{ color: 'hsl(var(--brand))' }}>{riskShortLabel(selectedRisk)}</span>
                  <Badge style={{ background: scoreColor(selectedRisk.score).bg, color: scoreColor(selectedRisk.score).text, borderRadius: 0, fontSize: 10, fontWeight: 700 }}>
                    Score: {selectedRisk.score}
                  </Badge>
                  <Badge style={{ background: treatmentColor(selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus).bg, color: treatmentColor(selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus).text, borderRadius: 0, fontSize: 10 }}>
                    {selectedRisk.overdue ? 'Overdue' : selectedRisk.treatmentStatus}
                  </Badge>
                  {selectedRisk.isEscalated && (
                    <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                      <Flag size={10} weight="fill" className="mr-1" /> Escalated
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>
                  {selectedRisk.title}
                </SheetTitle>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ borderRadius: 0 }}
                    onClick={() => openEditDialog(selectedRisk)}
                  >
                    <PencilSimple size={13} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ borderRadius: 0, borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}
                    onClick={() => setDeleteTarget(selectedRisk)}
                  >
                    <Trash size={13} /> Delete
                  </Button>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="w-full justify-start gap-0 flex-wrap h-auto" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  {['overview', 'assessment', 'treatment', 'controls', 'remediation', 'hitl', 'financial', 'history'].map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-xs capitalize"
                      style={{ borderRadius: 0 }}
                    >
                      {tab === 'assessment' ? 'Assessment' : tab === 'hitl' ? 'HITL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    {/* Merged from risks.linked_incident_ids AND incidents.linked_risk_ids —
                        the seam works regardless of which side wrote the link. */}
                    {mergedIncidentIds.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No incidents linked to this risk.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mergedIncidentIds.map(id => (
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
                      {selectedRisk.treatment && (
                        <Badge className="capitalize" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                          {selectedRisk.treatment}
                        </Badge>
                      )}
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
                  {(selectedRisk.nextReviewDate || selectedRisk.reviewFrequency) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Next Review</p>
                        <span className="text-xs" style={{ color: selectedRisk.reviewOverdue ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                          {selectedRisk.nextReviewDate ?? '—'}{selectedRisk.reviewOverdue ? ' (overdue)' : ''}
                        </span>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Review Frequency</p>
                        <span className="text-xs capitalize" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.reviewFrequency ?? '—'}</span>
                      </div>
                    </div>
                  )}
                  {(selectedRisk.kriMetric || selectedRisk.kriThreshold != null || selectedRisk.kriCurrentValue != null) && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Key Risk Indicator</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Metric</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.kriMetric ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Threshold</p>
                          <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.kriThreshold ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Current</p>
                          <p className="text-xs font-mono" style={{
                            color: selectedRisk.kriThreshold != null && selectedRisk.kriCurrentValue != null && selectedRisk.kriCurrentValue >= selectedRisk.kriThreshold
                              ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))',
                          }}>{selectedRisk.kriCurrentValue ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedRisk.isEscalated && (
                    <div className="p-3 flex items-start gap-2" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--destructive))', borderRadius: 0 }}>
                      <Flag size={16} weight="fill" style={{ color: 'hsl(var(--destructive))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--destructive))' }}>Escalated</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-2))' }}>
                          {selectedRisk.escalationReason || 'No escalation reason recorded.'}
                        </p>
                      </div>
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

                {/* Remediation Tab — remediation_plans where risk_id = this risk */}
                <TabsContent value="remediation" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Remediation Plans</span>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                      {riskRemediations.length}
                    </span>
                  </div>
                  {remLoading ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading remediation plans…</p>
                  ) : riskRemediations.length === 0 ? (
                    <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Wrench size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No remediation plans reference this risk yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskRemediations.map(p => (
                        <div key={p.id} className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-between gap-2">
                            <InterlinkChip
                              label={p.planRef ? `${p.planRef} — ${p.title}` : p.title || 'Unavailable'}
                              to={`/remediation-tracker?open=${p.id}`}
                            />
                            <Badge className="capitalize" style={{ background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                              {p.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                              <div style={{
                                width: `${Math.min(100, Math.max(0, p.progressPct))}%`,
                                height: '100%',
                                background: p.progressPct >= 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))',
                              }} />
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{p.progressPct}%</span>
                          </div>
                          {p.dueDate && (
                            <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>Due {p.dueDate.slice(0, 10)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* HITL Tab — hitl_reviews where linked_risk_id = this risk */}
                <TabsContent value="hitl" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersThree size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Human Oversight Reviews</span>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                      {riskHitl.length}
                    </span>
                  </div>
                  {hitlLoading ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading oversight reviews…</p>
                  ) : riskHitl.length === 0 ? (
                    <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <UsersThree size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No HITL reviews are linked to this risk.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskHitl.map(h => (
                        <div key={h.id} className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <InterlinkChip label={h.title || 'Unavailable'} to={`/hitl/${h.id}`} />
                            <div className="flex items-center gap-1">
                              {h.blocksDeployment && (
                                <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                                  Blocking
                                </Badge>
                              )}
                              <Badge className="capitalize" style={{
                                background: h.status === 'pending' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--bg-surface))',
                                color: h.status === 'pending' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))',
                                borderRadius: 0, fontSize: 10,
                              }}>
                                {h.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: 'hsl(var(--text-4))' }}>
                            {h.assignedTo ? `Assigned to ${h.assignedTo}` : 'Unassigned'}
                            {h.slaDeadline ? ` · SLA ${h.slaDeadline.slice(0, 10)}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Financial Tab — financial_risks where linked_risk_id = this risk */}
                <TabsContent value="financial" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HandCoins size={16} style={{ color: 'hsl(var(--text-4))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Financial Quantifications</span>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                      {riskFinancials.length}
                    </span>
                  </div>
                  {finLoading ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading quantifications…</p>
                  ) : riskFinancials.length === 0 ? (
                    <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <HandCoins size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No financial quantifications are linked to this risk.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskFinancials.map(f => (
                        <div key={f.id} className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <InterlinkChip
                              label={f.finRef ? `${f.finRef} — ${f.title}` : f.title || 'Unavailable'}
                              to={`/financial-risk?open=${f.id}`}
                            />
                            <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
                              ALE {formatMoney(f.annualizedLossExpectancy, f.currency)}
                            </span>
                          </div>
                          <p className="text-[10px] mt-1.5 capitalize" style={{ color: 'hsl(var(--text-4))' }}>
                            {f.methodology} · {f.status}{f.lastQuantified ? ` · quantified ${f.lastQuantified}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
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

      {/* ── Add / Edit Risk Dialog ────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setEditId(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editId ? 'Edit Risk' : 'Register New Risk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Risk Title *</Label>
              <Input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Model drift in production scoring pipeline"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Category *</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {(addCategories.includes(form.category) ? addCategories : [form.category, ...addCategories]).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Risk Owner *</Label>
                <Input
                  value={form.owner}
                  onChange={e => set('owner', e.target.value)}
                  placeholder="e.g. Risk owner"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Treatment Strategy</Label>
                <Select value={form.treatment} onValueChange={v => set('treatment', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>Not decided</SelectItem>
                    {TREATMENT_OPTIONS.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Likelihood (1–5)</Label>
                <Select value={String(form.likelihood)} onValueChange={v => set('likelihood', Number(v))}>
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
                <Select value={String(form.impact)} onValueChange={v => set('impact', Number(v))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} — {['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'][n - 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Score preview — same unified bands as everywhere else */}
            {(() => {
              const s = form.likelihood * form.impact;
              const b = scoreBand(s);
              return (
                <div className="flex items-center gap-3 p-3" style={{ background: b.bg, border: '1px solid hsl(var(--border))' }}>
                  <div className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Risk Score</div>
                  <div className="text-2xl font-black" style={{ color: b.text }}>{s}</div>
                  <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    {b.label} (Likelihood {form.likelihood} × Impact {form.impact})
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Residual Likelihood (1–5)</Label>
                <Select value={form.residualLikelihood} onValueChange={v => set('residualLikelihood', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>Not assessed</SelectItem>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Residual Impact (1–5)</Label>
                <Select value={form.residualImpact} onValueChange={v => set('residualImpact', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>Not assessed</SelectItem>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the risk, its source, and potential consequences..."
                rows={3}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Treatment Plan</Label>
              <Textarea
                value={form.treatmentPlan}
                onChange={e => set('treatmentPlan', e.target.value)}
                placeholder="Proposed mitigation or remediation steps..."
                rows={2}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Treatment Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={e => set('deadline', e.target.value)}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Next Review Date</Label>
                <Input
                  type="date"
                  value={form.nextReviewDate}
                  onChange={e => set('nextReviewDate', e.target.value)}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Review Frequency</Label>
                <Select value={form.reviewFrequency} onValueChange={v => set('reviewFrequency', v)}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {REVIEW_FREQUENCIES.map(f => (
                      <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 space-y-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
              <Label className="text-xs font-semibold">Key Risk Indicator</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Metric</Label>
                  <Input
                    value={form.kriMetric}
                    onChange={e => set('kriMetric', e.target.value)}
                    placeholder="e.g. Drift PSI"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Threshold</Label>
                  <Input
                    type="number"
                    value={form.kriThreshold}
                    onChange={e => set('kriThreshold', e.target.value)}
                    placeholder="e.g. 0.2"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Current Value</Label>
                  <Input
                    type="number"
                    value={form.kriCurrentValue}
                    onChange={e => set('kriCurrentValue', e.target.value)}
                    placeholder="e.g. 0.12"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="risk-escalated"
                  checked={form.isEscalated}
                  onCheckedChange={v => set('isEscalated', v === true)}
                />
                <Label htmlFor="risk-escalated" className="text-xs font-medium cursor-pointer">
                  Escalated to senior management
                </Label>
              </div>
              {form.isEscalated && (
                <div className="space-y-1">
                  <Label className="text-[11px]">Escalation Reason</Label>
                  <Textarea
                    value={form.escalationReason}
                    onChange={e => set('escalationReason', e.target.value)}
                    placeholder="Why this risk was escalated..."
                    rows={2}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Framework Mapping</Label>
              <Input
                value={form.framework}
                onChange={e => set('framework', e.target.value)}
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
            <Button onClick={handleSaveRisk} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />{isSaving ? 'Saving…' : editId ? 'Save Changes' : 'Register Risk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation — the service throws, the dialog stays open on failure */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Risk"
        message={`Delete ${deleteTarget ? riskShortLabel(deleteTarget) : ''} — "${deleteTarget?.title}"? The risk is soft-deleted and disappears from the register.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
