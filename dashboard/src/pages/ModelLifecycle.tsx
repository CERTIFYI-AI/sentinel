import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Robot, ArrowRight, Clock, CheckCircle, Warning,
  MagnifyingGlass, ShieldCheck, ShieldWarning, ArrowUpRight,
  CaretUp, CaretDown, ArrowsDownUp, X, GitBranch, Scales,
  Flask, Gauge, Prohibit, SortAscending, Funnel,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  RiskBadge, StatusPill, InterlinkChip, ContextualAlert, SlideOverPanel,
} from '../components/ui';
import { MODELS } from '../data/seed';
import { useModelsData } from '@/hooks/useModelsData';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { toast } from 'sonner';
import Breadcrumbs from '../components/Breadcrumbs';

/* ─── Confirmation Dialog ─────────────────────────────────────────────── */
function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onCancel, destructive = false,
}: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', width: 440, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', background: destructive ? 'hsl(var(--s-er-tx))' : 'hsl(var(--brand))', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stage Stepper ───────────────────────────────────────────────────── */
const STAGE_ORDER = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'DEPLOYED', 'PRODUCTION', 'DEPRECATED', 'RETIRED'];
const STAGE_COLORS: Record<string, string> = {
  DRAFT: 'hsl(var(--text-4))',
  IN_REVIEW: 'hsl(var(--s-in-tx))',
  APPROVED: 'hsl(var(--s-wn-tx))',
  DEPLOYED: 'hsl(var(--brand))',
  PRODUCTION: 'hsl(var(--s-ok-tx))',
  DEPRECATED: 'hsl(var(--s-er-tx))',
  RETIRED: 'hsl(var(--text-4))',
  MONITORING: 'hsl(var(--brand))',
  VALIDATION: 'hsl(var(--s-wn-tx))',
  STAGING: 'hsl(var(--s-in-tx))',
};
const STAGE_BG: Record<string, string> = {
  DRAFT: 'hsl(var(--bg-muted))',
  IN_REVIEW: 'hsl(var(--s-in-bg))',
  APPROVED: 'hsl(var(--s-wn-bg))',
  DEPLOYED: 'hsl(var(--brand-subtle))',
  PRODUCTION: 'hsl(var(--s-ok-bg))',
  DEPRECATED: 'hsl(var(--s-er-bg))',
  RETIRED: 'hsl(var(--bg-muted))',
  MONITORING: 'hsl(var(--brand-subtle))',
  VALIDATION: 'hsl(var(--s-wn-bg))',
  STAGING: 'hsl(var(--s-in-bg))',
};

function StagePill({ stage }: { stage: string }) {
  const s = stage?.toUpperCase() || 'DRAFT';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', letterSpacing: '0.05em',
      background: STAGE_BG[s] || 'hsl(var(--bg-muted))',
      color: STAGE_COLORS[s] || 'hsl(var(--text-3))',
      border: `1px solid ${STAGE_COLORS[s] || 'hsl(var(--text-3))'}33`,
    }}>
      {s}
    </span>
  );
}

