// @ts-nocheck
import { useRisksData } from "@/hooks/useRisksData";
import { useChartTheme } from '@/hooks/useChartTheme';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { useState, useMemo } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, ArrowUp, ArrowRight, ArrowDown,
  Warning, ShieldCheck, GridFour, ListBullets, Funnel, Info,
  X, CaretRight, CaretDown, CaretUp, Link as LinkIcon, Clock, User, Flag,
  MagnifyingGlass, ArrowsClockwise,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { severityColor, statusColor, formatDate } from '../data/seed';
type Risk = any;
import { useSettingsStore } from '../stores/settingsStore';

// Local fallback constants (no longer imported from seed)
const USERS: any[] = [
  { id: 'u1', name: 'Dr. Sarah Chen', role: 'CISO' },
  { id: 'u2', name: 'Alex Kumar', role: 'AI Risk Lead' },
  { id: 'u3', name: 'James Wilson', role: 'Compliance Officer' },
  { id: 'u4', name: 'Emma Rodriguez', role: 'DPO' },
  { id: 'u5', name: 'Lisa Park', role: 'Risk Analyst' },
  { id: 'u6', name: 'Mike Johnson', role: 'Security Engineer' },
];
const CONTROLS: any[] = [];

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

// ── Risk Score Color ──────────────────────────────────────────────────────────
function riskScoreStyle(score: number): { bg: string; text: string; bold: boolean } {
  if (score >= 17) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', bold: true };
  if (score >= 10) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', bold: false };
  if (score >= 5) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', bold: false };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', bold: false };
}

// ── Trend Arrow ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: Risk['trending'] }) {
  if (trend === 'up') return <ArrowUp size={14} weight="bold" style={{ color: 'hsl(var(--s-er-tx))' }} />;
  if (trend === 'down') return <ArrowDown size={14} weight="bold" style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  return <ArrowRight size={14} weight="bold" style={{ color: 'hsl(var(--text-4))' }} />;
}

// ── Likelihood / Impact scale definitions ─────────────────────────────────────
const LIKELIHOOD_SCALE = [
  '1 — Rare: May occur only in exceptional circumstances',
  '2 — Unlikely: Could occur at some time',
  '3 — Possible: Might occur at some time',
  '4 — Likely: Will probably occur in most circumstances',
  '5 — Almost Certain: Expected to occur frequently',
];
const IMPACT_SCALE = [
  '1 — Insignificant: Minimal impact, easily absorbed',
  '2 — Minor: Some disruption, manageable',
  '3 — Moderate: Significant impact requiring response',
  '4 — Major: Serious impact on objectives',
  '5 — Catastrophic: Existential threat or regulatory action',
];

// ── Risk-to-Control mapping ───────────────────────────────────────────────────
const RISK_CONTROL_MAP: Record<string, string[]> = {
  'RSK-001': ['CTRL-006', 'CTRL-002'],
  'RSK-002': ['CTRL-003', 'CTRL-012'],
  'RSK-003': ['CTRL-015'],
  'RSK-004': ['CTRL-009'],
  'RSK-005': ['CTRL-005', 'CTRL-010'],
  'RSK-006': ['CTRL-007', 'CTRL-008'],
  'RSK-007': ['CTRL-003', 'CTRL-014'],
  'RSK-008': ['CTRL-006', 'CTRL-015'],
  'RSK-009': ['CTRL-005'],
  'RSK-010': ['CTRL-009'],
  'RSK-011': ['CTRL-005', 'CTRL-010'],
  'RSK-012': ['CTRL-015'],
};

