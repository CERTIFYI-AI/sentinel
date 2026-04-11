import { useState, useMemo } from 'react';
import {
  Plus, Eye, Trash, MagnifyingGlass, ArrowRight, Check, X,
  ShieldCheck, Warning, Info,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
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

// ── Types ─────────────────────────────────────────────────────────────────────

type DPIARiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
type DPOStatus = 'Approved' | 'In Review' | 'Pending' | 'Not Started' | 'N/A';

interface DPIA {
  id: string;
  system: string;
  dataSubjects: string;
  purpose: string;
  riskLevel: DPIARiskLevel;
  dpoStatus: DPOStatus;
  completion: number;
  dueDate: string;
  dpo: string;
  legalBasis: string;
  created: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED: DPIA[] = [
  { id: 'DPIA-001', system: 'Credit Risk Scorer', dataSubjects: 'Loan applicants', purpose: 'Credit scoring', riskLevel: 'High', dpoStatus: 'Approved', completion: 95, dueDate: '2026-01-15', dpo: 'James Patel', legalBasis: 'Art.6(1)(b) — Contract', created: '2025-12-01' },
  { id: 'DPIA-002', system: 'HR Screening System', dataSubjects: 'Job applicants', purpose: 'Recruitment screening', riskLevel: 'High', dpoStatus: 'Pending', completion: 60, dueDate: '2026-04-30', dpo: 'James Patel', legalBasis: 'Art.6(1)(b) — Contract', created: '2026-01-10' },
  { id: 'DPIA-003', system: 'Loan Approval Assistant', dataSubjects: 'Customers', purpose: 'Loan decisions', riskLevel: 'Critical', dpoStatus: 'In Review', completion: 40, dueDate: '2026-05-15', dpo: 'James Patel', legalBasis: 'Art.6(1)(b) — Contract', created: '2026-02-01' },
  { id: 'DPIA-004', system: 'AML Transaction Monitor', dataSubjects: 'Account holders', purpose: 'Fraud prevention', riskLevel: 'High', dpoStatus: 'Approved', completion: 100, dueDate: '2025-12-01', dpo: 'James Patel', legalBasis: 'Art.6(1)(c) — Legal obligation', created: '2025-10-01' },
  { id: 'DPIA-005', system: 'Customer Sentiment Analyzer', dataSubjects: 'Customers', purpose: 'Analytics', riskLevel: 'Medium', dpoStatus: 'N/A', completion: 80, dueDate: '2026-03-01', dpo: 'Sarah Chen', legalBasis: 'Art.6(1)(f) — Legitimate interests', created: '2026-01-15' },
  { id: 'DPIA-006', system: 'Employee Monitoring (planned)', dataSubjects: 'Employees', purpose: 'Performance monitoring', riskLevel: 'High', dpoStatus: 'Not Started', completion: 10, dueDate: '2026-06-30', dpo: 'Unassigned', legalBasis: 'TBD', created: '2026-03-01' },
];

const WORKFLOW_STEPS = ['Screening', 'Scope Definition', 'Risk Analysis', 'DPO Consultation', 'Measures', 'Approval'];

const DATA_CATEGORIES = ['Name', 'Financial', 'Health', 'Biometric', 'Location', 'Behavioral', 'Employment', 'Criminal'];
const RIGHTS_RISKS = ['Discrimination', 'Financial loss', 'Reputation damage', 'Loss of confidentiality', 'Social disadvantage', 'Physical harm'];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function riskColor(r: DPIARiskLevel) {
  switch (r) {
    case 'Critical': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'High': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Medium': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Low': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  }
}

function dpoColor(s: DPOStatus) {
  switch (s) {
    case 'Approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'In Review': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Pending': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Not Started': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'N/A': return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function DPIAPage() {
  const [items, setItems] = useState<DPIA[]>(SEED);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DPIA | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Wizard state
  const [wSystem, setWSystem] = useState('');
  const [wDataCats, setWDataCats] = useState<string[]>([]);
  const [wPurpose, setWPurpose] = useState('');
  const [wVolume, setWVolume] = useState('');
  const [wGeo, setWGeo] = useState('');
  const [wLegalBasis, setWLegalBasis] = useState('Art.6(1)(b) — Contract');
  const [wNecessity, setWNecessity] = useState('');
  const [wRisks, setWRisks] = useState<{ desc: string; likelihood: number; severity: number }[]>([]);
  const [wRightsRisks, setWRightsRisks] = useState<string[]>([]);
  const [wDpo, setWDpo] = useState('James Patel');
  const [wDpoOpinion, setWDpoOpinion] = useState<'Approve' | 'Reject' | 'Conditions' | ''>('');
  const [wMeasures, setWMeasures] = useState<{ measure: string; type: string; owner: string; deadline: string }[]>([]);
  const [wResidualRisk, setWResidualRisk] = useState('');
  const [wDueDate, setWDueDate] = useState('');

  const filtered = useMemo(() => items.filter(i =>
    !search || i.system.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const total = items.length;
  const completed = items.filter(i => i.completion === 100).length;
  const inProgress = items.filter(i => i.completion > 0 && i.completion < 100).length;
  const dpoPending = items.filter(i => i.dpoStatus === 'Pending' || i.dpoStatus === 'Not Started').length;

  function resetWizard() {
    setStep(1); setWSystem(''); setWDataCats([]); setWPurpose(''); setWVolume(''); setWGeo('');
    setWLegalBasis('Art.6(1)(b) — Contract'); setWNecessity(''); setWRisks([]); setWRightsRisks([]);
    setWDpo('James Patel'); setWDpoOpinion(''); setWMeasures([]); setWResidualRisk(''); setWDueDate('');
  }

  function submitWizard() {
    const newDpia: DPIA = {
      id: `DPIA-${String(items.length + 1).padStart(3, '0')}`,
      system: wSystem || 'Unnamed System',
      dataSubjects: 'TBD',
      purpose: wPurpose || 'TBD',
      riskLevel: wDataCats.includes('Health') || wDataCats.includes('Biometric') ? 'Critical' : wDataCats.length > 3 ? 'High' : 'Medium',
      dpoStatus: wDpoOpinion === 'Approve' ? 'Approved' : 'Pending',
      completion: 40,
      dueDate: wDueDate || '2026-12-31',
      dpo: wDpo,
      legalBasis: wLegalBasis,
      created: new Date().toISOString().split('T')[0],
    };
    setItems(prev => [newDpia, ...prev]);
    setWizardOpen(false);
    resetWizard();
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const isHighRisk = wDataCats.includes('Health') || wDataCats.includes('Biometric') || wDataCats.includes('Criminal');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Data Protection Impact Assessments</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>GDPR Article 35 — required for high-risk AI processing of personal data</p>
        </div>
        <Button onClick={() => { resetWizard(); setWizardOpen(true); }} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Start DPIA
        </Button>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Total DPIAs" value={total} variant="default" />
        <MetricTile label="Completed" value={completed} variant="ok" />
        <MetricTile label="In Progress" value={inProgress} variant="warn" />
        <MetricTile label="DPO Pending" value={dpoPending} variant="error" />
      </div>

      {/* Workflow stepper */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-0 overflow-x-auto">
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: 'white', borderRadius: 0 }}>{i + 1}</div>
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>{s}</span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <div className="h-px w-8 mx-1 mt-[-14px]" style={{ background: 'hsl(var(--border))' }} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search DPIAs..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent" style={{ color: 'hsl(var(--text-1))' }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['DPIA ID', 'System', 'Data Subjects', 'Purpose', 'Risk Level', 'DPO Status', 'Completion', 'Due Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const rc = riskColor(item.riskLevel);
                  const dc = dpoColor(item.dpoStatus);
                  return (
                    <tr key={item.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                      onClick={() => { setSelected(item); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{item.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.system}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.dataSubjects}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.purpose}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 font-medium" style={{ background: rc.bg, color: rc.text, borderRadius: 0 }}>{item.riskLevel}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5" style={{ background: dc.bg, color: dc.text, borderRadius: 0 }}>{item.dpoStatus}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[hsl(var(--bg-raised))]" style={{ minWidth: 60 }}>
                            <div className="h-full" style={{ width: `${item.completion}%`, background: item.completion === 100 ? 'hsl(var(--s-ok-tx))' : item.completion >= 60 ? 'hsl(var(--brand))' : 'hsl(var(--s-wn-tx))' }} />
                          </div>
                          <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--text-3))' }}>{item.completion}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: new Date(item.dueDate) < new Date() && item.completion < 100 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>{item.dueDate}</td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                            onClick={() => { setSelected(item); setSheetOpen(true); }}>
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
                                <AlertDialogTitle>Delete DPIA</AlertDialogTitle>
                                <AlertDialogDescription>Delete {item.id}? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction style={{ borderRadius: 0 }} onClick={() => deleteItem(item.id)}>Delete</AlertDialogAction>
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
        <SheetContent style={{ width: 560, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  {selected.system}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="risks" style={{ borderRadius: 0 }}>Risk Analysis</TabsTrigger>
                  <TabsTrigger value="dpo" style={{ borderRadius: 0 }}>DPO Consultation</TabsTrigger>
                  <TabsTrigger value="measures" style={{ borderRadius: 0 }}>Measures</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  {[
                    { label: 'System', value: selected.system },
                    { label: 'Data Subjects', value: selected.dataSubjects },
                    { label: 'Processing Purpose', value: selected.purpose },
                    { label: 'Legal Basis', value: selected.legalBasis },
                    { label: 'Risk Level', value: selected.riskLevel },
                    { label: 'DPO Status', value: selected.dpoStatus },
                    { label: 'Completion', value: `${selected.completion}%` },
                    { label: 'Due Date', value: selected.dueDate },
                    { label: 'Assigned DPO', value: selected.dpo },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="risks" className="mt-4 space-y-3">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Identified processing risks and rights impacts for {selected.system}.</p>
                  <div className="p-3 border" style={{ borderColor: 'hsl(var(--s-wn-br))', background: 'hsl(var(--s-wn-bg))' }}>
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}>Risk Level: {selected.riskLevel}</p>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-4))' }}>Full risk matrix captured during DPIA screening phase.</p>
                </TabsContent>

                <TabsContent value="dpo" className="mt-4 space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selected.dpo}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Data Protection Officer</p>
                      </div>
                      <span className="text-xs px-2 py-0.5" style={{ background: dpoColor(selected.dpoStatus).bg, color: dpoColor(selected.dpoStatus).text, borderRadius: 0 }}>{selected.dpoStatus}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" style={{ borderRadius: 0 }} className="flex-1">Approve</Button>
                      <Button size="sm" variant="outline" style={{ borderRadius: 0 }} className="flex-1">Request Changes</Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="measures" className="mt-4">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Technical and organizational measures to address identified risks.</p>
                  <div className="mt-3 p-3 border" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No measures recorded yet. Complete the DPIA wizard to add measures.</p>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4 space-y-2">
                  {[
                    { date: selected.created, action: 'DPIA initiated', user: selected.dpo },
                    { date: selected.created, action: 'Screening phase completed', user: 'System' },
                    ...(selected.dpoStatus === 'Approved' ? [{ date: selected.dueDate, action: 'DPO approved DPIA', user: selected.dpo }] : []),
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

      {/* 5-step Wizard */}
      <Dialog open={wizardOpen} onOpenChange={open => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>Start DPIA — Step {step} of 5</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className="flex-1 h-1" style={{ background: s <= step ? 'hsl(var(--brand))' : 'hsl(var(--border))' }} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 1 — Screening</p>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>System Name *</label>
                <Input style={{ borderRadius: 0 }} value={wSystem} onChange={e => setWSystem(e.target.value)} placeholder="e.g. Credit Risk Scorer" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Processing Purposes *</label>
                <textarea className="w-full text-sm border p-2 min-h-[60px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wPurpose} onChange={e => setWPurpose(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Data Categories *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DATA_CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-1.5 p-1.5 border cursor-pointer text-xs" style={{ borderRadius: 0, borderColor: wDataCats.includes(cat) ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wDataCats.includes(cat) ? 'hsl(var(--brand-subtle))' : 'transparent', color: 'hsl(var(--text-2))' }}>
                      <input type="checkbox" checked={wDataCats.includes(cat)} onChange={() => setWDataCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
              {wDataCats.length > 0 && (
                <div className="p-2 border" style={{ borderColor: isHighRisk ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-ok-br))', background: isHighRisk ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))', borderRadius: 0 }}>
                  <p className="text-xs font-semibold" style={{ color: isHighRisk ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>
                    {isHighRisk ? '⚠ DPIA Required — High-risk processing detected' : '✓ Consult DPO — Possible DPIA required'}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 2 — Scope</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Estimated Volume *</label>
                  <Input style={{ borderRadius: 0 }} value={wVolume} onChange={e => setWVolume(e.target.value)} placeholder="e.g. 50,000 records" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Geographic Scope *</label>
                  <Input style={{ borderRadius: 0 }} value={wGeo} onChange={e => setWGeo(e.target.value)} placeholder="e.g. EU, UK, US" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Legal Basis *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wLegalBasis} onChange={e => setWLegalBasis(e.target.value)}>
                  {['Art.6(1)(a) — Consent', 'Art.6(1)(b) — Contract', 'Art.6(1)(c) — Legal obligation', 'Art.6(1)(f) — Legitimate interests'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Due Date</label>
                <Input type="date" style={{ borderRadius: 0 }} value={wDueDate} onChange={e => setWDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 3 — Risk Analysis</p>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Processing Necessity *</label>
                <textarea className="w-full text-sm border p-2 min-h-[70px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wNecessity} onChange={e => setWNecessity(e.target.value)} placeholder="Why is this processing necessary?" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Rights risks (select all that apply):</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {RIGHTS_RISKS.map(r => (
                    <label key={r} className="flex items-center gap-1.5 p-1.5 border cursor-pointer text-xs" style={{ borderRadius: 0, borderColor: wRightsRisks.includes(r) ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))', background: wRightsRisks.includes(r) ? 'hsl(var(--s-wn-bg))' : 'transparent', color: 'hsl(var(--text-2))' }}>
                      <input type="checkbox" checked={wRightsRisks.includes(r)} onChange={() => setWRightsRisks(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])} />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 4 — DPO Consultation</p>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Assign DPO *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wDpo} onChange={e => setWDpo(e.target.value)}>
                  {['James Patel', 'Sarah Chen', 'Emma Wilson'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>DPO Opinion</label>
                <div className="flex gap-2">
                  {(['Approve', 'Reject', 'Conditions'] as const).map(op => (
                    <button key={op} onClick={() => setWDpoOpinion(op)}
                      className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                      style={{ borderRadius: 0, borderColor: wDpoOpinion === op ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wDpoOpinion === op ? 'hsl(var(--brand-subtle))' : 'transparent', color: wDpoOpinion === op ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 5 — Measures & Approval</p>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Residual Risk Level</label>
                <div className="flex gap-2">
                  {(['Low', 'Medium', 'High', 'Unacceptable'] as const).map(r => (
                    <button key={r} onClick={() => setWResidualRisk(r)}
                      className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                      style={{ borderRadius: 0, borderColor: wResidualRisk === r ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wResidualRisk === r ? 'hsl(var(--brand-subtle))' : 'transparent', color: wResidualRisk === r ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {wResidualRisk === 'Unacceptable' && (
                <div className="p-3 border" style={{ borderColor: 'hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', borderRadius: 0 }}>
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-er-tx))' }}>⚠ Prior consultation with supervisory authority required (GDPR Art.36)</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => step > 1 ? setStep(s => s - 1) : setWizardOpen(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {step < 5 ? (
              <Button style={{ borderRadius: 0 }} onClick={() => setStep(s => s + 1)}>Next <ArrowRight size={14} className="ml-1" /></Button>
            ) : (
              <Button style={{ borderRadius: 0 }} onClick={submitWizard}>Submit DPIA</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
