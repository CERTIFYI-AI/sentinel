// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRiskClassifications, useModelOptions, useUseCases } from '@/hooks/useAiiaData';
import {
  deriveEuTier, PROHIBITED_PRACTICES, ANNEX_III_CATEGORIES,
  type RiskClassification, type RiskTier, type TieringInput,
} from '@/services/riskTieringService';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, Check, ArrowRight, Warning, Info, CheckCircle,
  ShieldCheck, Spinner, Prohibit, X, ArrowSquareOut,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
import { PageHeader } from '../components/ui/PageHeader';
import { StatCardRow } from '../components/ui/StatCardRow';
import { FilterBar } from '../components/ui/FilterBar';
import type { StatCardRowItem } from '../components/ui/StatCardRow';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Tier / status display metadata ──────────────────────────────────────────────

const TIER_META: Record<RiskTier, { label: string; bg: string; text: string; border: string }> = {
  unacceptable: { label: 'Unacceptable', bg: 'bg-[hsl(var(--s-er-bg))]', text: 'text-[hsl(var(--s-er-tx))]', border: 'border-[hsl(var(--s-er-br))]' },
  high: { label: 'High Risk', bg: 'bg-[hsl(var(--r-hi-bg))]', text: 'text-[hsl(var(--r-hi-tx))]', border: 'border-[hsl(var(--r-hi-br))]' },
  limited: { label: 'Limited', bg: 'bg-[hsl(var(--brand-subtle))]', text: 'text-[hsl(var(--brand))]', border: 'border-[hsl(var(--brand))/30]' },
  minimal: { label: 'Minimal', bg: 'bg-[hsl(var(--s-ok-bg))]', text: 'text-[hsl(var(--s-ok-tx))]', border: 'border-[hsl(var(--s-ok-br))]' },
};

type StatusKey = 'draft' | 'in_review' | 'approved';

const STATUS_META: Record<StatusKey, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-sunken', text: 'text-[hsl(var(--text-3))]' },
  in_review: { label: 'In Review', bg: 'bg-[hsl(var(--s-wn-bg))]', text: 'text-[hsl(var(--s-wn-tx))]' },
  approved: { label: 'Approved', bg: 'bg-[hsl(var(--s-ok-bg))]', text: 'text-[hsl(var(--s-ok-tx))]' },
};

function statusMeta(status: string) {
  return STATUS_META[(status as StatusKey)] ?? STATUS_META.draft;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toISOString().split('T')[0];
}

const EMPTY_INPUT: TieringInput = {
  prohibitedPractices: [], annexIII: [], affectsFundamentalRights: false,
  interactsWithHumans: false, generatesSyntheticContent: false, isGPAI: false, discloses: false,
};