/* ─── Sort Header ─────────────────────────────────────────────────────── */
function SortTh({ col, label, sortCol, sortDir, onSort }: { col: string; label: string; sortCol: string; sortDir: string; onSort: (c: string) => void }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: active ? 'hsl(var(--brand))' : 'hsl(var(--text-4))', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active
          ? sortDir === 'asc' ? <CaretUp size={11} /> : <CaretDown size={11} />
          : <ArrowsDownUp size={11} style={{ opacity: 0.3 }} />}
      </div>
    </th>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function ModelLifecycle() {
  const { models: items, isLoading, saveModel } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [confirm, setConfirm] = useState<null | 'promote' | 'retire'>(null);

  const today = new Date();

  /* ── Normalize models ── */
  const unifiedModels = useMemo(() => {
    const activeItems = items && items.length > 0 ? items : MODELS;
    return activeItems.map((_m) => {
      const m = _m as any;
      const lastValDate = m.lastValidated || m.last_validated || '2026-03-15';
      const lastVal = new Date(lastValDate);
      const diffDays = Math.ceil(Math.abs(today.getTime() - lastVal.getTime()) / (1000 * 60 * 60 * 24));
      const overdueValidation = diffDays > 90;
      const riskRaw = (m.risk_tier || m.riskClass || m.riskTier || 'MEDIUM').toUpperCase().replace('_RISK', '');
      return {
        id: m.id || 'MDL-UNKNOWN',
        name: m.name || 'Unnamed Model',
        version: m.version || 'v1.0.0',
        owner_team: m.owner_team || m.department || m.owner || 'Platform',
        business_unit: m.business_unit || m.department || 'Enterprise',
        purpose: m.description || m.purpose || 'No description provided.',
        framework: m.framework || 'NIST AI RMF',
        risk_tier: riskRaw === 'HIGH' || riskRaw === 'UNACCEPTABLE' ? riskRaw : riskRaw,
        regulatory_scope: m.regulatory_scope || (m.framework?.includes('EU') ? ['EU AI Act'] : ['GDPR', 'SOC 2']),
        lifecycle_stage: (m.lifecycle_stage || m.lifecyclePhase || m.status || 'DRAFT').toUpperCase(),
        last_validated: lastValDate,
        next_review: m.nextReviewDate || m.next_review || '2026-09-15',
        aiia_ref: m.aiiaRef || m.aiia_ref || null,
        mrc_approval_id: m.mrc_approval_id || m.mrcApprovalId || `MRC-${Math.floor(800 + Math.random() * 200)}`,
        validation_status: m.validation_status || (overdueValidation ? 'FAILED' : 'PASSED'),
        last_eval_score: m.lastEvalScore || m.accuracy || 85,
        explainability_method: m.explainability_method || 'SHAP',
        active_agents_using: m.activeAgentsCount || 2,
        deployed_guardrails: m.guardrails?.length || 3,
        genai_risk_score: m.genai_risk_score || 0.12,
        deprecation_reason: m.deprecation_reason || '',
        is_kill_switched: m.is_kill_switched || (m.driftStatus === 'critical') || false,
        drift_status: m.driftStatus || 'stable',
        overdueValidation,
        fairness_score: m.fairnessScore || 88,
        accuracy: m.accuracy || 90,
        latencyMs: m.latencyMs || 80,
        input_schema: m.input_schema || '{\n  "features": ["income", "age", "loan_amount"]\n}',
        output_schema: m.output_schema || '{\n  "probability": 0.12,\n  "decision": "APPROVED"\n}',
      };
    });
  }, [items]);

  /* ── Filters from URL ── */
  const activeStatuses = searchParams.getAll('status');
  const activeRiskTiers = searchParams.getAll('risk_tier');

  const toggleFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    const currentValues = nextParams.getAll(key);
    nextParams.delete(key);
    if (currentValues.includes(value)) {
      currentValues.filter(v => v !== value).forEach(v => nextParams.append(key, v));
    } else {
      [...currentValues, value].forEach(v => nextParams.append(key, v));
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => setSearchParams(new URLSearchParams());

  /* ── Sort ── */
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  /* ── Filtered + sorted list ── */
  const filteredModels = useMemo(() => {
    return unifiedModels
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase()) || m.owner_team.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(m.lifecycle_stage);
        const matchesRisk = activeRiskTiers.length === 0 || activeRiskTiers.some(r => m.risk_tier.toUpperCase().includes(r));
        return matchesSearch && matchesStatus && matchesRisk;
      })
      .sort((a, b) => {
        const valA = a[sortCol as keyof typeof a];
        const valB = b[sortCol as keyof typeof b];
        if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
        if (typeof valA === 'number') return sortDir === 'asc' ? valA - (valB as number) : (valB as number) - valA;
        return 0;
      });
  }, [unifiedModels, search, activeStatuses, activeRiskTiers, sortCol, sortDir]);

  const selectedModel = useMemo(() => unifiedModels.find(m => m.id === selectedId) || null, [unifiedModels, selectedId]);

  /* ── Gating checks ── */
  const gates = useMemo(() => {
    if (!selectedModel) return { meetsAll: false, aiia: false, validation: false, mrc: false };
    const aiia = !!selectedModel.aiia_ref;
    const validation = selectedModel.validation_status === 'PASSED';
    const mrc = !!selectedModel.mrc_approval_id;
    return { meetsAll: validation && mrc, aiia, validation, mrc };
  }, [selectedModel]);

  /* ── Action handlers ── */
  const execPromote = async () => {
    if (!selectedModel) return;
    const map: Record<string, string> = { DRAFT: 'IN_REVIEW', IN_REVIEW: 'APPROVED', APPROVED: 'DEPLOYED', DEPLOYED: 'PRODUCTION', STAGING: 'PRODUCTION', VALIDATION: 'STAGING', MONITORING: 'PRODUCTION' };
    const next = map[selectedModel.lifecycle_stage] || 'IN_REVIEW';
    try { await saveModel({ id: selectedModel.id, lifecycle_stage: next }); toast.success(`Promoted to ${next}`); }
    catch { toast.error('Promotion failed'); }
    setConfirm(null);
  };

  const execRetire = async () => {
    if (!selectedModel) return;
    try { await saveModel({ id: selectedModel.id, lifecycle_stage: 'RETIRED' }); toast.success('Model retired'); }
    catch { toast.error('Retire failed'); }
    setConfirm(null);
  };

  /* ── KPI numbers ── */
  const kpis = useMemo(() => ({
    total: unifiedModels.length,
    live: unifiedModels.filter(m => ['PRODUCTION', 'DEPLOYED'].includes(m.lifecycle_stage)).length,
    highRisk: unifiedModels.filter(m => ['HIGH', 'UNACCEPTABLE', 'CRITICAL'].includes(m.risk_tier)).length,
    underReview: unifiedModels.filter(m => ['IN_REVIEW', 'DRAFT', 'VALIDATION'].includes(m.lifecycle_stage)).length,
    overdue: unifiedModels.filter(m => m.overdueValidation).length,
    killSwitched: unifiedModels.filter(m => m.is_kill_switched).length,
  }), [unifiedModels]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Breadcrumbs />
      <ContextualAlert module="lifecycle" />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Robot size={22} weight="duotone" style={{ color: 'hsl(var(--brand))' }} />
            Model Inventory & Lifecycle
          </h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-4))', marginTop: 4, margin: 0 }}>
            Operational registry, compliance checks, and phase transition gates
          </p>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Models', value: kpis.total, color: 'hsl(var(--brand))', icon: <Robot size={16} /> },
          { label: 'Live in Production', value: kpis.live, color: 'hsl(var(--s-ok-tx))', icon: <CheckCircle size={16} /> },
          { label: 'High/Critical Risk', value: kpis.highRisk, color: 'hsl(var(--s-er-tx))', icon: <ShieldWarning size={16} /> },
          { label: 'Under Review', value: kpis.underReview, color: 'hsl(var(--s-wn-tx))', icon: <Clock size={16} /> },
          { label: 'Overdue Validation', value: kpis.overdue, color: kpis.overdue > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))', icon: <Warning size={16} /> },
          { label: 'Kill-Switched', value: kpis.killSwitched, color: kpis.killSwitched > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))', icon: <Prohibit size={16} /> },
        ].map((tile, i) => (
          <div key={i} style={{ padding: '12px 14px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ color: tile.color }}>{tile.icon}</span>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', margin: 0 }}>{tile.label}</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: tile.color, margin: 0 }}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
        <Funnel size={14} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} />

        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <MagnifyingGlass size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-4))' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models, teams…"
            style={{ width: '100%', padding: '5px 8px 5px 26px', fontSize: 12, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', outline: 'none' }}
          />
        </div>

        <div style={{ width: 1, height: 20, background: 'hsl(var(--border))' }} />

        {/* Status chips */}
        <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--text-4))', textTransform: 'uppercase' }}>Status:</span>
        {['DRAFT', 'IN_REVIEW', 'APPROVED', 'DEPLOYED', 'PRODUCTION', 'DEPRECATED'].map(s => (
          <button
            key={s}
            onClick={() => toggleFilter('status', s)}
            style={{
              fontSize: 10, padding: '3px 8px', fontWeight: 600, cursor: 'pointer',
              background: activeStatuses.includes(s) ? STAGE_BG[s] || 'hsl(var(--brand-subtle))' : 'none',
              color: activeStatuses.includes(s) ? STAGE_COLORS[s] || 'hsl(var(--brand))' : 'hsl(var(--text-4))',
              border: `1px solid ${activeStatuses.includes(s) ? STAGE_COLORS[s] || 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
              transition: 'all 0.12s',
            }}
          >
            {s}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'hsl(var(--border))' }} />

        {/* Risk chips */}
        <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--text-4))', textTransform: 'uppercase' }}>Risk:</span>
        {['HIGH', 'LIMITED', 'MINIMAL', 'UNACCEPTABLE'].map(r => (
          <button
            key={r}
            onClick={() => toggleFilter('risk_tier', r)}
            style={{
              fontSize: 10, padding: '3px 8px', fontWeight: 600, cursor: 'pointer',
              background: activeRiskTiers.includes(r) ? 'hsl(var(--brand-subtle))' : 'none',
              color: activeRiskTiers.includes(r) ? 'hsl(var(--brand))' : 'hsl(var(--text-4))',
              border: `1px solid ${activeRiskTiers.includes(r) ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
            }}
          >
            {r}
          </button>
        ))}

        {(activeStatuses.length > 0 || activeRiskTiers.length > 0 || search) && (
          <button onClick={() => { clearFilters(); setSearch(''); }} style={{ marginLeft: 'auto', fontSize: 11, color: 'hsl(var(--text-4))', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} /> Clear all
          </button>
        )}

        <span style={{ marginLeft: activeStatuses.length > 0 || activeRiskTiers.length > 0 || search ? 0 : 'auto', fontSize: 11, color: 'hsl(var(--text-4))' }}>
          {filteredModels.length} of {unifiedModels.length} models
        </span>
      </div>

      {/* ── Table ── */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'hsl(var(--bg-raised))', borderBottom: '2px solid hsl(var(--border))' }}>
                <tr>
                  <SortTh col="name" label="Name / ID" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="version" label="Version" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="owner_team" label="Owner Team" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="risk_tier" label="Risk Tier" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-4))', whiteSpace: 'nowrap' }}>Framework</th>
                  <SortTh col="lifecycle_stage" label="Stage" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="validation_status" label="Validation" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="last_validated" label="Last Validated" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="next_review" label="Next Review" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--text-4))', fontSize: 13 }}>
                      No models match your current filters. <button onClick={() => { clearFilters(); setSearch(''); }} style={{ color: 'hsl(var(--brand))', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Clear filters</button>
                    </td>
                  </tr>
                ) : filteredModels.map((model, i) => (
                  <tr
                    key={model.id}
                    onClick={() => setSelectedId(model.id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid hsl(var(--border))',
                      background: selectedId === model.id
                        ? 'hsl(var(--brand-subtle))'
                        : i % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-raised))',
                      borderLeft: model.is_kill_switched
                        ? '3px solid hsl(var(--s-er-tx))'
                        : model.drift_status === 'critical'
                          ? '3px solid hsl(var(--s-wn-tx))'
                          : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '11px 12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{model.name}</span>
                          {model.is_kill_switched && (
                            <span style={{ fontSize: 9, padding: '1px 5px', background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', fontWeight: 800, letterSpacing: '0.05em', animation: 'pulse 1.5s infinite' }}>
                              KILL-SWITCHED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--text-4))', fontFamily: 'monospace', marginTop: 2 }}>{model.id}</div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{model.version}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: 'hsl(var(--text-2))' }}>{model.owner_team}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <RiskBadge level={model.risk_tier} />
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))', textTransform: 'uppercase' }}>
                      {model.framework?.substring(0, 14)}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <StagePill stage={model.lifecycle_stage} />
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: model.validation_status === 'PASSED' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                        {model.validation_status === 'PASSED' ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{model.last_validated}</div>
                        {model.overdueValidation && (
                          <div style={{ fontSize: 10, color: 'hsl(var(--s-er-tx))', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <Warning size={10} weight="fill" /> Overdue &gt;90d
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: 'hsl(var(--text-3))' }}>{model.next_review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail SlideOver Panel ── */}
      <SlideOverPanel
        open={!!selectedId}
        onOpenChange={open => !open && setSelectedId(null)}
        title="Model GRC Detail Panel"
        entityType="model"
        entityId={selectedId || ''}
      >
        {selectedModel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 12, color: 'hsl(var(--text-3))' }}>

            {/* ── Action Bar ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid hsl(var(--border))', paddingBottom: 14, marginBottom: 16 }}>
              <button
                onClick={() => setConfirm('promote')}
                style={{ padding: '7px 14px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                ↑ Promote Stage
              </button>
              <button
                onClick={() => toast.success('Validation request dispatched to model risk team')}
                style={{ padding: '7px 12px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 12, color: 'hsl(var(--text-2))' }}
              >
                Request Validation
              </button>
              <button
                onClick={() => toast.success(`${selectedModel.id} flagged for next MRC agenda`)}
                style={{ padding: '7px 12px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 12, color: 'hsl(var(--text-2))' }}
              >
                Flag for MRC
              </button>
              <button
                onClick={() => setConfirm('retire')}
                style={{ padding: '7px 12px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', cursor: 'pointer', fontSize: 12, color: 'hsl(var(--s-er-tx))', fontWeight: 600 }}
              >
                Retire Model
              </button>
            </div>

            {/* ── Kill-switch alert ── */}
            {selectedModel.is_kill_switched && (
              <div style={{ padding: '10px 12px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Prohibit size={14} weight="fill" style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--s-er-tx))' }}>KILL-SWITCH ACTIVE — Model inference halted. Immediate investigation required.</span>
              </div>
            )}

            {/* ── Promotion gates (shown for all stages) ── */}
            <div style={{ padding: '12px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 10 }}>
                Deployment Gates Checklist
              </p>
              {[
                { label: 'AIIA Assessment Reference', met: !!selectedModel.aiia_ref, value: selectedModel.aiia_ref || 'Not linked' },
                { label: 'Validation Status = PASSED', met: selectedModel.validation_status === 'PASSED', value: selectedModel.validation_status },
                { label: 'MRC Approval ID', met: !!selectedModel.mrc_approval_id, value: selectedModel.mrc_approval_id },
              ].map(gate => (
                <div key={gate.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{gate.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{gate.value}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gate.met ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                      {gate.met ? '✓ MET' : '✗ MISSING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Metadata Grid ── */}
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 10 }}>Model Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Model ID', value: <span style={{ fontFamily: 'monospace' }}>{selectedModel.id}</span> },
                { label: 'Name', value: selectedModel.name },
                { label: 'Version', value: <span style={{ fontFamily: 'monospace' }}>{selectedModel.version}</span> },
                { label: 'Owner Team', value: selectedModel.owner_team },
                { label: 'Business Unit', value: selectedModel.business_unit },
                { label: 'Risk Tier', value: <RiskBadge level={selectedModel.risk_tier} /> },
                { label: 'Framework', value: <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{selectedModel.framework}</span> },
                { label: 'Lifecycle Stage', value: <StagePill stage={selectedModel.lifecycle_stage} /> },
                { label: 'Validation Status', value: <span style={{ color: selectedModel.validation_status === 'PASSED' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', fontWeight: 700 }}>{selectedModel.validation_status}</span> },
                { label: 'Last Eval Score', value: `${selectedModel.last_eval_score}%` },
                { label: 'Fairness Score', value: `${selectedModel.fairness_score}%` },
                { label: 'Explainability', value: selectedModel.explainability_method },
                { label: 'Active Agents', value: selectedModel.active_agents_using },
                { label: 'Guardrails', value: selectedModel.deployed_guardrails },
              ].map(row => (
                <div key={String(row.label)} style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: 6 }}>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{row.label}</p>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{row.value}</div>
                </div>
              ))}
            </div>

            {/* ── Purpose ── */}
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 6 }}>Purpose</p>
            <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.6, padding: '10px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', marginBottom: 16 }}>
              {selectedModel.purpose}
            </p>

            {/* ── Schemas ── */}
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 10 }}>I/O Schema Definitions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4 }}>Input Schema</p>
                <pre style={{ fontSize: 10, fontFamily: 'monospace', background: 'hsl(var(--bg-raised))', padding: 10, border: '1px solid hsl(var(--border))', whiteSpace: 'pre-wrap', color: 'hsl(var(--text-1))', margin: 0 }}>
                  {selectedModel.input_schema}
                </pre>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4 }}>Output Schema</p>
                <pre style={{ fontSize: 10, fontFamily: 'monospace', background: 'hsl(var(--bg-raised))', padding: 10, border: '1px solid hsl(var(--border))', whiteSpace: 'pre-wrap', color: 'hsl(var(--text-1))', margin: 0 }}>
                  {selectedModel.output_schema}
                </pre>
              </div>
            </div>

            {/* ── Interlinks ── */}
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 8 }}>Connected GRC Modules</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <InterlinkChip label="Model DNA Lineage" to="/models/dna" />
              <InterlinkChip label="Validation Lab" to="/model-validation" />
              <InterlinkChip label="Explainability Center" to="/explainability" />
              <InterlinkChip label="Eval Results" to="/evals/results" />
              <InterlinkChip label="Agent Registry" to="/agent-registry" />
              <InterlinkChip label="Guardrail Rules" to="/trust-engine/guardrails" />
              <InterlinkChip label="Model Risk Committee" to="/mrc" />
              <InterlinkChip label="GenAI Risks" to="/genai-risks" />
              <InterlinkChip label="Bias Audit" to="/models/inventory" />
            </div>

            {selectedModel.aiia_ref && (
              <div style={{ marginTop: 16, padding: '10px 12px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', marginBottom: 4 }}>AIIA Assessment Reference</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'hsl(var(--brand))', background: 'hsl(var(--brand-subtle))', padding: '2px 8px' }}>{selectedModel.aiia_ref}</span>
                  <InterlinkChip label="View Dossier" to="/aiia" />
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>

      {/* ── Confirmation Dialogs ── */}
      {confirm === 'promote' && selectedModel && (
        <ConfirmDialog
          title={`Promote ${selectedModel.name}?`}
          message={`This will move ${selectedModel.name} (${selectedModel.id}) from ${selectedModel.lifecycle_stage} to the next stage. Ensure all deployment gates are met before proceeding.`}
          confirmLabel="Promote Stage"
          onConfirm={execPromote}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'retire' && selectedModel && (
        <ConfirmDialog
          title={`Retire ${selectedModel.name}?`}
          message={`Retiring ${selectedModel.name} (${selectedModel.id}) will mark it as permanently decommissioned. All active inference endpoints should be migrated before proceeding. This action cannot be undone without manual override.`}
          confirmLabel="Retire Model"
          onConfirm={execRetire}
          onCancel={() => setConfirm(null)}
          destructive
        />
      )}
    </div>
  );
}
