// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// GenAIRisks — Generative AI-specific risk catalogue (NIST AI 600-1).

import { useState, useMemo, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, PencilSimple, Cpu, ShieldCheck, X,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { UserSelect } from '@/components/evals/UserSelect';
import { genaiRiskHooks } from '@/hooks/queries/useTrustEngineCrud';
import type { GenAIRiskProfile } from '@/types/trustEngine';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { useModelOptions } from '@/hooks/useAiiaData';
import { useAuthStore } from '@/store/authStore';

type Severity = GenAIRiskProfile['severity'];
type MitigationStatus = GenAIRiskProfile['mitigationStatus'];
type GuardrailCoverage = GenAIRiskProfile['guardrailCoverage'];

const NIST_600_1_RISKS = [
  { num: 1, name: 'Confabulation (Hallucination)', desc: 'The tendency to generate plausible but factually incorrect outputs.' },
  { num: 2, name: 'Data Privacy', desc: 'Risk of exposing or inferring sensitive personal information from training data.' },
  { num: 3, name: 'Bias/Discrimination', desc: 'Outputs that reflect or amplify societal biases and unfair outcomes.' },
  { num: 4, name: 'Harmful Content', desc: 'Generation of content that could harm individuals or society.' },
  { num: 5, name: 'Intellectual Property', desc: 'Unauthorized reproduction or use of copyrighted material.' },
  { num: 6, name: 'Cybersecurity', desc: 'Susceptibility to adversarial attacks, prompt injection, and model extraction.' },
  { num: 7, name: 'Data Poisoning', desc: 'Malicious manipulation of training data to alter model behavior.' },
  { num: 8, name: 'Lack of Interpretability', desc: 'Inability to explain model decisions and reasoning processes.' },
  { num: 9, name: 'Human-AI Confusion', desc: 'Users mistaking AI-generated content for human-generated content.' },
  { num: 10, name: 'Dual Use Risk', desc: 'Potential misuse of AI capabilities for harmful applications.' },
  { num: 11, name: 'Environmental Impact', desc: 'Carbon emissions and resource consumption from training and inference.' },
  { num: 12, name: 'Misuse Facilitation', desc: 'AI systems being used to facilitate illegal or harmful activities.' },
];

function severityColor(s: Severity) {
  switch (s) {
    case 'Critical': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'High': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Medium': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Low': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

function mitigationColor(s: MitigationStatus) {
  switch (s) {
    case 'Implemented': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Partial': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Under Review': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Not Addressed': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

/** Display id: legacy GRP- codes render as-is; uuid ids render as a short reference — never a raw uuid. */
function displayId(id: string) {
  return id.startsWith('GRP-') ? id : id.slice(0, 8).toUpperCase();
}

export default function GenAIRisks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const openParam = searchParams.get('open');
  const { data: profiles = [], isLoading, error } = genaiRiskHooks.useList();
  const upsert = genaiRiskHooks.useUpsert();
  const remove = genaiRiskHooks.useDelete();
  const { models } = useModelOptions();
  const currentUser = useAuthStore(s => s.user);
  const defaultOwner = currentUser?.name || currentUser?.email || '';
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<GenAIRiskProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [wModelId, setWModelId] = useState('');
  const [wCategory, setWCategory] = useState(NIST_600_1_RISKS[0].name);
  const [wSeverity, setWSeverity] = useState<Severity>('High');
  const [wGuardrails, setWGuardrails] = useState('');
  const [wCoverage, setWCoverage] = useState<GuardrailCoverage>('None');
  const [wOwner, setWOwner] = useState('');

  // Resolve the display name at render time; the stored snapshot is the fallback.
  const resolvedModelName = (p: Pick<GenAIRiskProfile, 'modelId' | 'model'>) =>
    (p.modelId ? models.find(m => m.id === p.modelId)?.name : undefined) ?? p.model ?? 'Unavailable';

  function openCreate() {
    setEditingId(null);
    setWModelId(''); setWCategory(NIST_600_1_RISKS[0].name); setWSeverity('High');
    setWGuardrails(''); setWCoverage('None'); setWOwner(defaultOwner);
    setCreateOpen(true);
  }

  function openEdit(p: GenAIRiskProfile) {
    setEditingId(p.id);
    // Legacy rows stored only a name — recover the registry uuid by name match.
    setWModelId(p.modelId ?? models.find(m => m.name === p.model)?.id ?? '');
    setWCategory(p.riskCategory); setWSeverity(p.severity);
    setWGuardrails(p.guardrails === 'None' ? '' : p.guardrails); setWCoverage(p.guardrailCoverage); setWOwner(p.owner);
    setCreateOpen(true);
  }

  // Deep-link: ?open=<id> opens that profile's detail sheet once it loads.
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openParam || profiles.length === 0) return;
    if (openedRef.current === openParam) return;
    const rec = profiles.find(p => p.id === openParam);
    if (rec) { setSelected(rec); setSheetOpen(true); openedRef.current = openParam; }
  }, [openParam, profiles]);

  const filtered = useMemo(() => profiles.filter(p => {
    const matchSearch = !search || p.model.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.riskCategory.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.riskCategory === filterCategory;
    const matchSeverity = !filterSeverity || p.severity === filterSeverity;
    const matchModel = !modelParam || p.modelId === modelParam;
    return matchSearch && matchCat && matchSeverity && matchModel;
  }), [profiles, search, filterCategory, filterSeverity, modelParam]);

  const critical = profiles.filter(p => p.severity === 'Critical').length;
  const notAddressed = profiles.filter(p => p.mitigationStatus === 'Not Addressed').length;
  const implemented = profiles.filter(p => p.mitigationStatus === 'Implemented').length;
  const highRisk = profiles.filter(p => p.severity === 'High').length;

  const activeFilterCount = (filterSeverity ? 1 : 0) + (filterCategory ? 1 : 0) + (modelParam ? 1 : 0);

  function submitCreate() {
    if (!wModelId) { toast.error('Linked model is required'); return; }
    if (!wOwner) { toast.error('Owner is required'); return; }
    const risk = NIST_600_1_RISKS.find(r => r.name === wCategory);
    const existing = editingId ? profiles.find(p => p.id === editingId) : null;
    const modelName = models.find(m => m.id === wModelId)?.name ?? existing?.model ?? '';
    const rec: GenAIRiskProfile = {
      // Stable uuid ids — never a re-mintable GRP-N counter (collides after soft-delete).
      id: editingId ?? crypto.randomUUID(),
      modelId: wModelId,
      model: modelName,
      riskCategory: wCategory,
      riskNumber: risk?.num || 1,
      severity: wSeverity,
      guardrails: wGuardrails || 'None',
      guardrailCoverage: wCoverage,
      mitigationStatus: wCoverage === 'Implemented' ? 'Implemented' : wCoverage === 'Partial' ? 'Partial' : (existing?.mitigationStatus === 'Under Review' ? 'Under Review' : 'Not Addressed'),
      owner: wOwner,
      created: existing?.created ?? new Date().toISOString().split('T')[0],
      mitigationEvents: existing?.mitigationEvents,
      version: existing?.version,
    };
    upsert.mutate(rec, {
      onSuccess: (saved) => {
        toast.success(editingId ? `Risk profile "${displayId(rec.id)}" updated` : `Risk profile "${displayId(rec.id)}" created for ${rec.model}`);
        if (selected?.id === rec.id) setSelected(saved);
      },
      onError: (e: Error) => toast.error(`Failed to save risk profile: ${e.message}`),
    });
    setCreateOpen(false);
  }

  function deleteProfile(id: string) {
    remove.mutate(id, {
      onSuccess: () => {
        toast.success(`Risk profile "${displayId(id)}" removed`);
        if (selected?.id === id) { setSheetOpen(false); setSelected(null); }
      },
      onError: (e: Error) => toast.error(`Failed to remove risk profile: ${e.message}`),
    });
  }

  const selectedRiskInfo = selected ? NIST_600_1_RISKS.find(r => r.num === selected.riskNumber) : null;

  if (isLoading) return <PageSkeleton title="GenAI Risk Profiles" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GenAI Risk Profiles"
        subtitle="Generative AI-specific risk catalogue — NIST AI 600-1 risk management"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'GenAI Risk Profiles' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/trust-engine/guardrails')} style={{ borderRadius: 0 }}>
              <ShieldCheck size={15} /> Guardrails
            </Button>
            <Button onClick={openCreate} style={{ borderRadius: 0 }}>
              <Plus size={15} /> Create Risk Profile
            </Button>
          </div>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load risk profiles</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (deep-link from a model's Governance card) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{models.find(m => m.id === modelParam)?.name ?? 'Unavailable'}</strong></span>
            <button
              aria-label="Clear model filter"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <StatCardRow
        cards={[
          {
            label: 'Total Profiles',
            value: profiles.length,
            description: `Total GenAI Risk Profiles: ${profiles.length}`,
          },
          {
            label: 'Critical Risks',
            value: critical,
            description: `Critical severity risks: ${critical}`,
          },
          {
            label: 'High Risk',
            value: highRisk,
            description: `High severity risks: ${highRisk}`,
          },
          {
            label: 'Not Addressed',
            value: notAddressed,
            description: `Risks with no mitigation in place: ${notAddressed}`,
          },
        ]}
      />

      {/* NIST 600-1 risk category grid */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
        {NIST_600_1_RISKS.map(risk => {
          const affected = profiles.filter(p => p.riskCategory === risk.name);
          const hasCritical = affected.some(p => p.severity === 'Critical');
          const hasHigh = affected.some(p => p.severity === 'High');
          const isActive = filterCategory === risk.name;
          return (
            <button key={risk.num}
              onClick={() => setFilterCategory(isActive ? null : risk.name)}
              className="p-3 border text-left transition-colors"
              style={{ borderRadius: 0, borderColor: isActive ? 'hsl(var(--brand))' : hasCritical ? 'hsl(var(--s-er-br))' : hasHigh ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))', background: isActive ? 'hsl(var(--brand-subtle))' : hasCritical ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-surface))' }}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-[11px] font-semibold leading-tight" style={{ color: hasCritical ? 'hsl(var(--s-er-tx))' : isActive ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{risk.name}</p>
                {affected.length > 0 && (
                  <span className="text-[10px] font-bold px-1 flex-shrink-0" style={{ background: hasCritical ? 'hsl(var(--s-er-bg))' : 'hsl(var(--brand-subtle))', color: hasCritical ? 'hsl(var(--s-er-tx))' : 'hsl(var(--brand))', borderRadius: 0 }}>
                    {affected.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search profiles by model, category, ID…"
        filters={[
          {
            key: 'severity',
            label: 'Severity',
            value: filterSeverity,
            onChange: v => setFilterSeverity(v),
            options: ['Critical', 'High', 'Medium', 'Low'].map(s => ({ label: s, value: s })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setFilterSeverity(''); setFilterCategory(null); }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">
            {filtered.length} profile{filtered.length !== 1 ? 's' : ''}
            {filterCategory && (
              <> · Filtered: <strong>{filterCategory}</strong>
                <button onClick={() => setFilterCategory(null)} className="ml-1 underline text-[hsl(var(--brand))]">×</button>
              </>
            )}
          </span>
        }
      />

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['Profile ID', 'Model', 'NIST 600-1 Risk', 'Severity', 'Guardrail Coverage', 'Mitigation Status', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = severityColor(p.severity);
                  const mc = mitigationColor(p.mitigationStatus);
                  return (
                    <tr key={p.id} className="border-b hover:bg-raised transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                      onClick={() => { setSelected(p); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{displayId(p.id)}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{resolvedModelName(p)}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                        <span className="text-[10px] mr-1.5 font-mono" style={{ color: 'hsl(var(--text-4))' }}>#{p.riskNumber}</span>{p.riskCategory}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 font-semibold" style={{ background: sc.bg, color: sc.text, borderRadius: 0 }}>{p.severity}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{p.guardrails}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5" style={{ background: mc.bg, color: mc.text, borderRadius: 0 }}>{p.mitigationStatus}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{p.owner}</td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                            onClick={() => { setSelected(p); setSheetOpen(true); }}>
                            <Eye size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                            onClick={() => openEdit(p)}>
                            <PencilSimple size={13} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}>
                                <Trash size={13} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                <AlertDialogDescription>Delete {displayId(p.id)}? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction style={{ borderRadius: 0 }} onClick={() => deleteProfile(p.id)}>Delete</AlertDialogAction>
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
            {filtered.length === 0 && (
              profiles.length === 0 && !error ? (
                <div className="py-12 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
                  <p className="text-sm text-[hsl(var(--text-3))]">No GenAI risk profiles recorded for your organization yet.</p>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">Create the first profile to start cataloguing NIST AI 600-1 risks per model.</p>
                  <Button className="mt-4" style={{ borderRadius: 0 }} onClick={openCreate}>
                    <Plus size={15} /> Create Risk Profile
                  </Button>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">
                  No risk profiles match the current filters.
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{ width: 540, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{displayId(selected.id)}</span>
                  {resolvedModelName(selected)}
                </SheetTitle>
                {/* Cross-module: risk profile → model registry / guardrails */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }}
                    onClick={() => selected.modelId
                      ? navigate(`/models/inventory/${selected.modelId}`)
                      : navigate(`/models/inventory?q=${encodeURIComponent(selected.model)}`)}>
                    <Cpu size={12} /> View Model
                  </Button>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/trust-engine/guardrails')}>
                    <ShieldCheck size={12} /> Guardrails
                  </Button>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => { setSheetOpen(false); openEdit(selected); }}>
                    <PencilSimple size={12} /> Edit
                  </Button>
                </div>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="guidance" style={{ borderRadius: 0 }}>NIST 600-1 Guidance</TabsTrigger>
                  <TabsTrigger value="guardrails" style={{ borderRadius: 0 }}>Guardrails</TabsTrigger>
                  <TabsTrigger value="log" style={{ borderRadius: 0 }}>Mitigation Log</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  {(() => {
                    const score = selected.severity === 'Critical' ? 92 : selected.severity === 'High' ? 74 : selected.severity === 'Medium' ? 48 : 22;
                    const sc = severityColor(selected.severity);
                    return (
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Severity index (derived from rating)</span>
                          <span className="text-lg font-bold" style={{ color: sc.text }}>{score}/100</span>
                        </div>
                        <div className="w-full h-2" style={{ background: 'hsl(var(--border))' }}>
                          <div className="h-full transition-all" style={{ width: `${score}%`, background: sc.text }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Low</span>
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Critical</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Model', value: resolvedModelName(selected) },
                      { label: 'Owner', value: selected.owner },
                      { label: 'NIST Risk #', value: `#${selected.riskNumber}` },
                      { label: 'Created', value: selected.created },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <p className="text-[10px] mb-0.5" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Severity', badge: selected.severity, color: severityColor(selected.severity) },
                      { label: 'Coverage', badge: selected.guardrailCoverage, color: mitigationColor(selected.mitigationStatus) },
                      { label: 'Mitigation', badge: selected.mitigationStatus, color: mitigationColor(selected.mitigationStatus) },
                    ].map(({ label, badge, color }) => (
                      <div key={label} className="p-2 text-center" style={{ background: color.bg, border: `1px solid ${color.bg}`, borderRadius: 0 }}>
                        <p className="text-[10px] mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                        <p className="text-xs font-bold" style={{ color: color.text }}>{badge}</p>
                      </div>
                    ))}
                  </div>
                  {selectedRiskInfo && (
                    <div className="p-3" style={{ background: 'hsl(var(--brand-subtle))', borderLeft: '3px solid hsl(var(--brand))', borderRadius: 0 }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--brand))' }}>NIST AI 600-1 — {selectedRiskInfo.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{selectedRiskInfo.desc}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="guidance" className="mt-4 space-y-3">
                  {selectedRiskInfo && (
                    <>
                      <div className="p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))', borderRadius: 0 }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>NIST AI 600-1 — Risk #{selectedRiskInfo.num}</p>
                        <p className="text-sm font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedRiskInfo.name}</p>
                        <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-3))' }}>{selectedRiskInfo.desc}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Suggested controls (static guidance):</p>
                        {[
                          { action: 'Implement monitoring and detection controls', priority: 'High' },
                          { action: 'Establish testing protocols before deployment', priority: 'High' },
                          { action: 'Define escalation procedures for detected incidents', priority: 'Medium' },
                          { action: 'Document mitigation strategies and their effectiveness', priority: 'Medium' },
                          { action: 'Conduct periodic red team exercises targeting this risk', priority: 'Low' },
                        ].map(({ action, priority }) => {
                          const pColor = priority === 'High' ? 'hsl(var(--s-er-tx))' : priority === 'Medium' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))';
                          return (
                            <div key={action} className="flex items-start justify-between p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{action}</span>
                              <span className="text-[10px] font-bold ml-3 whitespace-nowrap" style={{ color: pColor }}>{priority}</span>
                            </div>
                          );
                        })}
                      </div>
                      <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                        onClick={() => navigate('/trust-engine/guardrails')}>Apply Recommended Guardrail</Button>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="guardrails" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Guardrail Coverage</p>
                    <Badge style={{ ...mitigationColor(selected.mitigationStatus), borderRadius: 0, fontSize: 10 }}>{selected.guardrailCoverage}</Badge>
                  </div>
                  {selected.guardrails !== 'None' ? (
                    <>
                      {(selected.guardrails ?? '').split(', ').filter(Boolean).map((g: string) => (
                        <div key={g} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0 }}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--s-ok-tx))' }} />
                            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{g}</span>
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>ACTIVE</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0 }}>
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>No guardrails configured</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>This risk has no active controls. Immediate action recommended.</p>
                      <Button size="sm" className="mt-3" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
                        onClick={() => navigate('/trust-engine/guardrails')}>Assign Guardrail</Button>
                    </div>
                  )}
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Coverage Assessment (recorded)</p>
                    <div className="flex gap-1">
                      {([
                        { level: 'None', label: 'None', color: 'hsl(var(--s-er-tx))', bg: 'hsl(var(--s-er-bg))' },
                        { level: 'Partial', label: 'Partial', color: 'hsl(var(--s-wn-tx))', bg: 'hsl(var(--s-wn-bg))' },
                        { level: 'Implemented', label: 'Full', color: 'hsl(var(--s-ok-tx))', bg: 'hsl(var(--s-ok-bg))' },
                      ] as const).map(({ level, label, color, bg }) => {
                        const active = selected.guardrailCoverage === level;
                        return (
                          <div key={level} className="flex-1 py-2 text-center border" style={{
                            borderRadius: 0,
                            borderColor: active ? color : 'hsl(var(--border))',
                            background: active ? bg : 'transparent',
                          }}>
                            <p className="text-xs font-bold" style={{ color: active ? color : 'hsl(var(--text-4))' }}>{label}</p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-4))' }}>
                      Recorded coverage assessment for this risk — no per-dimension coverage measurements are collected yet.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="log" className="mt-4 space-y-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Mitigation Log</p>
                  {(selected.mitigationEvents?.length ?? 0) > 0 ? (
                    selected.mitigationEvents!.map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 pb-3" style={{ borderBottom: i < selected.mitigationEvents!.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--brand))' }} />
                          {i < selected.mitigationEvents!.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))', minHeight: 16 }} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{ev.action}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{ev.date} · {ev.user}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No mitigation events recorded</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        Events appear here when mitigation actions are recorded against this profile.
                        Profile created {selected.created} by {selected.owner}.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Profile Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit Risk Profile ${displayId(editingId)}` : 'Create GenAI Risk Profile'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Linked Model *</label>
              {/* Real registry select — stores ai_models.id (uuid) + a name snapshot */}
              <Select value={wModelId || undefined} onValueChange={setWModelId}>
                <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select registry model..." /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>NIST 600-1 Risk Category *</label>
              <Select value={wCategory} onValueChange={setWCategory}>
                <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {NIST_600_1_RISKS.map(r => <SelectItem key={r.num} value={r.name}>#{r.num} — {r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Severity *</label>
              <div className="flex gap-2">
                {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map(s => (
                  <button key={s} onClick={() => setWSeverity(s)}
                    className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wSeverity === s ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wSeverity === s ? 'hsl(var(--brand-subtle))' : 'transparent', color: wSeverity === s ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Current Guardrails</label>
              <Input style={{ borderRadius: 0 }} value={wGuardrails} onChange={e => setWGuardrails(e.target.value)} placeholder="e.g. Hallucination Guard (TP-003)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Coverage Assessment *</label>
              <div className="flex gap-2">
                {(['None', 'Partial', 'Implemented'] as GuardrailCoverage[]).map(c => (
                  <button key={c} onClick={() => setWCoverage(c)}
                    className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wCoverage === c ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wCoverage === c ? 'hsl(var(--brand-subtle))' : 'transparent', color: wCoverage === c ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Owner *</label>
              <UserSelect value={wOwner} onChange={setWOwner} by="name" rolesFilter={['risk', 'ml', 'compliance', 'ciso']} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitCreate} loading={upsert.isPending}>{editingId ? 'Save Changes' : 'Create Profile'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
