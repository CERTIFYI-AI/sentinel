// @ts-nocheck
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useMemo } from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, MagnifyingGlass, Check, ArrowRight, X,
  Scales, Warning, Info, CheckCircle, ShieldCheck,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type EUTier = 'Unacceptable' | 'High Risk' | 'Limited' | 'Minimal';
type ReviewStatus = 'Pending' | 'In Review' | 'Approved' | 'Rejected';

interface Classification {
  id: string;
  system: string;
  type: string;
  tier: EUTier;
  annexIIICategory: string;
  article: string;
  gpai: boolean;
  transparencyReq: boolean;
  reviewStatus: ReviewStatus;
  owner: string;
  created: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED: Classification[] = [
  { id: 'CLS-001', system: 'Credit Risk Scorer', type: 'ML Classification', tier: 'High Risk', annexIIICategory: 'Access to financial services', article: 'Annex III Art.6(1)', gpai: false, transparencyReq: true, reviewStatus: 'Approved', owner: 'Sarah Chen', created: '2026-01-10' },
  { id: 'CLS-002', system: 'Loan Approval Assistant', type: 'LLM — Decision Support', tier: 'High Risk', annexIIICategory: 'Access to essential services', article: 'Annex III', gpai: true, transparencyReq: true, reviewStatus: 'In Review', owner: 'Maria Santos', created: '2026-01-20' },
  { id: 'CLS-003', system: 'HR Screening System', type: 'ML Classification', tier: 'High Risk', annexIIICategory: 'Employment and workers management', article: 'Annex III', gpai: false, transparencyReq: true, reviewStatus: 'Approved', owner: 'James Patel', created: '2026-02-01' },
  { id: 'CLS-004', system: 'Fraud Detection Engine', type: 'ML Anomaly Detection', tier: 'Limited', annexIIICategory: 'N/A', article: 'Art.52', gpai: false, transparencyReq: true, reviewStatus: 'Approved', owner: 'David Kim', created: '2026-02-10' },
  { id: 'CLS-005', system: 'Customer Sentiment Analyzer', type: 'NLP Classification', tier: 'Minimal', annexIIICategory: 'N/A', article: 'N/A', gpai: false, transparencyReq: false, reviewStatus: 'Approved', owner: 'Sarah Chen', created: '2026-02-15' },
  { id: 'CLS-006', system: 'AML Transaction Monitor', type: 'ML Anomaly Detection', tier: 'High Risk', annexIIICategory: 'Law enforcement adjacent', article: 'Annex III', gpai: false, transparencyReq: true, reviewStatus: 'Pending', owner: 'David Kim', created: '2026-03-01' },
  { id: 'CLS-007', system: 'Customer Service Chatbot', type: 'LLM — Conversational', tier: 'Limited', annexIIICategory: 'N/A', article: 'Art.52', gpai: true, transparencyReq: true, reviewStatus: 'Approved', owner: 'Sarah Chen', created: '2026-03-10' },
  { id: 'CLS-008', system: 'Churn Predictor', type: 'ML Classification', tier: 'Minimal', annexIIICategory: 'N/A', article: 'N/A', gpai: false, transparencyReq: false, reviewStatus: 'Approved', owner: 'James Patel', created: '2026-03-15' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierColor(tier: EUTier) {
  switch (tier) {
    case 'Unacceptable': return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
    case 'High Risk': return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' };
    case 'Limited': return { bg: 'bg-[hsl(var(--brand-subtle))]', text: 'text-[hsl(var(--brand))]', border: 'border-[hsl(var(--brand))/30]' };
    case 'Minimal': return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' };
    default: return { bg: 'bg-sunken', text: 'text-[hsl(var(--text-3))]', border: 'border-[hsl(var(--border))]' };
  }
}

function reviewColor(status: ReviewStatus) {
  switch (status) {
    case 'Approved': return { bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    case 'In Review': return { bg: 'bg-yellow-500/10', text: 'text-yellow-500' };
    case 'Pending': return { bg: 'bg-orange-500/10', text: 'text-orange-500' };
    case 'Rejected': return { bg: 'bg-red-500/10', text: 'text-red-500' };
    default: return { bg: 'bg-sunken', text: 'text-[hsl(var(--text-3))]' };
  }
}

// ── MetricTile ────────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant }: { label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok' | 'info' }) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    info: { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))', border: 'hsl(var(--brand)/30%)' },
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

// ── Wizard state ──────────────────────────────────────────────────────────────

const ANNEX_III = [
  'Biometric identification', 'Critical infrastructure', 'Education/vocational',
  'Employment/workers management', 'Essential services (credit, insurance, housing)',
  'Law enforcement', 'Migration/asylum', 'Justice administration',
];

const HIGH_RISK_OBLIGATIONS = [
  'Risk Management System', 'Data Governance', 'Technical Documentation',
  'Transparency', 'Human Oversight', 'Accuracy & Robustness', 'Post-Market Monitoring',
];

function deriveTier(answers: { affectsRights: boolean; annexIII: string[]; gpai: boolean; noDisclosure: boolean }): EUTier {
  if (answers.annexIII.some(a => a === 'Biometric identification') && answers.annexIII.length > 2) return 'Unacceptable';
  if (answers.annexIII.length > 0) return 'High Risk';
  if (answers.gpai || answers.noDisclosure) return 'Limited';
  if (answers.affectsRights) return 'Limited';
  return 'Minimal';
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AIRiskTiering() {
  const { data: items, setData: setItems } = useSupabaseTable('airisktiering_table', SEED);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Classification | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Wizard form state
  const [wSystem, setWSystem] = useState('');
  const [wPurpose, setWPurpose] = useState('');
  const [wAffectsRights, setWAffectsRights] = useState<boolean | null>(null);
  const [wAnnexIII, setWAnnexIII] = useState<string[]>([]);
  const [wGpai, setWGpai] = useState<boolean | null>(null);
  const [wNoDisclosure, setWNoDisclosure] = useState<boolean | null>(null);
  const [wOwner, setWOwner] = useState('Sarah Chen');
  const [wObligations, setWObligations] = useState<string[]>([]);

  const derived = deriveTier({ affectsRights: !!wAffectsRights, annexIII: wAnnexIII, gpai: !!wGpai, noDisclosure: !!wNoDisclosure });

  const filtered = useMemo(() => items.filter(i =>
    !search || i.system.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const unacceptable = items.filter(i => i.tier === 'Unacceptable').length;
  const highRisk = items.filter(i => i.tier === 'High Risk').length;
  const limited = items.filter(i => i.tier === 'Limited').length;
  const minimal = items.filter(i => i.tier === 'Minimal').length;

  function resetWizard() {
    setStep(1); setWSystem(''); setWPurpose(''); setWAffectsRights(null); setWAnnexIII([]);
    setWGpai(null); setWNoDisclosure(null); setWOwner('Sarah Chen'); setWObligations([]);
  }

  function submitWizard() {
    const newItem: Classification = {
      id: `CLS-${String(items.length + 1).padStart(3, '0')}`,
      system: wSystem || 'Unnamed System',
      type: wGpai ? 'LLM — General Purpose' : 'ML System',
      tier: derived,
      annexIIICategory: wAnnexIII[0] || 'N/A',
      article: wAnnexIII.length > 0 ? 'Annex III' : (wGpai ? 'Art.53' : 'N/A'),
      gpai: !!wGpai,
      transparencyReq: derived === 'High Risk' || derived === 'Limited',
      reviewStatus: 'Pending',
      owner: wOwner,
      created: new Date().toISOString().split('T')[0],
    };
    setItems(prev => [newItem, ...prev]);
    toast.success(`"${newItem.system}" classified as ${derived}`);
    setWizardOpen(false);
    resetWizard();
  }

  function deleteItem(id: string) {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (item) toast.success(`Classification "${item.system}" removed`);
  }

  const tc = tierColor(derived);

  const tierKpiCards: StatCardRowItem[] = [
    {
      label: 'Unacceptable Risk',
      value: String(unacceptable),
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-er-tx))' }} />,
      delta: 'Prohibited — cannot deploy',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'High Risk',
      value: String(highRisk),
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: 'Annex III — full compliance',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Limited Risk',
      value: String(limited),
      icon: <Info size={18} style={{ color: 'hsl(var(--brand))' }} />,
      delta: 'Transparency obligations',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Minimal Risk',
      value: String(minimal),
      icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: 'No specific obligations',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* Tier Distribution KPI Row */}
      <StatCardRow cards={tierKpiCards} />

      {/* Tier overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { tier: 'Unacceptable' as EUTier, label: 'UNACCEPTABLE', subtitle: 'Prohibited — cannot deploy', examples: ['Social scoring', 'Real-time biometric mass surveillance', 'Subliminal manipulation'] },
          { tier: 'High Risk' as EUTier, label: 'HIGH RISK', subtitle: 'EU AI Act Annex III — full compliance required', examples: ['Credit scoring', 'Employment screening', 'Biometric ID', 'Critical infrastructure'] },
          { tier: 'Limited' as EUTier, label: 'LIMITED', subtitle: 'Transparency obligations apply', examples: ['Chatbots', 'Deepfakes', 'Emotion recognition'] },
          { tier: 'Minimal' as EUTier, label: 'MINIMAL', subtitle: 'No specific obligations', examples: ['Spam filters', 'AI in games', 'Basic recommendations'] },
        ] as const).map(({ tier, label, subtitle, examples }) => {
          const c = tierColor(tier);
          return (
            <Card key={tier} className={`rounded-none border ${c.border} ${c.bg}`}>
              <CardContent className="px-4 py-4 space-y-2">
                <p className={`text-xs font-bold tracking-wider uppercase ${c.text}`}>{label}</p>
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
                { name: 'Unacceptable', count: unacceptable, color: 'hsl(var(--s-er-tx))' },
                { name: 'High Risk', count: highRisk, color: 'hsl(var(--s-wn-tx))' },
                { name: 'Limited', count: limited, color: 'hsl(var(--brand))' },
                { name: 'Minimal', count: minimal, color: 'hsl(var(--s-ok-tx))' },
              ]} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--text-3))' }} width={100} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', borderRadius: 0, fontSize: 12, color: 'hsl(var(--text-1))' }}
                  itemStyle={{ color: 'hsl(var(--text-1))' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {
                    [
                      { name: 'Unacceptable', count: unacceptable, color: 'hsl(var(--s-er-bg))', border: 'hsl(var(--s-er-br))' },
                      { name: 'High Risk', count: highRisk, color: 'hsl(var(--s-wn-bg))', border: 'hsl(var(--s-wn-br))' },
                      { name: 'Limited', count: limited, color: 'hsl(var(--brand-subtle))', border: 'hsl(var(--brand)/30%)' },
                      { name: 'Minimal', count: minimal, color: 'hsl(var(--s-ok-bg))', border: 'hsl(var(--s-ok-br))' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.border} strokeWidth={1} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* FilterBar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by system name or ID..."
        onClearAll={() => setSearch('')}
      />

      {/* Table */}
      <Card className="border-[hsl(var(--border))] bg-surface rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
              <tr>
                {['ID', 'System', 'Type', 'EU AI Act Tier', 'Annex III Category', 'GPAI', 'Transparency Req', 'Review Status', 'Owner', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const tc2 = tierColor(item.tier);
                const rc = reviewColor(item.reviewStatus);
                return (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised transition-colors cursor-pointer"
                    onClick={() => { setSelected(item); setSheetOpen(true); }}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{item.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{item.system}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.type}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${tc2.bg} ${tc2.text} border-0 rounded-none uppercase text-[10px]`}>{item.tier}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.annexIIICategory}</td>
                    <td className="px-4 py-3">
                      {item.gpai ? <Badge className="bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-0 rounded-none uppercase text-[10px]">Yes</Badge> : <span className="text-xs text-[hsl(var(--text-3))]">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.transparencyReq ? <CheckCircle size={16} className="text-emerald-500" /> : <span className="text-xs text-[hsl(var(--text-3))]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${rc.bg} ${rc.text} border-0 rounded-none`}>{item.reviewStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.owner}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(item); setSheetOpen(true); }} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><Eye size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-red-500 rounded-none"><Trash size={16} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-none bg-surface border-[hsl(var(--border))]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[hsl(var(--text-1))]">Delete Classification</AlertDialogTitle>
                              <AlertDialogDescription className="text-[hsl(var(--text-2))]">Delete {item.id} — {item.system}? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="rounded-none bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteItem(item.id)}>Delete</AlertDialogAction>
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
          {selected && (
            <div className="flex flex-col h-full">
              <SheetHeader className="pb-5 border-b border-[hsl(var(--border))]">
                <SheetTitle className="flex flex-col gap-1 items-start text-left">
                  <span className="font-mono text-xs text-[hsl(var(--brand))] block">{selected.id}</span>
                  <span className="text-xl text-[hsl(var(--text-1))]">{selected.system}</span>
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="classification" className="flex-1 flex flex-col mt-2">
                <TabsList className="bg-transparent space-x-4 border-b border-[hsl(var(--border))] w-full justify-start rounded-none h-12 p-0">
                  <TabsTrigger value="classification" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Classification</TabsTrigger>
                  <TabsTrigger value="obligations" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Obligations</TabsTrigger>
                  <TabsTrigger value="linked" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Linked Model</TabsTrigger>
                  <TabsTrigger value="activity" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Activity</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto py-6">
                  <TabsContent value="classification" className="m-0 space-y-4">
                    <div className="space-y-3">
                      {[
                        { label: 'EU AI Act Tier', value: selected.tier },
                        { label: 'Annex III Category', value: selected.annexIIICategory },
                        { label: 'Article', value: selected.article },
                        { label: 'GPAI Model', value: selected.gpai ? 'Yes' : 'No' },
                        { label: 'Transparency Required', value: selected.transparencyReq ? 'Yes' : 'No' },
                        { label: 'Review Status', value: selected.reviewStatus },
                        { label: 'Owner', value: selected.owner },
                        { label: 'Classified', value: selected.created },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))]">
                          <span className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">{label}</span>
                          <span className="text-sm font-medium text-[hsl(var(--text-1))]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="obligations" className="m-0 space-y-4">
                    <p className="text-sm text-[hsl(var(--text-2))]">EU AI Act requirements for <strong>{selected.tier}</strong> tier:</p>
                    {selected.tier === 'High Risk' ? HIGH_RISK_OBLIGATIONS.map(ob => (
                      <div key={ob} className="flex items-center gap-3 p-3 bg-raised border border-[hsl(var(--border))] rounded-none">
                        <CheckCircle size={18} className="text-emerald-500" />
                        <span className="text-sm text-[hsl(var(--text-1))]">{ob}</span>
                      </div>
                    )) : (
                      <div className="text-sm p-4 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-2))] rounded-none">
                        {selected.tier === 'Unacceptable' ? 'Deployment is prohibited under EU AI Act Art.5.' :
                         selected.tier === 'Limited' ? 'Must disclose AI system nature to users (Art.52).' :
                         'No specific EU AI Act obligations.'}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="linked" className="m-0 space-y-6">
                    {/* Model card */}
                    <div className="p-4 bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] rounded-none">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-base font-bold text-[hsl(var(--text-1))]">{selected.system}</p>
                          <p className="text-sm text-[hsl(var(--text-2))]">{selected.type}</p>
                        </div>
                        <Badge className={`${tierColor(selected.tier).bg} ${tierColor(selected.tier).text} border-0 rounded-none uppercase text-[10px]`}>{selected.tier}</Badge>
                      </div>
                      <div className="flex gap-4 flex-wrap text-xs text-[hsl(var(--text-3))]">
                        <span>Owner: <strong className="text-[hsl(var(--text-1))]">{selected.owner}</strong></span>
                        <span>Added: <strong className="text-[hsl(var(--text-1))]">{selected.created}</strong></span>
                      </div>
                    </div>

                    {/* Compliance status */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wider mb-2">Compliance Status</p>
                      {[
                        { label: 'EU AI Act Article', value: selected.article, highlight: true },
                        { label: 'Annex III Category', value: selected.annexIIICategory },
                        { label: 'GPAI Model', value: selected.gpai ? 'Yes — Art.53 obligations apply' : 'No' },
                        { label: 'Transparency Req.', value: selected.transparencyReq ? 'Required (Art.13 / Art.52)' : 'Not required' },
                        { label: 'Review Status', value: selected.reviewStatus },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-[hsl(var(--border))]">
                          <span className="text-xs font-medium text-[hsl(var(--text-2))]">{r.label}</span>
                          <span className={`text-xs font-bold ${r.highlight ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-1))]'}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Obligation count */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total Obligations', value: selected.tier === 'High Risk' ? 12 : selected.tier === 'Limited' ? 3 : selected.tier === 'Unacceptable' ? 0 : 0 },
                        { label: 'Met', value: selected.reviewStatus === 'Approved' ? (selected.tier === 'High Risk' ? 10 : selected.tier === 'Limited' ? 3 : 0) : 0 },
                        { label: 'Gaps', value: selected.reviewStatus === 'Approved' ? (selected.tier === 'High Risk' ? 2 : 0) : (selected.tier === 'High Risk' ? 12 : 3) },
                      ].map(s => (
                        <div key={s.label} className="p-3 bg-raised border border-[hsl(var(--border))] text-center rounded-none">
                          <p className="text-xl font-bold text-[hsl(var(--text-1))]">{s.value}</p>
                          <p className="text-[10px] text-[hsl(var(--text-3))] uppercase tracking-wide mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button className="flex-1 rounded-none bg-raised text-[hsl(var(--text-1))] border border-[hsl(var(--border))] hover:bg-sunken">
                        <ShieldCheck size={16} className="text-[hsl(var(--brand))]" /> View Full Model Record
                      </Button>
                      <Button className="flex-1 rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">
                        <ArrowRight size={16} /> Open Obligations
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="m-0 space-y-3">
                    {[
                      { date: selected.created, action: 'Classification created', user: selected.owner },
                      { date: selected.created, action: `Tier assigned: ${selected.tier}`, user: 'System' },
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
          )}
        </SheetContent>
      </Sheet>

      {/* Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={open => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent className="rounded-none max-w-[600px] bg-surface border-[hsl(var(--border))]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--text-1))]">Classify AI System — Step {step} of 3</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-none ${s <= step ? 'bg-[hsl(var(--brand))]' : 'bg-sunken'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 1 — System Selection</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">System Name *</label>
                <Input className="rounded-none bg-raised" value={wSystem} onChange={e => setWSystem(e.target.value)} placeholder="e.g. Credit Risk Scorer" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Intended Purpose *</label>
                <textarea className="w-full text-sm border p-3 min-h-[100px] rounded-none border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none resize-none"
                  value={wPurpose} onChange={e => setWPurpose(e.target.value)} placeholder="Describe the intended purpose of this AI system..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 2 — Classification Questionnaire</p>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Q1: Does it make decisions affecting people's rights?</p>
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWAffectsRights(v)}
                      className={`flex-1 py-2 text-sm border font-medium transition-colors rounded-none ${wAffectsRights === v ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] hover:bg-raised'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Q2: EU AI Act Annex III categories (select all that apply):</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {ANNEX_III.map(cat => (
                    <label key={cat} className={`flex items-start gap-3 p-3 border cursor-pointer text-sm transition-colors rounded-none ${wAnnexIII.includes(cat) ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]' : 'border-[hsl(var(--border))] bg-transparent hover:bg-raised'}`}>
                      <input type="checkbox" checked={wAnnexIII.includes(cat)} onChange={() => setWAnnexIII(prev => prev.includes(cat) ? prev.filter(a => a !== cat) : [...prev, cat])} className="mt-0.5 accent-[hsl(var(--brand))]" />
                      <span className="text-[hsl(var(--text-2))]">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Q3: Is it a General-Purpose AI (GPAI) model?</p>
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWGpai(v)}
                      className={`flex-1 py-2 text-sm border font-medium transition-colors rounded-none ${wGpai === v ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] hover:bg-raised'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(var(--text-1))]">Q4: Does it interact with humans without disclosure?</p>
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWNoDisclosure(v)}
                      className={`flex-1 py-2 text-sm border font-medium transition-colors rounded-none ${wNoDisclosure === v ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] hover:bg-raised'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Auto-classification */}
              <div className="p-4 border border-[hsl(var(--border))] bg-raised rounded-none flex items-center justify-between mt-6">
                <p className="text-xs text-[hsl(var(--text-3))] font-bold uppercase tracking-wide">Auto-classification result</p>
                <Badge className={`${tierColor(derived).bg} ${tierColor(derived).text} border-0 rounded-none uppercase text-[10px]`}>{derived} Risk</Badge>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-[hsl(var(--text-2))]">Step 3 — Review & Confirm</p>
              <div className={`p-6 border text-center ${tierColor(derived).bg} ${tierColor(derived).border} rounded-none`}>
                <p className={`text-2xl font-bold ${tierColor(derived).text}`}>{derived}</p>
                <p className="text-sm mt-2 text-[hsl(var(--text-2))]">{wSystem}</p>
              </div>
              {derived === 'High Risk' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[hsl(var(--text-1))]">Required compliance obligations:</p>
                  <div className="bg-raised border border-[hsl(var(--border))] p-4 grid grid-cols-2 gap-3">
                    {HIGH_RISK_OBLIGATIONS.map(ob => (
                      <label key={ob} className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--text-2))]">
                        <input type="checkbox" className="accent-[hsl(var(--brand))]" checked={wObligations.includes(ob)} onChange={() => setWObligations(prev => prev.includes(ob) ? prev.filter(o => o !== ob) : [...prev, ob])} />
                        {ob}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Assign Owner *</label>
                <select className="w-full text-sm border p-3 rounded-none border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none"
                  value={wOwner} onChange={e => setWOwner(e.target.value)}>
                  {['Sarah Chen', 'James Patel', 'Maria Santos', 'David Kim', 'Emma Wilson'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => step > 1 ? setStep(s => s - 1) : setWizardOpen(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {step < 3 ? (
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={() => setStep(s => s + 1)}>Next <ArrowRight size={16} /></Button>
            ) : (
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={submitWizard}>Confirm Classification</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