// ── Mini 5×5 Matrix ───────────────────────────────────────────────────────────
function MiniMatrix({ likelihood, impact }: { likelihood: number; impact: number }) {
  const cells = [];
  for (let row = 5; row >= 1; row--) {
    for (let col = 1; col <= 5; col++) {
      const s = row * col;
      let bg = 'hsl(142 71% 45% / 0.15)';
      if (s >= 17) bg = 'hsl(0 72% 51% / 0.3)';
      else if (s >= 10) bg = 'hsl(25 95% 53% / 0.3)';
      else if (s >= 5) bg = 'hsl(45 93% 47% / 0.2)';
      const isActive = row === likelihood && col === impact;
      cells.push(
        <div
          key={`${row}-${col}`}
          className="flex items-center justify-center"
          style={{
            width: 24, height: 24, background: bg,
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
        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Impact →</span>
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col items-center justify-center mr-1">
          <span className="text-[10px] writing-mode-vertical" style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Likelihood →</span>
        </div>
        <div className="grid grid-cols-5 gap-0.5">{cells}</div>
      </div>
    </div>
  );
}

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant, tooltip }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok'; tooltip?: string;
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  };
  const c = colors[variant];
  const inner = (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent style={{ borderRadius: 0, maxWidth: 240 }}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

// ── Interactive 5×5 Collapsible Heatmap ──────────────────────────────────────
function RiskHeatmap({
  risks,
  filterL,
  filterI,
  onCellClick,
}: {
  risks: Risk[];
  filterL: number | null;
  filterI: number | null;
  onCellClick: (l: number, i: number) => void;
}) {
  const matrix: Record<string, Risk[]> = {};
  risks.forEach(r => {
    const key = `${r.likelihood}-${r.impact}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(r);
  });

  const isActive = (l: number, i: number) => filterL === l && filterI === i;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 items-start" style={{ minWidth: 540 }}>
        {/* Y-axis label */}
        <div className="flex items-center justify-center" style={{ width: 18, height: 300 }}>
          <span
            style={{
              color: 'hsl(var(--text-4))',
              fontSize: 10,
              fontWeight: 600,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Likelihood →
          </span>
        </div>

        <div>
          {/* Row labels + cells */}
          {[5, 4, 3, 2, 1].map(l => (
            <div key={l} className="flex items-center gap-1 mb-1">
              <span style={{ width: 14, fontSize: 9, color: 'hsl(var(--text-4))', textAlign: 'right', flexShrink: 0 }}>{l}</span>
              {[1, 2, 3, 4, 5].map(i => {
                const s = l * i;
                let bg = 'hsl(142 71% 45% / 0.14)';
                let hoverBg = 'hsl(142 71% 45% / 0.25)';
                if (s >= 17) { bg = 'hsl(0 72% 51% / 0.22)'; hoverBg = 'hsl(0 72% 51% / 0.38)'; }
                else if (s >= 10) { bg = 'hsl(25 95% 53% / 0.22)'; hoverBg = 'hsl(25 95% 53% / 0.38)'; }
                else if (s >= 5) { bg = 'hsl(45 93% 47% / 0.18)'; hoverBg = 'hsl(45 93% 47% / 0.32)'; }
                const cellRisks = matrix[`${l}-${i}`] || [];
                const visible = cellRisks.slice(0, 2);
                const overflow = cellRisks.length - 2;
                const active = isActive(l, i);
                return (
                  <div
                    key={`${l}-${i}`}
                    className="cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-all"
                    title={`L${l}×I${i} = Score ${s}${cellRisks.length ? ` | ${cellRisks.map(r => r.id).join(', ')}` : ' | No risks'}`}
                    style={{
                      width: 90,
                      height: 56,
                      background: active ? hoverBg : bg,
                      border: active ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                      borderRadius: 0,
                      position: 'relative',
                    }}
                    onClick={() => onCellClick(l, i)}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = bg; }}
                  >
                    {active && (
                      <div style={{
                        position: 'absolute', top: 2, right: 3,
                        fontSize: 8, color: 'hsl(var(--brand))',
                        fontWeight: 700, letterSpacing: '0.05em',
                      }}>●</div>
                    )}
                    {visible.map(r => (
                      <span
                        key={r.id}
                        style={{
                          fontSize: 9, fontWeight: 600,
                          color: 'hsl(var(--text-1))',
                          background: 'hsl(var(--bg-muted))',
                          padding: '1px 4px',
                          borderRadius: 0,
                          lineHeight: 1.4,
                          maxWidth: 82,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >{r.id}</span>
                    ))}
                    {overflow > 0 && (
                      <span style={{ fontSize: 9, color: 'hsl(var(--text-4))', fontWeight: 600 }}>+{overflow} more</span>
                    )}
                    {cellRisks.length === 0 && (
                      <span style={{ fontSize: 9, color: 'hsl(var(--border))' }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* X-axis labels */}
          <div className="flex items-center gap-1 mt-1">
            <span style={{ width: 14 }} />
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} style={{ width: 90, textAlign: 'center', fontSize: 9, color: 'hsl(var(--text-4))' }}>{i}</span>
            ))}
          </div>
          <div className="flex items-center justify-center mt-1">
            <span style={{ fontSize: 10, color: 'hsl(var(--text-4))', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              &nbsp;&nbsp;&nbsp;&nbsp;Impact →
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 ml-4 mt-2" style={{ flexShrink: 0 }}>
          {[
            { label: 'Critical (17–25)', bg: 'hsl(0 72% 51% / 0.22)' },
            { label: 'High (10–16)', bg: 'hsl(25 95% 53% / 0.22)' },
            { label: 'Medium (5–9)', bg: 'hsl(45 93% 47% / 0.18)' },
            { label: 'Low (1–4)', bg: 'hsl(142 71% 45% / 0.14)' },
          ].map(({ label, bg }) => (
            <div key={label} className="flex items-center gap-2">
              <div style={{ width: 14, height: 14, background: bg, border: '1px solid hsl(var(--border))', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, fontSize: 10, color: 'hsl(var(--text-4))', lineHeight: 1.5 }}>
            Click a cell to<br />filter the table
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function RiskRegister() {
  const { orgName } = useSettingsStore();
  const { risks, isLoading, saveRisk, removeRisk } = useRisksData();
  if (isLoading) return <PageSkeleton />;
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>(() => {
    return (sessionStorage.getItem('risk-view') as 'list' | 'matrix') || 'list';
  });
  const [heatmapExpanded, setHeatmapExpanded] = useState(true);
  const [heatmapFilter, setHeatmapFilter] = useState<{ l: number | null; i: number | null }>({ l: null, i: null });
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);

  // Treatment detail state
  const [treatmentApprovedBy, setTreatmentApprovedBy] = useState('Sarah Chen');
  const [treatmentEvidence, setTreatmentEvidence] = useState('');
  const [treatmentResidual, setTreatmentResidual] = useState(3);
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [pendingCtrlId, setPendingCtrlId] = useState('');
  const [controlMappings, setControlMappings] = useState<Record<string, string[]>>({ ...RISK_CONTROL_MAP });

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('AI/ML');
  const [newLikelihood, setNewLikelihood] = useState(3);
  const [newImpact, setNewImpact] = useState(3);
  const [newOwner, setNewOwner] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newMitigation, setNewMitigation] = useState('');

  const toggleView = (mode: 'list' | 'matrix') => {
    setViewMode(mode);
    sessionStorage.setItem('risk-view', mode);
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = useMemo(() => [...new Set(risks.map(r => r.category))], [risks]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return risks.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (heatmapFilter.l !== null && r.likelihood !== heatmapFilter.l) return false;
      if (heatmapFilter.i !== null && r.impact !== heatmapFilter.i) return false;
      return true;
    });
  }, [risks, search, filterCategory, filterStatus, heatmapFilter]);

  const handleHeatmapCell = (l: number, i: number) => {
    setHeatmapFilter(prev =>
      prev.l === l && prev.i === i ? { l: null, i: null } : { l, i }
    );
  };

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalRisks = risks.length;
  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const openCount = risks.filter(r => r.status === 'open').length;
  const mitigatedCount = risks.filter(r => r.status === 'mitigated').length;
  const avgScore = risks.length > 0 ? Math.round(risks.reduce((a, r) => a + (r.score || r.risk_score || 0), 0) / risks.length) : 0;

  // ── Open detail sheet ─────────────────────────────────────────────────────
  const openDetail = (risk: Risk) => {
    setSelectedRisk(risk);
    setSheetOpen(true);
  };

  // ── Delete risk ───────────────────────────────────────────────────────────
  const handleDeleteRisk = async (id: string) => {
    try { await removeRisk(id); } catch { }
  };

  // ── Add risk ──────────────────────────────────────────────────────────────
  const handleAddRisk = async () => {
    const score = newLikelihood * newImpact;
    const sev = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
    const newRisk: any = {
      title: newTitle,
      description: newDescription,
      category: newCategory,
      severity: sev,
      status: 'open',
      likelihood: newLikelihood,
      impact: newImpact,
      risk_score: score,
      score,
      owner: newOwner,
      mitigations: newMitigation ? [newMitigation] : [],
      trending: 'stable',
    };
    try { await saveRisk(newRisk); } catch { }
    setAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle(''); setNewCategory('AI/ML'); setNewLikelihood(3);
    setNewImpact(3); setNewOwner(''); setNewDescription('');
    setNewTargetDate(''); setNewMitigation('');
  };

  // ── 5×5 Matrix View ──────────────────────────────────────────────────────
  const renderMatrix = () => {
    const matrix: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const key = `${r.likelihood}-${r.impact}`;
      if (!matrix[key]) matrix[key] = [];
      matrix[key].push(r);
    });

    return (
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-col items-center mr-2" style={{ height: 300 }}>
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Likelihood (1–5)</span>
            </div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {[5, 4, 3, 2, 1].map(l => (
                  [1, 2, 3, 4, 5].map(i => {
                    const s = l * i;
                    let bg = 'hsl(142 71% 45% / 0.12)';
                    if (s >= 17) bg = 'hsl(0 72% 51% / 0.25)';
                    else if (s >= 10) bg = 'hsl(25 95% 53% / 0.25)';
                    else if (s >= 5) bg = 'hsl(45 93% 47% / 0.18)';
                    const cellRisks = matrix[`${l}-${i}`] || [];
                    const visible = cellRisks.slice(0, 2);
                    const overflow = cellRisks.length - 2;

                    return (
                      <div
                        key={`${l}-${i}`}
                        className="flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:brightness-110 transition-all"
                        style={{ width: 100, height: 56, background: bg, border: '1px solid hsl(var(--border))', borderRadius: 0 }}
                        onClick={() => {
                          if (cellRisks.length === 1) openDetail(cellRisks[0]);
                          else if (cellRisks.length > 1) { /* handled by individual click */ }
                        }}
                      >
                        {visible.map(r => (
                          <span
                            key={r.id}
                            className="font-mono text-[10px] cursor-pointer hover:underline"
                            style={{ color: 'hsl(var(--text-1))' }}
                            onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                          >
                            {r.id}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <Badge
                            className="text-[9px] px-1 py-0 cursor-pointer"
                            style={{ background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))', borderRadius: 0, border: '1px solid hsl(var(--border))' }}
                            onClick={(e) => { e.stopPropagation(); }}
                          >
                            +{overflow} more
                          </Badge>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Impact (1–5)</span>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4">
            {[
              { label: '1–4 Low', bg: 'hsl(142 71% 45% / 0.3)' },
              { label: '5–9 Medium', bg: 'hsl(45 93% 47% / 0.3)' },
              { label: '10–16 High', bg: 'hsl(25 95% 53% / 0.3)' },
              { label: '17–25 Critical', bg: 'hsl(0 72% 51% / 0.3)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{ width: 14, height: 14, background: l.bg, borderRadius: 0 }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Risk Register</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · ISO 31000 risk management — {totalRisks} risks tracked
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border" style={{ borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleView('list')}
                style={{ borderRadius: 0, height: 32 }}
              >
                <ListBullets size={14} className="mr-1" />List
              </Button>
              <Button
                variant={viewMode === 'matrix' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleView('matrix')}
                style={{ borderRadius: 0, height: 32 }}
              >
                <GridFour size={14} className="mr-1" />Matrix
              </Button>
            </div>
            <Button variant="outline" onClick={() => exportCsv(risks, 'risks.csv')} style={{ borderRadius: 0 }}>
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              <Plus size={14} className="mr-1" />Add Risk
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Risks" value={totalRisks} variant="default" />
          <MetricTile label="Critical" value={criticalCount} variant="error" />
          <MetricTile label="Open" value={openCount} variant="warn" />
          <MetricTile label="Mitigated" value={mitigatedCount} variant="ok" />
        </div>

        {/* Avg Score Banner */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <Info size={14} style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                Avg Score: {avgScore}
              </span>
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>(5×5 matrix, max 25)</span>
            </div>
          </TooltipTrigger>
          <TooltipContent style={{ borderRadius: 0, maxWidth: 260 }}>
            Average risk score across all {totalRisks} risks. Calculated as Likelihood × Impact on a 5×5 matrix (max 25).
          </TooltipContent>
        </Tooltip>

        {/* Collapsible Risk Heatmap */}
        {viewMode === 'list' && (
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div
              className="flex items-center justify-between cursor-pointer px-4 py-3"
              style={{ borderBottom: heatmapExpanded ? '1px solid hsl(var(--border))' : 'none' }}
              onClick={() => setHeatmapExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <GridFour size={15} style={{ color: 'hsl(var(--brand))' }} />
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Risk Heatmap
                </span>
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Likelihood × Impact — click a cell to filter the table</span>
                {heatmapFilter.l !== null && (
                  <Badge
                    style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); setHeatmapFilter({ l: null, i: null }); }}
                  >
                    L{heatmapFilter.l}×I{heatmapFilter.i} · ×
                  </Badge>
                )}
              </div>
              {heatmapExpanded ? <CaretUp size={14} style={{ color: 'hsl(var(--text-4))' }} /> : <CaretDown size={14} style={{ color: 'hsl(var(--text-4))' }} />}
            </div>
            {heatmapExpanded && (
              <CardContent className="p-4">
                <RiskHeatmap
                  risks={risks}
                  filterL={heatmapFilter.l}
                  filterI={heatmapFilter.i}
                  onCellClick={handleHeatmapCell}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input
              placeholder="Search risks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 h-8 text-xs" style={{ borderRadius: 0 }}>
              <Funnel size={12} className="mr-1" /><SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs" style={{ borderRadius: 0 }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="mitigated">Mitigated</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View content */}
        {viewMode === 'matrix' ? renderMatrix() : (
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>RSK-ID</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Title</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Category</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              Likelihood (1–5) <Info size={11} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" style={{ borderRadius: 0, maxWidth: 280 }}>
                            <div className="space-y-1 text-xs">
                              {LIKELIHOOD_SCALE.map(s => <p key={s}>{s}</p>)}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              Impact (1–5) <Info size={11} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" style={{ borderRadius: 0, maxWidth: 280 }}>
                            <div className="space-y-1 text-xs">
                              {IMPACT_SCALE.map(s => <p key={s}>{s}</p>)}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Score</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Controls</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trend</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(risk => {
                      const scoreStyle = riskScoreStyle(risk.score);
                      const sevColor = severityColor(risk.severity);
                      const statColor = statusColor(risk.status);
                      const controls = RISK_CONTROL_MAP[risk.id] || [];
                      return (
                        <tr
                          key={risk.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          style={{ borderBottom: '1px solid hsl(var(--border))' }}
                          onClick={() => openDetail(risk)}
                        >
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{risk.id}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{risk.title}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge style={{ background: sevColor.bg, color: sevColor.text, borderRadius: 0, fontSize: 11 }}>
                              {risk.category}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{risk.likelihood}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{risk.impact}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge style={{
                              background: scoreStyle.bg, color: scoreStyle.text, borderRadius: 0,
                              fontWeight: scoreStyle.bold ? 800 : 600, fontSize: 12,
                            }}>
                              {risk.score}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge style={{ background: statColor.bg, color: statColor.text, borderRadius: 0, fontSize: 11 }}>
                              {risk.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{risk.owner}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {controls.map(ctrl => (
                                <Badge key={ctrl} className="text-[10px] font-mono px-1 py-0" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                                  {ctrl}
                                </Badge>
                              ))}
                              {controls.length === 0 && <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2"><TrendIcon trend={risk.trending} /></td>
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(risk)}>
                                <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditRisk(risk); setAddOpen(true); }}>
                                <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Trash size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent style={{ borderRadius: 0 }}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Risk</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Delete "{risk.id} — {risk.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteRisk(risk.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Risk Detail Sheet ─────────────────────────────────────────────── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedRisk && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedRisk.id}</span>
                    <Badge style={{ background: severityColor(selectedRisk.severity).bg, color: severityColor(selectedRisk.severity).text, borderRadius: 0, fontSize: 11 }}>
                      {selectedRisk.severity}
                    </Badge>
                    <TrendIcon trend={selectedRisk.trending} />
                  </div>
                  <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.title}</SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="w-full" style={{ borderRadius: 0 }}>
                    <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                    <TabsTrigger value="mitigations" style={{ borderRadius: 0 }}>Treatment</TabsTrigger>
                    <TabsTrigger value="financial" style={{ borderRadius: 0 }}>Financial</TabsTrigger>
                    <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Evidence</TabsTrigger>
                    <TabsTrigger value="controls" style={{ borderRadius: 0 }}>Controls</TabsTrigger>
                    <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <MiniMatrix likelihood={selectedRisk.likelihood} impact={selectedRisk.impact} />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Score</p>
                        <Badge style={{ ...riskScoreStyle(selectedRisk.score), background: riskScoreStyle(selectedRisk.score).bg, color: riskScoreStyle(selectedRisk.score).text, borderRadius: 0, fontSize: 14, fontWeight: riskScoreStyle(selectedRisk.score).bold ? 800 : 600 }}>
                          {selectedRisk.score} / 25
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Status</p>
                        <Badge style={{ background: statusColor(selectedRisk.status).bg, color: statusColor(selectedRisk.status).text, borderRadius: 0 }}>
                          {selectedRisk.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Category</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.category}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                        <div className="flex items-center gap-1">
                          <User size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Created</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedRisk.createdDate)}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Last Updated</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedRisk.lastUpdated)}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.description}</p>
                    </div>
                    {selectedRisk.linkedModel && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Linked Model</p>
                        <Badge className="font-mono text-xs" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                          {selectedRisk.linkedModel}
                        </Badge>
                      </div>
                    )}
                  </TabsContent>

                  {/* Financial Tab */}
                  <TabsContent value="financial" className="space-y-4 mt-4">
                    <div style={{ padding: 12, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: 'hsl(var(--text-4))' }}>FAIR Quantitative Risk Analysis</p>
                      {(() => {
                        const baseALE = selectedRisk.score * 125000;
                        const reducedALE = baseALE * 0.35;
                        const ctrlCost = baseALE * 0.15;
                        const rosi = ((baseALE - reducedALE - ctrlCost) / ctrlCost * 100).toFixed(0);
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Annualized Loss Expectancy', value: `$${(baseALE / 1000).toFixed(0)}K`, color: 'hsl(var(--s-er-tx))' },
                              { label: 'Prob. of Occurrence (annual)', value: `${(selectedRisk.likelihood * 18)}%`, color: 'hsl(var(--s-wn-tx))' },
                              { label: 'Single Loss Expectancy', value: `$${((selectedRisk.impact * 680000) / 1000).toFixed(0)}K`, color: 'hsl(var(--s-er-tx))' },
                              { label: 'Reduced ALE (post-control)', value: `$${(reducedALE / 1000).toFixed(0)}K`, color: 'hsl(var(--s-ok-tx))' },
                              { label: 'Control Cost (annual)', value: `$${(ctrlCost / 1000).toFixed(0)}K`, color: 'hsl(var(--text-1))' },
                              { label: 'ROSI', value: `${rosi}%`, color: Number(rosi) > 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' },
                            ].map(item => (
                              <div key={item.label} style={{ padding: '10px 12px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))', marginBottom: 3 }}>{item.label}</p>
                                <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ padding: 12, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: 'hsl(var(--text-4))' }}>Regulatory Exposure</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Max GDPR Fine', value: '€20M / 4% turnover' },
                          { label: 'EU AI Act Penalty', value: `€${selectedRisk.score >= 17 ? '30M / 6%' : '15M / 3%'}` },
                          { label: 'Reputation Impact', value: selectedRisk.score >= 17 ? 'Severe' : selectedRisk.score >= 10 ? 'Significant' : 'Moderate' },
                          { label: 'Materiality Threshold', value: selectedRisk.score >= 10 ? 'Board reportable' : 'Management level' },
                        ].map(item => (
                          <div key={item.label} style={{ padding: '10px 12px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                            <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))', marginBottom: 3 }}>{item.label}</p>
                            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Mitigations Tab */}
                  <TabsContent value="mitigations" className="space-y-4 mt-4">
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))', borderRadius: 0 }}>
                      <ShieldCheck size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--s-in-tx))' }}>ISO 31000 Treatment Record</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Treatment Strategy</p>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                        {selectedRisk.status === 'mitigated' ? 'Mitigate (Risk Reduction)' :
                         selectedRisk.status === 'accepted' ? 'Accept (Risk Retention)' : 'Mitigate (In Progress)'}
                      </span>
                    </div>
                    {/* Approved By — dropdown from USERS */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Approved By</Label>
                      <Select value={treatmentApprovedBy} onValueChange={setTreatmentApprovedBy}>
                        <SelectTrigger className="h-8 text-xs" style={{ borderRadius: 0 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {USERS.map(u => (
                            <SelectItem key={u.id} value={u.name}>{u.name} ({u.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Evidence Attached — file name input */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Evidence Attached</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 text-xs flex-1"
                          style={{ borderRadius: 0 }}
                          placeholder="e.g. mitigation-evidence-Q1.pdf"
                          value={treatmentEvidence}
                          onChange={(e) => setTreatmentEvidence(e.target.value)}
                        />
                        {treatmentEvidence && (
                          <Badge className="text-[10px]" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', borderRadius: 0 }}>
                            Attached
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Mitigation Actions</p>
                      {selectedRisk.mitigations.map((m, i) => (
                        <div key={i} className="flex items-start gap-2 p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <CaretRight size={12} style={{ color: 'hsl(var(--brand))', marginTop: 2 }} />
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{m}</span>
                        </div>
                      ))}
                    </div>
                    {/* Residual Risk After Mitigation — 1-5 slider */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Residual Risk After Mitigation</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={1} max={5} step={1}
                          value={treatmentResidual}
                          onChange={(e) => setTreatmentResidual(Number(e.target.value))}
                          style={{ flex: 1, accentColor: 'hsl(var(--brand))' }}
                        />
                        <Badge style={{
                          background: riskScoreStyle(treatmentResidual * treatmentResidual).bg,
                          color: riskScoreStyle(treatmentResidual * treatmentResidual).text,
                          borderRadius: 0, minWidth: 56, textAlign: 'center'
                        }}>
                          L{treatmentResidual}×I{treatmentResidual} = {treatmentResidual * treatmentResidual}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                        {['1 — Rare', '2', '3 — Mod', '4', '5 — Critical'].map((l, i) => (
                          <span key={i}>{l}</span>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Evidence Tab */}
                  <TabsContent value="evidence" className="space-y-4 mt-4">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Evidence items linked to this risk's mitigating controls.</p>
                    <div className="space-y-2">
                      {(controlMappings[selectedRisk.id] || []).map(ctrlId => {
                        const ctrl = CONTROLS.find(c => c.id === ctrlId);
                        return (
                          <div key={ctrlId} className="p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{ctrlId}</span>
                              <Badge className="text-[10px]" style={{ background: statusColor(ctrl?.status || '').bg, color: statusColor(ctrl?.status || '').text, borderRadius: 0 }}>
                                {ctrl?.evidenceCount || 0} evidence items
                              </Badge>
                            </div>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ctrl?.title || 'Unknown control'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Linked Controls Tab */}
                  <TabsContent value="controls" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Controls mapped to mitigate this risk.</p>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs"
                        style={{ borderRadius: 0 }}
                        onClick={() => { setPendingCtrlId(''); setAddMappingOpen(true); }}
                      >
                        <Plus size={12} className="mr-1" />Add Mapping
                      </Button>
                    </div>
                    {/* Control table */}
                    {(controlMappings[selectedRisk.id] || []).length > 0 ? (
                      <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                              {['CTRL-ID', 'Title', 'Status', 'Score'].map(h => (
                                <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(controlMappings[selectedRisk.id] || []).map(ctrlId => {
                              const ctrl = CONTROLS.find(c => c.id === ctrlId);
                              const cColor = ctrl ? statusColor(ctrl.status) : { bg: '', text: '' };
                              return (
                                <tr key={ctrlId} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                                  <td className="px-2 py-2">
                                    <Badge className="font-mono text-[10px]" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>{ctrlId}</Badge>
                                  </td>
                                  <td className="px-2 py-2" style={{ color: 'hsl(var(--text-1))' }}>{ctrl?.title || '—'}</td>
                                  <td className="px-2 py-2">
                                    {ctrl && <Badge style={{ background: cColor.bg, color: cColor.text, borderRadius: 0, fontSize: 10 }}>{ctrl.status}</Badge>}
                                  </td>
                                  <td className="px-2 py-2 font-mono" style={{ color: 'hsl(var(--text-1))' }}>{ctrl ? `${ctrl.score}%` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No controls linked to this risk.</p>
                        <Button
                          size="sm" variant="outline"
                          style={{ borderRadius: 0 }}
                          onClick={() => { setPendingCtrlId(''); setAddMappingOpen(true); }}
                        >
                          <Plus size={12} className="mr-1" />Add Mapping
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      {[
                        { date: selectedRisk.lastUpdated, action: 'Risk assessment updated', actor: selectedRisk.owner },
                        { date: selectedRisk.createdDate, action: 'Risk created and registered', actor: selectedRisk.owner },
                      ].map((entry, i) => (
                        <div key={i} className="flex gap-3 p-2" style={{ borderLeft: `2px solid hsl(var(--brand))`, borderRadius: 0 }}>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                            <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(entry.date)} · {entry.actor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── Add / Edit Risk Modal ──────────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setEditRisk(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg" style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={editRisk ? (editRisk.title) : newTitle}
                  onChange={(e) => editRisk ? setEditRisk({ ...editRisk, title: e.target.value }) : setNewTitle(e.target.value)}
                  style={{ borderRadius: 0 }}
                  placeholder="Risk title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category *</Label>
                  <Select
                    value={editRisk ? editRisk.category : newCategory}
                    onValueChange={(v) => editRisk ? setEditRisk({ ...editRisk, category: v }) : setNewCategory(v)}
                  >
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['AI/ML', 'Compliance', 'Operational', 'Security', 'Governance', 'Third-Party'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Owner *</Label>
                  <Select
                    value={editRisk ? editRisk.owner : newOwner}
                    onValueChange={(v) => editRisk ? setEditRisk({ ...editRisk, owner: v }) : setNewOwner(v)}
                  >
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {USERS.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Likelihood (1–5) *</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={5} step={1}
                      value={editRisk ? editRisk.likelihood : newLikelihood}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        editRisk ? setEditRisk({ ...editRisk, likelihood: v, score: v * editRisk.impact }) : setNewLikelihood(v);
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono font-bold w-6 text-center" style={{ color: 'hsl(var(--text-1))' }}>
                      {editRisk ? editRisk.likelihood : newLikelihood}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Impact (1–5) *</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={5} step={1}
                      value={editRisk ? editRisk.impact : newImpact}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        editRisk ? setEditRisk({ ...editRisk, impact: v, score: editRisk.likelihood * v }) : setNewImpact(v);
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono font-bold w-6 text-center" style={{ color: 'hsl(var(--text-1))' }}>
                      {editRisk ? editRisk.impact : newImpact}
                    </span>
                  </div>
                </div>
              </div>
              {/* Live score display */}
              <div className="flex items-center gap-2 p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Live Score:</span>
                {(() => {
                  const score = editRisk ? editRisk.score : newLikelihood * newImpact;
                  const ss = riskScoreStyle(score);
                  return (
                    <Badge style={{ background: ss.bg, color: ss.text, borderRadius: 0, fontWeight: ss.bold ? 800 : 600, fontSize: 14 }}>
                      {score} / 25
                    </Badge>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={editRisk ? editRisk.description : newDescription}
                  onChange={(e) => editRisk ? setEditRisk({ ...editRisk, description: e.target.value }) : setNewDescription(e.target.value)}
                  style={{ borderRadius: 0 }}
                  rows={3}
                  placeholder="Describe the risk..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Target Date</Label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Initial Mitigation</Label>
                <Input
                  value={newMitigation}
                  onChange={(e) => setNewMitigation(e.target.value)}
                  style={{ borderRadius: 0 }}
                  placeholder="Initial mitigation action..."
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditRisk(null); resetForm(); }} style={{ borderRadius: 0 }}>
                Cancel
              </Button>
              <Button
                onClick={editRisk ? async () => {
                  try { await saveRisk({ ...editRisk, updated_at: new Date().toISOString() }); } catch {}
                  setAddOpen(false);
                  setEditRisk(null);
                } : handleAddRisk}
                disabled={editRisk ? !editRisk.title : !newTitle || !newOwner}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
              >
                {editRisk ? 'Save Changes' : 'Create Risk'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Add Control Mapping Dialog ─────────────────────────────────── */}
        <Dialog open={addMappingOpen} onOpenChange={setAddMappingOpen}>
          <DialogContent className="sm:max-w-sm" style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Control Mapping</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                Linking a control to {selectedRisk?.id} — {selectedRisk?.title}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Select Control</Label>
                <Select value={pendingCtrlId} onValueChange={setPendingCtrlId}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Pick a control..." /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {CONTROLS.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.id} — {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAddMappingOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button
                disabled={!pendingCtrlId || !selectedRisk}
                onClick={() => {
                  if (!selectedRisk || !pendingCtrlId) return;
                  setControlMappings(prev => ({
                    ...prev,
                    [selectedRisk.id]: [...(prev[selectedRisk.id] || []), pendingCtrlId].filter((v, i, a) => a.indexOf(v) === i),
                  }));
                  setAddMappingOpen(false);
                  setPendingCtrlId('');
                }}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
              >
                Add Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
