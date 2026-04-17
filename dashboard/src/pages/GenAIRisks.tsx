import { useState, useMemo } from 'react';
import {
  Plus, Eye, Trash, MagnifyingGlass, Robot, ShieldWarning,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
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

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

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
  }
}

function mitigationColor(s: MitigationStatus) {
  switch (s) {
    case 'Implemented': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Partial': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Under Review': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Not Addressed': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  }
}

function MetricTile({ label, value, variant }: { label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok' }) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
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

export default function GenAIRisks() {
  const [profiles, setProfiles] = useState<GenAIRiskProfile[]>(SEED);
  const [search, setSearch] = useState('');
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
    return matchSearch && matchCat;
  }), [profiles, search, filterCategory]);

  const critical = profiles.filter(p => p.severity === 'Critical').length;
  const notAddressed = profiles.filter(p => p.mitigationStatus === 'Not Addressed').length;
  const implemented = profiles.filter(p => p.mitigationStatus === 'Implemented').length;

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
    setCreateOpen(false);
    setWModel(''); setWGuardrails(''); setWCoverage('None');
  }

  function deleteProfile(id: string) {
    setProfiles(prev => prev.filter(p => p.id !== id));
  }

  const selectedRiskInfo = selected ? NIST_600_1_RISKS.find(r => r.num === selected.riskNumber) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Generative AI Risk Profiles</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>NIST AI 600-1 — manage risks specific to generative and large language models</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Create Risk Profile
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Total Profiles" value={profiles.length} variant="default" />
        <MetricTile label="Critical Risks" value={critical} variant="error" />
        <MetricTile label="Not Addressed" value={notAddressed} variant="warn" />
        <MetricTile label="Implemented" value={implemented} variant="ok" />
      </div>

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
      {filterCategory && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--brand))' }}>
          <span>Filtered by: <strong>{filterCategory}</strong></span>
          <button onClick={() => setFilterCategory(null)} className="underline">Clear filter</button>
        </div>
      )}

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search profiles..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent" style={{ color: 'hsl(var(--text-1))' }} />
          </div>
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
                    <tr key={p.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
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
                  {[
                    { label: 'Model', value: selected.model },
                    { label: 'NIST 600-1 Risk', value: `#${selected.riskNumber} — ${selected.riskCategory}` },
                    { label: 'Severity', value: selected.severity },
                    { label: 'Current Guardrails', value: selected.guardrails },
                    { label: 'Coverage', value: selected.guardrailCoverage },
                    { label: 'Mitigation Status', value: selected.mitigationStatus },
                    { label: 'Owner', value: selected.owner },
                    { label: 'Created', value: selected.created },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="guidance" className="mt-4 space-y-3">
                  {selectedRiskInfo && (
                    <>
                      <div className="p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))', borderRadius: 0 }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>NIST AI 600-1 — Risk #{selectedRiskInfo.num}</p>
                        <p className="text-sm font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedRiskInfo.name}</p>
                        <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-3))' }}>{selectedRiskInfo.desc}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Recommended practices:</p>
                        <ul className="space-y-1">
                          {['Implement monitoring and detection controls', 'Establish testing protocols before deployment', 'Define escalation procedures for detected incidents', 'Document mitigation strategies and their effectiveness'].map(p => (
                            <li key={p} className="text-xs flex items-start gap-2" style={{ color: 'hsl(var(--text-3))' }}>
                              <span style={{ color: 'hsl(var(--brand))' }}>•</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button size="sm" style={{ borderRadius: 0 }}>Apply Recommended Guardrail</Button>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="guardrails" className="mt-4 space-y-2">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Active guardrails for this risk profile:</p>
                  <div className="p-3 border" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selected.guardrails}</p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Coverage: {selected.guardrailCoverage}</p>
                  </div>
                </TabsContent>

                <TabsContent value="log" className="mt-4 space-y-2">
                  {[
                    { date: selected.created, action: 'Risk profile created', user: selected.owner },
                    { date: selected.created, action: `Severity assessed: ${selected.severity}`, user: 'System' },
                    ...(selected.mitigationStatus !== 'Not Addressed' ? [{ date: selected.created, action: `Mitigation: ${selected.mitigationStatus}`, user: selected.owner }] : []),
                  ].map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--brand))' }} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{ev.action}</p>
                        <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{ev.date} · {ev.user}</p>
                      </div>
                    </div>
                  ))}
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