// ── Yes/No toggle ────────────────────────────────────────────────────────────────

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {[true, false].map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className={`flex-1 py-2 text-sm border font-medium transition-colors rounded-none ${value === v ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] hover:bg-raised'}`}>
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

// Pill-style interlink to a related entity — clearly clickable, with a hover state.
function PillLink({ label, onClick, size = 'sm' }: { label: string; onClick: (e?: React.MouseEvent) => void; size?: 'sm' | 'xs' }) {
  const sizing = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-sm';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))] ${sizing}`}
    >
      {label} <ArrowSquareOut size={size === 'xs' ? 11 : 13} />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AIRiskTiering() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const openParam = searchParams.get('open');
  const { data: items, isLoading, error, save, remove } = useRiskClassifications();
  const { models } = useModelOptions();
  const { data: useCases } = useUseCases();

  const modelById = useMemo(() => {
    const m: Record<string, typeof models[number]> = {};
    for (const model of models) m[model.id] = model;
    return m;
  }, [models]);

  // Resolve a use case id to its title; "Unavailable" when it can't be resolved.
  const useCaseTitle = (id: string | null) => (id ? (useCases.find(u => u.id === id)?.title ?? 'Unavailable') : null);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RiskClassification | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Wizard — system selection
  const [sysMode, setSysMode] = useState<'registry' | 'freetext'>('registry');
  const [wModelId, setWModelId] = useState('');
  const [wSystemName, setWSystemName] = useState('');
  const [wUseCase, setWUseCase] = useState('');
  const [wAffectedUsers, setWAffectedUsers] = useState('');
  const [wFundRights, setWFundRights] = useState('');
  const [wClassifier, setWClassifier] = useState('');
  const [wReviewDue, setWReviewDue] = useState('');
  const [wUseCaseId, setWUseCaseId] = useState('');

  // Wizard — questionnaire (TieringInput)
  const [input, setInput] = useState<TieringInput>(EMPTY_INPUT);
  const setField = <K extends keyof TieringInput>(k: K, v: TieringInput[K]) =>
    setInput(prev => ({ ...prev, [k]: v }));
  const toggleList = (k: 'prohibitedPractices' | 'annexIII', item: string) =>
    setInput(prev => ({
      ...prev,
      [k]: prev[k].includes(item) ? prev[k].filter(x => x !== item) : [...prev[k], item],
    }));

  const result = useMemo(() => deriveEuTier(input), [input]);
  const tierMeta = TIER_META[result.tier];

  // Resolved system identity from the wizard
  const chosenModel = sysMode === 'registry' ? modelById[wModelId] : undefined;
  const resolvedName = sysMode === 'registry' ? (chosenModel?.name ?? '') : wSystemName.trim();
  const systemValid = resolvedName.length > 0;
  const classifierValid = wClassifier.trim().length > 0;
  const canConfirm = systemValid && classifierValid && !save.isPending;

  const filtered = useMemo(() => items.filter(i => {
    const matchesSearch = !search ||
      i.systemName.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.classifier.toLowerCase().includes(search.toLowerCase());
    const matchesModel = !modelParam || i.modelId === modelParam;
    return matchesSearch && matchesModel;
  }), [items, search, modelParam]);

  // Deep-link: ?open=<id> opens that classification's detail sheet once loaded.
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openParam || items.length === 0) return;
    if (openedRef.current === openParam) return;
    const it = items.find(i => i.id === openParam);
    if (it) { setSelected(it); setSheetOpen(true); openedRef.current = openParam; }
  }, [openParam, items]);

  const count = (t: RiskTier) => items.filter(i => i.riskTier === t).length;
  const unacceptable = count('unacceptable');
  const highRisk = count('high');
  const limited = count('limited');
  const minimal = count('minimal');

  function resetWizard() {
    setStep(1);
    setSysMode('registry'); setWModelId(''); setWSystemName('');
    setWUseCase(''); setWAffectedUsers(''); setWFundRights('');
    setWClassifier(''); setWReviewDue(''); setWUseCaseId('');
    setInput(EMPTY_INPUT);
  }

  function submitWizard() {
    if (!canConfirm) return;
    const modelId = sysMode === 'registry' ? (wModelId || null) : null;
    const payload: Partial<RiskClassification> = {
      systemId: sysMode === 'registry' ? wModelId : '',
      systemName: resolvedName,
      riskTier: result.tier,
      riskScore: result.score,
      classificationBasis: result.basis,
      obligations: result.obligations,
      annexIII: input.annexIII,
      gpai: input.isGPAI,
      useCase: wUseCase.trim(),
      affectedUsers: wAffectedUsers.trim(),
      fundamentalRightsImpact: wFundRights.trim(),
      classifier: wClassifier.trim(),
      classifiedAt: new Date().toISOString(),
      reviewDueAt: wReviewDue ? new Date(wReviewDue).toISOString() : null,
      status: 'draft',
      modelId,
      useCaseId: wUseCaseId || null,
    };
    save.mutate(payload, {
      onSuccess: () => {
        toast.success(`"${resolvedName}" classified as ${tierMeta.label}`);
        setWizardOpen(false);
        resetWizard();
      },
      onError: (err: Error) => toast.error(err.message),
    });
  }

  function deleteItem(item: RiskClassification) {
    remove.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Classification "${item.systemName}" removed`);
        if (selected?.id === item.id) { setSheetOpen(false); setSelected(null); }
      },
      onError: (err: Error) => toast.error(err.message),
    });
  }

  function setStatus(item: RiskClassification, status: StatusKey) {
    save.mutate({ id: item.id, status }, {
      onSuccess: () => {
        toast.success(`"${item.systemName}" moved to ${STATUS_META[status].label}`);
        setSelected(prev => (prev && prev.id === item.id ? { ...prev, status } : prev));
      },
      onError: (err: Error) => toast.error(err.message),
    });
  }

  const tierKpiCards: StatCardRowItem[] = [
    { label: 'Unacceptable Risk', value: String(unacceptable), icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-er-tx))' }} />, delta: 'Prohibited — cannot deploy', deltaDir: 'up' as const, isPositiveUp: false },
    { label: 'High Risk', value: String(highRisk), icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />, delta: 'Annex III — full compliance', deltaDir: 'up' as const, isPositiveUp: false },
    { label: 'Limited Risk', value: String(limited), icon: <Info size={18} style={{ color: 'hsl(var(--brand))' }} />, delta: 'Transparency obligations', deltaDir: 'up' as const, isPositiveUp: true },
    { label: 'Minimal Risk', value: String(minimal), icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />, delta: 'No specific obligations', deltaDir: 'up' as const, isPositiveUp: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Risk Tiering"
        subtitle="EU AI Act risk classification for AI systems"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'AI Risk Tiering' }]}
        actions={
          <Button onClick={() => { resetWizard(); setWizardOpen(true); }} style={{ borderRadius: 0 }}>
            <Plus size={15} /> Classify System
          </Button>
        }
      />

      <StatCardRow cards={tierKpiCards} />

      {/* Tier overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { tier: 'unacceptable' as RiskTier, subtitle: 'Prohibited — cannot deploy', examples: ['Social scoring', 'Real-time biometric mass surveillance', 'Subliminal manipulation'] },
          { tier: 'high' as RiskTier, subtitle: 'EU AI Act Annex III — full compliance required', examples: ['Credit scoring', 'Employment screening', 'Biometric ID', 'Critical infrastructure'] },
          { tier: 'limited' as RiskTier, subtitle: 'Transparency obligations apply', examples: ['Chatbots', 'Deepfakes', 'Emotion recognition'] },
          { tier: 'minimal' as RiskTier, subtitle: 'No specific obligations', examples: ['Spam filters', 'AI in games', 'Basic recommendations'] },
        ]).map(({ tier, subtitle, examples }) => {
          const c = TIER_META[tier];
          return (
            <Card key={tier} className={`rounded-none border ${c.border} ${c.bg}`}>
              <CardContent className="px-4 py-4 space-y-2">
                <p className={`text-xs font-bold tracking-wider uppercase ${c.text}`}>{c.label}</p>
                <p className="text-xs text-[hsl(var(--text-2))]">{subtitle}</p>
                <ul className="space-y-0.5">
                  {examples.map(e => (
                    <li key={e} className="text-[11px] flex items-center gap-1.5 text-[hsl(var(--text-2))]">
                      <span className={c.text}>•</span> {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk Distribution Chart */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-4 text-[hsl(var(--text-1))]">Risk Distribution across Systems</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Unacceptable', count: unacceptable },
                { name: 'High Risk', count: highRisk },
                { name: 'Limited', count: limited },
                { name: 'Minimal', count: minimal },
              ]} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--text-3))' }} width={100} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', borderRadius: 0, fontSize: 12, color: 'hsl(var(--text-1))' }}
                  itemStyle={{ color: 'hsl(var(--text-1))' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {[
                    { color: 'hsl(var(--s-er-bg))', border: 'hsl(var(--s-er-br))' },
                    { color: 'hsl(var(--s-wn-bg))', border: 'hsl(var(--s-wn-br))' },
                    { color: 'hsl(var(--brand-subtle))', border: 'hsl(var(--brand)/30%)' },
                    { color: 'hsl(var(--s-ok-bg))', border: 'hsl(var(--s-ok-br))' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.border} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by system, ID or classifier..."
        onClearAll={() => setSearch('')}
      />

      {/* Model-scoped filter chip (deep-link from a model's Governance card) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelById[modelParam]?.name ?? 'Unavailable'}</strong></span>
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

      {/* Table */}
      <Card className="border-[hsl(var(--border))] bg-surface rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
              <tr>
                {['System', 'EU AI Act Tier', 'Basis', 'GPAI', 'Obligations', 'Status', 'Classifier', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-[hsl(var(--text-3))]">
                  <Spinner size={22} className="animate-spin inline mr-2" /> Loading classifications…
                </td></tr>
              )}
              {!isLoading && error && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-[hsl(var(--s-er-tx))]">
                  Failed to load classifications: {error.message}
                </td></tr>
              )}
              {!isLoading && !error && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-[hsl(var(--text-3))]">
                  {items.length === 0 ? 'No classifications yet — classify your first AI system.' : 'No classifications match your search.'}
                </td></tr>
              )}
              {!isLoading && !error && filtered.map(item => {
                const tm = TIER_META[item.riskTier];
                const sm = statusMeta(item.status);
                const linkedModel = item.modelId ? modelById[item.modelId] : undefined;
                return (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised transition-colors cursor-pointer"
                    onClick={() => { setSelected(item); setSheetOpen(true); }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[hsl(var(--text-1))]">{item.systemName}</div>
                      {item.modelId && (
                        <div className="mt-1">
                          <PillLink
                            label={linkedModel?.name ?? 'Unavailable'}
                            size="xs"
                            onClick={e => { e?.stopPropagation(); navigate(`/models/${item.modelId}`); }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${tm.bg} ${tm.text} border-0 rounded-none uppercase text-[10px]`}>{tm.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs max-w-[240px] truncate" title={item.classificationBasis}>{item.classificationBasis || '—'}</td>
                    <td className="px-4 py-3">
                      {item.gpai ? <Badge className="bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-0 rounded-none uppercase text-[10px]">Yes</Badge> : <span className="text-xs text-[hsl(var(--text-3))]">No</span>}
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.obligations.length}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${sm.bg} ${sm.text} border-0 rounded-none`}>{sm.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.classifier || '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(item); setSheetOpen(true); }} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><Eye size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--s-er-tx))] rounded-none"><Trash size={16} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-none bg-surface border-[hsl(var(--border))]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[hsl(var(--text-1))]">Delete Classification</AlertDialogTitle>
                              <AlertDialogDescription className="text-[hsl(var(--text-2))]">Delete the classification for {item.systemName}? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="rounded-none bg-[hsl(var(--s-er-tx))] hover:bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]" onClick={() => deleteItem(item)}>Delete</AlertDialogAction>
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
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto bg-surface border-l border-[hsl(var(--border))]" style={{ width: 600, borderRadius: 0 }}>
          {selected && (() => {
            const tm = TIER_META[selected.riskTier];
            const sm = statusMeta(selected.status);
            const linkedModel = selected.modelId ? modelById[selected.modelId] : undefined;
            const total = selected.obligations.length;
            const met = selected.status === 'approved' ? total : 0;
            const gaps = total - met;
            return (
              <div className="flex flex-col h-full">
                <SheetHeader className="pb-5 border-b border-[hsl(var(--border))]">
                  <SheetTitle className="flex flex-col gap-1 items-start text-left">
                    <span className="font-mono text-xs text-[hsl(var(--brand))] block">{fmtDate(selected.classifiedAt)}</span>
                    <span className="text-xl text-[hsl(var(--text-1))]">{selected.systemName}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge className={`${tm.bg} ${tm.text} border-0 rounded-none uppercase text-[10px]`}>{tm.label}</Badge>
                      <Badge className={`${sm.bg} ${sm.text} border-0 rounded-none`}>{sm.label}</Badge>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* Status workflow */}
                <div className="flex items-center gap-2 py-3 border-b border-[hsl(var(--border))]">
                  <span className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mr-1">Workflow</span>
                  <Button size="sm" disabled={save.isPending || selected.status === 'in_review'} onClick={() => setStatus(selected, 'in_review')}
                    className="rounded-none h-8 bg-raised text-[hsl(var(--text-1))] border border-[hsl(var(--border))] hover:bg-sunken">
                    Move to Review
                  </Button>
                  <Button size="sm" disabled={save.isPending || selected.status === 'approved'} onClick={() => setStatus(selected, 'approved')}
                    className="rounded-none h-8 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">
                    <Check size={14} /> Approve
                  </Button>
                </div>

                <Tabs defaultValue="classification" className="flex-1 flex flex-col mt-2">
                  <TabsList className="bg-transparent space-x-4 border-b border-[hsl(var(--border))] w-full justify-start rounded-none h-12 p-0">
                    <TabsTrigger value="classification" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Classification</TabsTrigger>
                    <TabsTrigger value="obligations" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Obligations</TabsTrigger>
                    <TabsTrigger value="linked" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Linked Model</TabsTrigger>
                    <TabsTrigger value="activity" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Activity</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto py-6">
                    <TabsContent value="classification" className="m-0 space-y-4">
                      <div className="p-4 bg-raised border border-[hsl(var(--border))] rounded-none">
                        <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Classification Basis</p>
                        <p className="text-sm text-[hsl(var(--text-1))]">{selected.classificationBasis || '—'}</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'EU AI Act Tier', value: tm.label },
                          { label: 'Risk Score', value: selected.riskScore != null ? selected.riskScore.toFixed(2) : '—' },
                          { label: 'Annex III Categories', value: selected.annexIII.length ? selected.annexIII.join(', ') : 'None' },
                          { label: 'GPAI Model', value: selected.gpai ? 'Yes' : 'No' },
                          { label: 'Use Case', value: selected.useCase || '—' },
                          { label: 'Affected Users', value: selected.affectedUsers || '—' },
                          { label: 'Fundamental Rights Impact', value: selected.fundamentalRightsImpact || '—' },
                          { label: 'Status', value: sm.label },
                          { label: 'Classifier', value: selected.classifier || '—' },
                          { label: 'Classified', value: fmtDate(selected.classifiedAt) },
                          { label: 'Review Due', value: fmtDate(selected.reviewDueAt) },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-[hsl(var(--border))]">
                            <span className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">{label}</span>
                            <span className="text-sm font-medium text-[hsl(var(--text-1))] text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="obligations" className="m-0 space-y-4">
                      <p className="text-sm text-[hsl(var(--text-2))]">EU AI Act requirements for <strong>{tm.label}</strong> tier:</p>
                      {selected.obligations.length > 0 ? selected.obligations.map(ob => (
                        <div key={ob} className="flex items-center gap-3 p-3 bg-raised border border-[hsl(var(--border))] rounded-none">
                          {selected.riskTier === 'unacceptable'
                            ? <Prohibit size={18} className="text-[hsl(var(--s-er-tx))] flex-shrink-0" />
                            : <CheckCircle size={18} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0" />}
                          <span className="text-sm text-[hsl(var(--text-1))]">{ob}</span>
                        </div>
                      )) : (
                        <div className="text-sm p-4 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-2))] rounded-none">
                          No specific EU AI Act obligations for this tier.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="linked" className="m-0 space-y-6">
                      <div className="p-4 bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] rounded-none">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-base font-bold text-[hsl(var(--text-1))]">{linkedModel?.name ?? selected.systemName}</p>
                            <p className="text-sm text-[hsl(var(--text-2))]">{linkedModel ? `Registry model · ${linkedModel.lifecycle ?? 'n/a'}` : 'Free-text system (not linked to registry)'}</p>
                          </div>
                          <Badge className={`${tm.bg} ${tm.text} border-0 rounded-none uppercase text-[10px]`}>{tm.label}</Badge>
                        </div>
                        <div className="flex gap-4 flex-wrap text-xs text-[hsl(var(--text-3))]">
                          <span>Classifier: <strong className="text-[hsl(var(--text-1))]">{selected.classifier || '—'}</strong></span>
                          <span>Classified: <strong className="text-[hsl(var(--text-1))]">{fmtDate(selected.classifiedAt)}</strong></span>
                        </div>
                      </div>

                      {selected.useCaseId && (
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Linked Use Case</p>
                          <PillLink
                            label={useCaseTitle(selected.useCaseId)!}
                            onClick={() => navigate(`/use-cases/${selected.useCaseId}`)}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Total Obligations', value: total },
                          { label: 'Met', value: met },
                          { label: 'Gaps', value: gaps },
                        ].map(s => (
                          <div key={s.label} className="p-3 bg-raised border border-[hsl(var(--border))] text-center rounded-none">
                            <p className="text-xl font-bold text-[hsl(var(--text-1))]">{s.value}</p>
                            <p className="text-[10px] text-[hsl(var(--text-3))] uppercase tracking-wide mt-1">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          disabled={!selected.modelId}
                          onClick={() => selected.modelId && navigate(`/models/${selected.modelId}`)}
                          className="flex-1 rounded-none bg-raised text-[hsl(var(--text-1))] border border-[hsl(var(--border))] hover:bg-sunken disabled:opacity-50">
                          <ShieldCheck size={16} className="text-[hsl(var(--brand))]" /> View Full Model Record
                        </Button>
                      </div>
                      {!selected.modelId && (
                        <p className="text-xs text-[hsl(var(--text-3))]">This classification is not linked to a registry model.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="activity" className="m-0 space-y-3">
                      {[
                        { date: fmtDate(selected.createdAt), action: 'Classification created', user: selected.classifier || 'System' },
                        { date: fmtDate(selected.classifiedAt), action: `Tier assigned: ${tm.label}`, user: 'System' },
                        { date: fmtDate(selected.classifiedAt), action: `Status: ${sm.label}`, user: selected.classifier || 'System' },
                      ].map((ev, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-raised border border-[hsl(var(--border))] rounded-none">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[hsl(var(--brand))]" />
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--text-1))]">{ev.action}</p>
                            <p className="text-xs text-[hsl(var(--text-3))] mt-1">{ev.date} · {ev.user}</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={open => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent className="rounded-none max-w-[600px] bg-surface border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--text-1))]">Classify AI System — Step {step} of 3</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-none ${s <= step ? 'bg-[hsl(var(--brand))]' : 'bg-sunken'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 1 — System Selection</p>

              <div className="flex gap-3">
                {(['registry', 'freetext'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setSysMode(m)}
                    className={`flex-1 py-2 text-sm border font-medium transition-colors rounded-none ${sysMode === m ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] hover:bg-raised'}`}>
                    {m === 'registry' ? 'Pick registry model' : 'Free-text system'}
                  </button>
                ))}
              </div>

              {sysMode === 'registry' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Registry Model *</label>
                  <Select value={wModelId} onValueChange={setWModelId}>
                    <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder={models.length ? 'Select a model…' : 'No registry models available'} /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">System Name *</label>
                  <Input className="rounded-none bg-raised" value={wSystemName} onChange={e => setWSystemName(e.target.value)} placeholder="e.g. Credit Risk Scorer" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Intended Use Case</label>
                <textarea className="w-full text-sm border p-3 min-h-[80px] rounded-none border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none resize-none"
                  value={wUseCase} onChange={e => setWUseCase(e.target.value)} placeholder="Describe the intended purpose of this AI system..." />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Linked Use Case</label>
                <Select value={wUseCaseId || '__none'} onValueChange={v => setWUseCaseId(v === '__none' ? '' : v)}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="__none">— None —</SelectItem>
                    {useCases.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Affected Users</label>
                  <Input className="rounded-none bg-raised" value={wAffectedUsers} onChange={e => setWAffectedUsers(e.target.value)} placeholder="e.g. Loan applicants" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Review Due</label>
                  <Input type="date" className="rounded-none bg-raised" value={wReviewDue} onChange={e => setWReviewDue(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Classifier / Owner *</label>
                <Input className="rounded-none bg-raised" value={wClassifier} onChange={e => setWClassifier(e.target.value)} placeholder="e.g. Sarah Chen" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Fundamental Rights Impact (notes)</label>
                <textarea className="w-full text-sm border p-3 min-h-[60px] rounded-none border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none resize-none"
                  value={wFundRights} onChange={e => setWFundRights(e.target.value)} placeholder="Notes on fundamental-rights impact..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 2 — Classification Questionnaire</p>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Prohibited practices (Art. 5) — any checked ⇒ Unacceptable:</p>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {PROHIBITED_PRACTICES.map(p => (
                    <label key={p} className={`flex items-start gap-3 p-2.5 border cursor-pointer text-sm transition-colors rounded-none ${input.prohibitedPractices.includes(p) ? 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))]' : 'border-[hsl(var(--border))] bg-transparent hover:bg-raised'}`}>
                      <input type="checkbox" checked={input.prohibitedPractices.includes(p)} onChange={() => toggleList('prohibitedPractices', p)} className="mt-0.5 accent-[hsl(var(--s-er-tx))]" />
                      <span className="text-[hsl(var(--text-2))]">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Annex III high-risk categories — any checked ⇒ High:</p>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-2 custom-scrollbar">
                  {ANNEX_III_CATEGORIES.map(cat => (
                    <label key={cat} className={`flex items-start gap-3 p-2.5 border cursor-pointer text-sm transition-colors rounded-none ${input.annexIII.includes(cat) ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]' : 'border-[hsl(var(--border))] bg-transparent hover:bg-raised'}`}>
                      <input type="checkbox" checked={input.annexIII.includes(cat)} onChange={() => toggleList('annexIII', cat)} className="mt-0.5 accent-[hsl(var(--brand))]" />
                      <span className="text-[hsl(var(--text-2))]">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Automated decision materially affecting fundamental rights?</p>
                <YesNo value={input.affectsFundamentalRights} onChange={v => setField('affectsFundamentalRights', v)} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Interacts directly with people?</p>
                <YesNo value={input.interactsWithHumans} onChange={v => setField('interactsWithHumans', v)} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Generates synthetic content?</p>
                <YesNo value={input.generatesSyntheticContent} onChange={v => setField('generatesSyntheticContent', v)} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">General-purpose AI model?</p>
                <YesNo value={input.isGPAI} onChange={v => setField('isGPAI', v)} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Is AI use disclosed to users?</p>
                <YesNo value={input.discloses} onChange={v => setField('discloses', v)} />
              </div>

              {/* Live computed result */}
              <div className={`p-4 border ${tierMeta.border} ${tierMeta.bg} rounded-none mt-6`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-[hsl(var(--text-3))]">Computed tier</p>
                  <Badge className={`${tierMeta.bg} ${tierMeta.text} border-0 rounded-none uppercase text-[10px]`}>{tierMeta.label}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--text-2))]">{result.basis}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 3 — Review & Confirm</p>
              <div className={`p-6 border text-center ${tierMeta.bg} ${tierMeta.border} rounded-none`}>
                <p className={`text-2xl font-bold ${tierMeta.text}`}>{tierMeta.label}</p>
                <p className="text-sm mt-2 text-[hsl(var(--text-2))]">{resolvedName || '(no system selected)'}</p>
                <p className="text-xs mt-2 text-[hsl(var(--text-3))]">{result.basis}</p>
              </div>

              {result.obligations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[hsl(var(--text-1))]">Applicable obligations:</p>
                  <div className="bg-raised border border-[hsl(var(--border))] p-4 space-y-2">
                    {result.obligations.map(ob => (
                      <div key={ob} className="flex items-center gap-2 text-sm text-[hsl(var(--text-2))]">
                        <CheckCircle size={16} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0" /> {ob}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!systemValid || !classifierValid) && (
                <div className="p-3 border border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] text-xs rounded-none flex items-center gap-2">
                  <Warning size={16} />
                  {!systemValid ? 'Select a registry model or enter a system name (Step 1).' : 'Enter a classifier / owner (Step 1).'}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => step > 1 ? setStep(s => s - 1) : setWizardOpen(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {step < 3 ? (
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={() => setStep(s => s + 1)}>Next <ArrowRight size={16} /></Button>
            ) : (
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] disabled:opacity-50" disabled={!canConfirm} onClick={submitWizard}>
                {save.isPending ? <><Spinner size={16} className="animate-spin" /> Saving…</> : 'Confirm Classification'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
