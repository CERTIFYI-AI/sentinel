import { useState, useMemo } from 'react';
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
    case 'Unacceptable': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    case 'High Risk': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'Limited': return { bg: 'hsl(var(--s-if-bg,var(--s-wn-bg)))', text: 'hsl(var(--brand))', border: 'hsl(var(--brand)/30%)' };
    case 'Minimal': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  }
}

function reviewColor(status: ReviewStatus) {
  switch (status) {
    case 'Approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'In Review': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Pending': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Rejected': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
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
  const [items, setItems] = useState<Classification[]>(SEED);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>AI Risk Classification</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Classify AI systems per EU AI Act Annex III risk tiers</p>
        </div>
        <Button onClick={() => { resetWizard(); setWizardOpen(true); }} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Classify System
        </Button>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Unacceptable Risk" value={`${unacceptable}`} variant="error" />
        <MetricTile label="High Risk" value={`${highRisk}`} variant="warn" />
        <MetricTile label="Limited Risk" value={`${limited}`} variant="info" />
        <MetricTile label="Minimal Risk" value={`${minimal}`} variant="ok" />
      </div>

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
            <Card key={tier} style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
              <CardContent className="px-4 py-4 space-y-2">
                <p className="text-xs font-bold tracking-wider uppercase" style={{ color: c.text }}>{label}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{subtitle}</p>
                <ul className="space-y-0.5">
                  {examples.map(e => (
                    <li key={e} className="text-[11px] flex items-center gap-1" style={{ color: 'hsl(var(--text-4))' }}>
                      <span style={{ color: c.text }}>•</span> {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input
              placeholder="Search classifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent"
              style={{ color: 'hsl(var(--text-1))' }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['ID', 'System', 'Type', 'EU AI Act Tier', 'Annex III Category', 'GPAI', 'Transparency Req', 'Review Status', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const tc2 = tierColor(item.tier);
                  const rc = reviewColor(item.reviewStatus);
                  return (
                    <tr key={item.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                      onClick={() => { setSelected(item); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{item.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.system}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.type}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-semibold px-2 py-0.5" style={{ background: tc2.bg, color: tc2.text, border: `1px solid ${tc2.border}`, borderRadius: 0 }}>{item.tier}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.annexIIICategory}</td>
                      <td className="px-3 py-2.5">
                        {item.gpai ? <span className="text-xs font-semibold px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>Yes</span> : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.transparencyReq ? <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} /> : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5" style={{ background: rc.bg, color: rc.text, borderRadius: 0 }}>{item.reviewStatus}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.owner}</td>
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
                                <AlertDialogTitle>Delete Classification</AlertDialogTitle>
                                <AlertDialogDescription>Delete {item.id} — {item.system}? This cannot be undone.</AlertDialogDescription>
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
        <SheetContent style={{ width: 540, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  {selected.system}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="classification" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="classification" style={{ borderRadius: 0 }}>Classification</TabsTrigger>
                  <TabsTrigger value="obligations" style={{ borderRadius: 0 }}>Obligations</TabsTrigger>
                  <TabsTrigger value="linked" style={{ borderRadius: 0 }}>Linked Model</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="classification" className="mt-4 space-y-4">
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
                      <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="obligations" className="mt-4 space-y-3">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>EU AI Act requirements for <strong>{selected.tier}</strong> tier:</p>
                  {selected.tier === 'High Risk' ? HIGH_RISK_OBLIGATIONS.map(ob => (
                    <div key={ob} className="flex items-center gap-2 p-2 border" style={{ borderColor: 'hsl(var(--border))' }}>
                      <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                      <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{ob}</span>
                    </div>
                  )) : (
                    <p className="text-sm p-3 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                      {selected.tier === 'Unacceptable' ? 'Deployment is prohibited under EU AI Act Art.5.' :
                       selected.tier === 'Limited' ? 'Must disclose AI system nature to users (Art.52).' :
                       'No specific EU AI Act obligations.'}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="linked" className="mt-4 space-y-3">
                  {/* Model card */}
                  <div className="p-3 border" style={{ borderColor: 'hsl(var(--brand)/30%)', background: 'hsl(var(--brand-subtle))' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selected.system}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{selected.type}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ background: tierColor(selected.tier).bg, color: tierColor(selected.tier).text, borderRadius: 0 }}>{selected.tier}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <span className="text-[11px]" style={{ color: 'hsl(var(--text-3))' }}>Owner: <strong style={{ color: 'hsl(var(--text-2))' }}>{selected.owner}</strong></span>
                      <span className="text-[11px]" style={{ color: 'hsl(var(--text-3))' }}>Added: <strong style={{ color: 'hsl(var(--text-2))' }}>{selected.created}</strong></span>
                    </div>
                  </div>

                  {/* Compliance status */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Compliance Status</p>
                    {[
                      { label: 'EU AI Act Article', value: selected.article, highlight: true },
                      { label: 'Annex III Category', value: selected.annexIIICategory },
                      { label: 'GPAI Model', value: selected.gpai ? 'Yes — Art.53 obligations apply' : 'No' },
                      { label: 'Transparency Req.', value: selected.transparencyReq ? 'Required (Art.13 / Art.52)' : 'Not required' },
                      { label: 'Review Status', value: selected.reviewStatus },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.label}</span>
                        <span className="text-xs font-medium" style={{ color: r.highlight ? 'hsl(var(--brand))' : 'hsl(var(--text-2))' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Obligation count */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total Obligations', value: selected.tier === 'High Risk' ? 12 : selected.tier === 'Limited' ? 3 : selected.tier === 'Unacceptable' ? 0 : 0 },
                      { label: 'Met', value: selected.reviewStatus === 'Approved' ? (selected.tier === 'High Risk' ? 10 : selected.tier === 'Limited' ? 3 : 0) : 0 },
                      { label: 'Gaps', value: selected.reviewStatus === 'Approved' ? (selected.tier === 'High Risk' ? 2 : 0) : (selected.tier === 'High Risk' ? 12 : 3) },
                    ].map(s => (
                      <div key={s.label} className="p-2 border text-center" style={{ borderColor: 'hsl(var(--border))' }}>
                        <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" style={{ borderRadius: 0, fontSize: 11, height: 28 }} className="flex-1">
                      <ShieldCheck size={12} className="mr-1.5" /> View Full Model Record
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, height: 28 }} className="flex-1">
                      <ArrowRight size={12} className="mr-1.5" /> Open Obligations
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4 space-y-2">
                  {[
                    { date: selected.created, action: 'Classification created', user: selected.owner },
                    { date: selected.created, action: `Tier assigned: ${selected.tier}`, user: 'System' },
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

      {/* Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={open => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>Classify AI System — Step {step} of 3</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 h-1" style={{ background: s <= step ? 'hsl(var(--brand))' : 'hsl(var(--border))' }} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 1 — System Selection</p>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>System Name *</label>
                <Input style={{ borderRadius: 0 }} value={wSystem} onChange={e => setWSystem(e.target.value)} placeholder="e.g. Credit Risk Scorer" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Intended Purpose *</label>
                <textarea className="w-full text-sm border p-2 min-h-[80px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wPurpose} onChange={e => setWPurpose(e.target.value)} placeholder="Describe the intended purpose of this AI system..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 2 — Classification Questionnaire</p>
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Q1: Does it make decisions affecting people's rights?</p>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWAffectsRights(v)}
                      className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                      style={{ borderRadius: 0, borderColor: wAffectsRights === v ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wAffectsRights === v ? 'hsl(var(--brand-subtle))' : 'transparent', color: wAffectsRights === v ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Q2: EU AI Act Annex III categories (select all that apply):</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {ANNEX_III.map(cat => (
                    <label key={cat} className="flex items-start gap-2 p-2 border cursor-pointer text-xs" style={{ borderColor: wAnnexIII.includes(cat) ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wAnnexIII.includes(cat) ? 'hsl(var(--brand-subtle))' : 'transparent', borderRadius: 0 }}>
                      <input type="checkbox" checked={wAnnexIII.includes(cat)} onChange={() => setWAnnexIII(prev => prev.includes(cat) ? prev.filter(a => a !== cat) : [...prev, cat])} className="mt-0.5" />
                      <span style={{ color: 'hsl(var(--text-2))' }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Q3: Is it a General-Purpose AI (GPAI) model?</p>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWGpai(v)}
                      className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                      style={{ borderRadius: 0, borderColor: wGpai === v ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wGpai === v ? 'hsl(var(--brand-subtle))' : 'transparent', color: wGpai === v ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Q4: Does it interact with humans without disclosure?</p>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setWNoDisclosure(v)}
                      className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                      style={{ borderRadius: 0, borderColor: wNoDisclosure === v ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wNoDisclosure === v ? 'hsl(var(--brand-subtle))' : 'transparent', color: wNoDisclosure === v ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Auto-classification */}
              <div className="p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Auto-classification result:</p>
                <span className="text-sm font-bold px-2 py-0.5 mt-1 inline-block" style={{ background: tierColor(derived).bg, color: tierColor(derived).text, borderRadius: 0 }}>{derived}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Step 3 — Review & Confirm</p>
              <div className="p-4 border text-center" style={{ borderColor: tierColor(derived).border, background: tierColor(derived).bg, borderRadius: 0 }}>
                <p className="text-lg font-bold" style={{ color: tierColor(derived).text }}>{derived}</p>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{wSystem}</p>
              </div>
              {derived === 'High Risk' && (
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Required compliance obligations:</p>
                  {HIGH_RISK_OBLIGATIONS.map(ob => (
                    <label key={ob} className="flex items-center gap-2 p-1.5 cursor-pointer text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                      <input type="checkbox" checked={wObligations.includes(ob)} onChange={() => setWObligations(prev => prev.includes(ob) ? prev.filter(o => o !== ob) : [...prev, ob])} />
                      {ob}
                    </label>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Assign Owner *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wOwner} onChange={e => setWOwner(e.target.value)}>
                  {['Sarah Chen', 'James Patel', 'Maria Santos', 'David Kim', 'Emma Wilson'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => step > 1 ? setStep(s => s - 1) : setWizardOpen(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {step < 3 ? (
              <Button style={{ borderRadius: 0 }} onClick={() => setStep(s => s + 1)}>Next <ArrowRight size={14} className="ml-1" /></Button>
            ) : (
              <Button style={{ borderRadius: 0 }} onClick={submitWizard}>Confirm Classification</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
