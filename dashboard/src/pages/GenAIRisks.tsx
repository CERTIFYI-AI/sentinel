// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// GenAIRisks — Generative AI-specific risk catalogue (NIST AI 600-1).

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, Robot, ShieldWarning,
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
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type MitigationStatus = 'Implemented' | 'Partial' | 'Under Review' | 'Not Addressed';
type GuardrailCoverage = 'None' | 'Partial' | 'Implemented';

interface GenAIRiskProfile {
  id: string;
  model: string;
  riskCategory: string;
  riskNumber: number;
  severity: Severity;
  guardrails: string;
  guardrailCoverage: GuardrailCoverage;
  mitigationStatus: MitigationStatus;
  owner: string;
  created: string;
}

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

const SEED: GenAIRiskProfile[] = [
  { id: 'GRP-001', model: 'Loan Approval Assistant', riskCategory: 'Confabulation (Hallucination)', riskNumber: 1, severity: 'Critical', guardrails: 'Hallucination Guard (TP-003)', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'Maria Santos', created: '2026-01-15' },
  { id: 'GRP-002', model: 'Loan Approval Assistant', riskCategory: 'Harmful Content', riskNumber: 4, severity: 'High', guardrails: 'Toxicity Filter (TP-002)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'Maria Santos', created: '2026-01-15' },
  { id: 'GRP-003', model: 'Customer Service Chatbot', riskCategory: 'Human-AI Confusion', riskNumber: 9, severity: 'Medium', guardrails: 'None', guardrailCoverage: 'None', mitigationStatus: 'Not Addressed', owner: 'Sarah Chen', created: '2026-02-01' },
  { id: 'GRP-004', model: 'Loan Approval Assistant', riskCategory: 'Intellectual Property', riskNumber: 5, severity: 'Medium', guardrails: 'Data Boundary (TP-004)', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'James Patel', created: '2026-02-10' },
  { id: 'GRP-005', model: 'Credit Risk Scorer', riskCategory: 'Data Poisoning', riskNumber: 7, severity: 'High', guardrails: 'None', guardrailCoverage: 'None', mitigationStatus: 'Under Review', owner: 'David Kim', created: '2026-02-20' },
  { id: 'GRP-006', model: 'Loan Approval Assistant', riskCategory: 'Dual Use Risk', riskNumber: 10, severity: 'High', guardrails: 'Policy Firewall', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'Sarah Chen', created: '2026-03-01' },
  { id: 'GRP-007', model: 'Fraud Detection Engine', riskCategory: 'Bias/Discrimination', riskNumber: 3, severity: 'Critical', guardrails: 'Demographic Masking (GR-006)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'Maria Santos', created: '2026-03-10' },
  { id: 'GRP-008', model: 'Loan Approval Assistant', riskCategory: 'Cybersecurity', riskNumber: 6, severity: 'High', guardrails: 'Prompt Injection Firewall (GR-002)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'David Kim', created: '2026-03-15' },
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

export default function GenAIRisks() {
  const [profiles, setProfiles] = useState<GenAIRiskProfile[]>(SEED);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<GenAIRiskProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [wModel, setWModel] = useState('');
  const [wCategory, setWCategory] = useState(NIST_600_1_RISKS[0].name);
  const [wSeverity, setWSeverity] = useState<Severity>('High');
  const [wGuardrails, setWGuardrails] = useState('');
  const [wCoverage, setWCoverage] = useState<GuardrailCoverage>('None');
  const [wOwner, setWOwner] = useState('Sarah Chen');

  const filtered = useMemo(() => profiles.filter(p => {
    const matchSearch = !search || p.model.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.riskCategory.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.riskCategory === filterCategory;
    const matchSeverity = !filterSeverity || p.severity === filterSeverity;
    return matchSearch && matchCat && matchSeverity;
  }), [profiles, search, filterCategory, filterSeverity]);

  const critical = profiles.filter(p => p.severity === 'Critical').length;
  const notAddressed = profiles.filter(p => p.mitigationStatus === 'Not Addressed').length;
  const implemented = profiles.filter(p => p.mitigationStatus === 'Implemented').length;
  const highRisk = profiles.filter(p => p.severity === 'High').length;

  const activeFilterCount = (filterSeverity ? 1 : 0) + (filterCategory ? 1 : 0);

  function submitCreate() {
    const risk = NIST_600_1_RISKS.find(r => r.name === wCategory);
    const newProfile: GenAIRiskProfile = {
      id: `GRP-${String(profiles.length + 1).padStart(3, '0')}`,
      model: wModel || 'Unknown Model',
      riskCategory: wCategory,
      riskNumber: risk?.num || 1,
      severity: wSeverity,
      guardrails: wGuardrails || 'None',
      guardrailCoverage: wCoverage,
      mitigationStatus: wCoverage === 'Implemented' ? 'Implemented' : wCoverage === 'Partial' ? 'Partial' : 'Not Addressed',
      owner: wOwner,
      created: new Date().toISOString().split('T')[0],
    };
    setProfiles(prev => [newProfile, ...prev]);
    toast.success(`Risk profile "${newProfile.id}" created for ${newProfile.model}`);
    setCreateOpen(false);
    setWModel(''); setWGuardrails(''); setWCoverage('None');
  }

  function deleteProfile(id: string) {
    const profile = profiles.find(p => p.id === id);
    if (profile) toast.success(`Risk profile "${profile.id}" removed`);
    setProfiles(prev => prev.filter(p => p.id !== id));
  }

  const selectedRiskInfo = selected ? NIST_600_1_RISKS.find(r => r.num === selected.riskNumber) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GenAI Risks"
        subtitle="Generative AI-specific risk catalogue — NIST AI 600-1 risk management"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'GenAI Risks' }]}
        actions={
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
            <Plus size={15} className="mr-1.5" /> Create Risk Profile
          </Button>
        }
      />

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
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{p.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{p.model}</td>
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}>
                                <Trash size={13} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                <AlertDialogDescription>Delete {p.id}? This cannot be undone.</AlertDialogDescription>
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
              <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">
                No risk profiles match the current filters.
              </div>
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
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  {selected.model}
                </SheetTitle>
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
                          <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Risk Score</span>
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
                      { label: 'Model', value: selected.model },
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
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Recommended controls:</p>
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
                      <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Apply Recommended Guardrail</Button>
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
                      <Button size="sm" className="mt-3" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: '#fff' }}>Assign Guardrail</Button>
                    </div>
                  )}
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Coverage Dimensions</p>
                    {[
                      { dim: 'Input Validation', pct: selected.guardrailCoverage === 'Implemented' ? 95 : selected.guardrailCoverage === 'Partial' ? 60 : 0 },
                      { dim: 'Output Filtering', pct: selected.guardrailCoverage === 'Implemented' ? 88 : selected.guardrailCoverage === 'Partial' ? 45 : 0 },
                      { dim: 'Monitoring & Alerting', pct: selected.guardrailCoverage === 'Implemented' ? 100 : selected.guardrailCoverage === 'Partial' ? 70 : 0 },
                    ].map(({ dim, pct }) => (
                      <div key={dim} className="mb-2">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[11px]" style={{ color: 'hsl(var(--text-3))' }}>{dim}</span>
                          <span className="text-[11px] font-bold" style={{ color: pct === 0 ? 'hsl(var(--s-er-tx))' : pct >= 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5" style={{ background: 'hsl(var(--border))' }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: pct === 0 ? 'hsl(var(--s-er-tx))' : pct >= 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="log" className="mt-4 space-y-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Mitigation Timeline</p>
                  {[
                    { date: selected.created, action: 'Risk profile created and catalogued', user: selected.owner, type: 'info' },
                    { date: selected.created, action: `Initial severity assessed: ${selected.severity}`, user: 'Risk Engine', type: 'info' },
                    { date: selected.created, action: `NIST 600-1 mapping applied: Risk #${selected.riskNumber}`, user: 'System', type: 'info' },
                    ...(selected.guardrailCoverage !== 'None' ? [{ date: selected.created, action: `Guardrail assigned: ${selected.guardrails}`, user: selected.owner, type: 'ok' }] : []),
                    ...(selected.mitigationStatus === 'Implemented' ? [{ date: selected.created, action: 'All controls validated — risk mitigated', user: selected.owner, type: 'ok' }] : []),
                    ...(selected.mitigationStatus === 'Partial' ? [{ date: selected.created, action: 'Partial mitigation in place — follow-up required', user: selected.owner, type: 'warn' }] : []),
                    ...(selected.mitigationStatus === 'Not Addressed' ? [{ date: selected.created, action: 'Risk flagged as unaddressed — escalation pending', user: 'Risk Engine', type: 'error' }] : []),
                  ].map((ev, i) => {
                    const dotColor = ev.type === 'ok' ? 'hsl(var(--s-ok-tx))' : ev.type === 'warn' ? 'hsl(var(--s-wn-tx))' : ev.type === 'error' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--brand))';
                    return (
                      <div key={i} className="flex items-start gap-3 pb-3" style={{ borderBottom: i < 3 ? '1px solid hsl(var(--border))' : undefined }}>
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor }} />
                          {i < 3 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))', minHeight: 16 }} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{ev.action}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{ev.date} · {ev.user}</p>
                        </div>
                      </div>
                    );
                  })}
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
            <DialogTitle>Create GenAI Risk Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Linked Model *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wModel} onChange={e => setWModel(e.target.value)}>
                <option value="">Select model...</option>
                {['Loan Approval Assistant', 'Customer Service Chatbot', 'Credit Risk Scorer', 'Fraud Detection Engine', 'HR Screening System'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>NIST 600-1 Risk Category *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wCategory} onChange={e => setWCategory(e.target.value)}>
                {NIST_600_1_RISKS.map(r => <option key={r.num} value={r.name}>#{r.num} — {r.name}</option>)}
              </select>
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
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wOwner} onChange={e => setWOwner(e.target.value)}>
                {['Sarah Chen', 'James Patel', 'Maria Santos', 'David Kim', 'Emma Wilson'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitCreate}>Create Profile</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
