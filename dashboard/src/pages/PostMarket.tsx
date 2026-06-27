import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import {
  Plus, Eye, Trash, MagnifyingGlass, Warning, Bell, ArrowsClockwise,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';


type Frequency = 'Real-time' | 'Daily' | 'Weekly' | 'Monthly';
type PlanStatus = 'Active' | 'Alert' | 'Critical' | 'Paused';

interface SurveillancePlan {
  id: string;
  name: string;
  model: string;
  frequency: Frequency;
  driftThreshold: string;
  feedbackCollection: boolean;
  lastReview: string;
  nextReview: string;
  status: PlanStatus;
  owner: string;
}

interface SurveillanceEvent {
  id: string;
  planId: string;
  model: string;
  type: 'Drift Alert' | 'Performance Degradation' | 'User Complaint' | 'Scheduled Review' | 'Threshold Breach' | 'Manual Review';
  message: string;
  date: string;
  severity: 'info' | 'warn' | 'error';
}

const SEED_PLANS: SurveillancePlan[] = [
  { id: 'PMS-001', name: 'Credit Risk Monitoring', model: 'Credit Risk Scorer', frequency: 'Weekly', driftThreshold: 'Accuracy <85% OR Fairness <80%', feedbackCollection: true, lastReview: '2026-03-01', nextReview: '2026-04-01', status: 'Alert', owner: 'Maria Santos' },
  { id: 'PMS-002', name: 'Fraud Detection Surveillance', model: 'Fraud Detection Engine', frequency: 'Daily', driftThreshold: 'Precision <90%', feedbackCollection: true, lastReview: '2026-04-01', nextReview: '2026-04-08', status: 'Active', owner: 'David Kim' },
  { id: 'PMS-003', name: 'Loan Approval Monitoring', model: 'Loan Approval Assistant', frequency: 'Weekly', driftThreshold: 'Hallucination >5%', feedbackCollection: true, lastReview: '2026-03-15', nextReview: '2026-04-15', status: 'Critical', owner: 'Maria Santos' },
  { id: 'PMS-004', name: 'AML Continuous Monitor', model: 'AML Transaction Monitor', frequency: 'Daily', driftThreshold: 'FPR >10%', feedbackCollection: false, lastReview: '2026-04-01', nextReview: '2026-04-08', status: 'Active', owner: 'David Kim' },
  { id: 'PMS-005', name: 'HR Bias Surveillance', model: 'HR Screening System', frequency: 'Monthly', driftThreshold: 'Bias score <0.80', feedbackCollection: true, lastReview: '2026-02-01', nextReview: '2026-05-01', status: 'Active', owner: 'James Patel' },
];

const SEED_EVENTS: SurveillanceEvent[] = [
  { id: 'EVT-001', planId: 'PMS-001', model: 'Credit Risk Scorer', type: 'Drift Alert', message: 'Fairness score dropped to 78% — below 80% threshold', date: '2026-04-10', severity: 'warn' },
  { id: 'EVT-002', planId: 'PMS-003', model: 'Loan Approval Assistant', type: 'Threshold Breach', message: 'Hallucination rate exceeded 5% threshold', date: '2026-04-09', severity: 'error' },
  { id: 'EVT-003', planId: 'PMS-002', model: 'Fraud Detection Engine', type: 'Scheduled Review', message: 'Weekly review completed — all metrics nominal', date: '2026-04-08', severity: 'info' },
  { id: 'EVT-004', planId: 'PMS-001', model: 'Credit Risk Scorer', type: 'User Complaint', message: '3 user complaints received about unfair loan rejections', date: '2026-04-07', severity: 'warn' },
  { id: 'EVT-005', planId: 'PMS-003', model: 'Loan Approval Assistant', type: 'Manual Review', message: 'Emergency review triggered by critical drift detection', date: '2026-04-06', severity: 'error' },
  { id: 'EVT-006', planId: 'PMS-004', model: 'AML Transaction Monitor', type: 'Performance Degradation', message: 'Precision dropped to 88.5%', date: '2026-04-05', severity: 'warn' },
];

const METRIC_HISTORY = [
  { month: 'Oct', accuracy: 93, fairness: 85, hallucination: 2 },
  { month: 'Nov', accuracy: 92, fairness: 84, hallucination: 2.5 },
  { month: 'Dec', accuracy: 91.5, fairness: 83, hallucination: 3 },
  { month: 'Jan', accuracy: 91, fairness: 82, hallucination: 3.5 },
  { month: 'Feb', accuracy: 90, fairness: 80, hallucination: 4.2 },
  { month: 'Mar', accuracy: 89, fairness: 78, hallucination: 5.1 },
];

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

function planStatusColor(s: PlanStatus) {
  switch (s) {
    case 'Active': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Alert': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Critical': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Paused': return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

function eventColor(sev: 'info' | 'warn' | 'error') {
  switch (sev) {
    case 'info': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'warn': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'error': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  }
}

export default function PostMarket() {
  const ct = useChartTheme();
  const [plans, setPlans] = useState<SurveillancePlan[]>(SEED_PLANS);
  const [events] = useState<SurveillanceEvent[]>(SEED_EVENTS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SurveillancePlan | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [wModel, setWModel] = useState('');
  const [wName, setWName] = useState('');
  const [wFreq, setWFreq] = useState<Frequency>('Weekly');
  const [wOwner, setWOwner] = useState('Sarah Chen');
  const [wFeedback, setWFeedback] = useState(true);

  const filtered = useMemo(() => plans.filter(p =>
    !search || p.model.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  ), [plans, search]);

  const modelsUnderSurveillance = plans.filter(p => p.status !== 'Paused').length;
  const alertsThisMonth = events.filter(e => e.severity === 'warn' || e.severity === 'error').length;
  const reviewsDue = plans.filter(p => new Date(p.nextReview) <= new Date(Date.now() + 7 * 86400000)).length;
  const criticalDrift = plans.filter(p => p.status === 'Critical').length;

  function submitWizard() {
    const next = new Date();
    next.setDate(next.getDate() + (wFreq === 'Daily' ? 1 : wFreq === 'Weekly' ? 7 : 30));
    const newPlan: SurveillancePlan = {
      id: `PMS-${String(plans.length + 1).padStart(3, '0')}`,
      name: wName || `${wModel} Monitoring`,
      model: wModel || 'Unknown Model',
      frequency: wFreq,
      driftThreshold: 'Accuracy <90%',
      feedbackCollection: wFeedback,
      lastReview: new Date().toISOString().split('T')[0],
      nextReview: next.toISOString().split('T')[0],
      status: 'Active',
      owner: wOwner,
    };
    setPlans(prev => [newPlan, ...prev]);
    toast.success(`Surveillance plan "${newPlan.name}" created`);
    setWizardOpen(false);
    setWModel(''); setWName('');
  }

  function deletePlan(id: string) {
    const plan = plans.find(p => p.id === id);
    if (plan) toast.success(`Surveillance plan "${plan.name}" removed`);
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Post-Market Surveillance</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Continuous monitoring of deployed AI systems per EU AI Act Article 72</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Add Surveillance Plan
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Models Under Surveillance" value={modelsUnderSurveillance} variant="ok" />
        <MetricTile label="Alerts This Month" value={alertsThisMonth} variant="warn" />
        <MetricTile label="Reviews Due (7d)" value={reviewsDue} variant="warn" />
        <MetricTile label="Critical Drift" value={criticalDrift} variant="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Surveillance plans table */}
        <div className="lg:col-span-2">
          <Card style={{ borderRadius: 0 }}>
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Surveillance Plans</p>
                <div className="flex-1" />
                <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent w-32" style={{ color: 'hsl(var(--text-1))' }} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['Plan', 'Model', 'Frequency', 'Next Review', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(plan => {
                      const pc = planStatusColor(plan.status);
                      return (
                        <tr key={plan.id} className="border-b hover:bg-raised transition-colors cursor-pointer"
                          style={{ borderColor: 'hsl(var(--border))', borderLeft: plan.status === 'Critical' ? '3px solid hsl(var(--s-er-tx))' : plan.status === 'Alert' ? '3px solid hsl(var(--s-wn-tx))' : 'none' }}
                          onClick={() => { setSelected(plan); setSheetOpen(true); }}>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{plan.id}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{plan.model}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{plan.frequency}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{plan.nextReview}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 font-medium" style={{ background: pc.bg, color: pc.text, borderRadius: 0 }}>{plan.status}</span>
                          </td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                                onClick={() => { setSelected(plan); setSheetOpen(true); }}>
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
                                    <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                                    <AlertDialogDescription>Delete {plan.id}? This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction style={{ borderRadius: 0 }} onClick={() => deletePlan(plan.id)}>Delete</AlertDialogAction>
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
        </div>

        {/* Events feed */}
        <div>
          <Card style={{ borderRadius: 0 }}>
            <CardContent className="p-0">
              <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Surveillance Events</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {events.map(ev => {
                  const ec = eventColor(ev.severity);
                  return (
                    <div key={ev.id} className="p-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs px-1.5 py-0.5 font-medium flex-shrink-0" style={{ background: ec.bg, color: ec.text, borderRadius: 0 }}>{ev.type}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{ev.message}</p>
                      <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{ev.model} · {ev.date}</p>
                      {ev.severity === 'error' && (
                        <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, height: 24 }}
                          className="mt-1 text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]">
                          <ArrowsClockwise size={11} className="mr-1" /> Trigger Review
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto" style={{ width: 580, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  {selected.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="plan" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="plan" style={{ borderRadius: 0 }}>Plan</TabsTrigger>
                  <TabsTrigger value="metrics" style={{ borderRadius: 0 }}>Metrics History</TabsTrigger>
                  <TabsTrigger value="events" style={{ borderRadius: 0 }}>Events</TabsTrigger>
                  <TabsTrigger value="feedback" style={{ borderRadius: 0 }}>User Feedback</TabsTrigger>
                  <TabsTrigger value="reports" style={{ borderRadius: 0 }}>Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="mt-4 space-y-3">
                  {[
                    { label: 'Model', value: selected.model },
                    { label: 'Frequency', value: selected.frequency },
                    { label: 'Drift Threshold', value: selected.driftThreshold },
                    { label: 'Feedback Collection', value: selected.feedbackCollection ? 'Enabled' : 'Disabled' },
                    { label: 'Last Review', value: selected.lastReview },
                    { label: 'Next Review', value: selected.nextReview },
                    { label: 'Owner', value: selected.owner },
                    { label: 'Status', value: selected.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="metrics" className="mt-4">
                  <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>6-month performance trend for {selected.model}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={METRIC_HISTORY}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="month" tick={{ fill: ct.text, fontSize: 11 }} />
                      <YAxis tick={{ fill: ct.text, fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: 0 }} />
                      <ReferenceLine y={85} stroke="hsl(var(--s-er-tx))" strokeDasharray="4 2" label={{ value: 'Threshold', fill: 'hsl(var(--s-er-tx))', fontSize: 10 }} />
                      <Line type="monotone" dataKey="accuracy" stroke={ct.colors[0]} strokeWidth={2} dot={false} name="Accuracy %" />
                      <Line type="monotone" dataKey="fairness" stroke={ct.colors[1]} strokeWidth={2} dot={false} name="Fairness %" />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="events" className="mt-4 space-y-2">
                  {events.filter(e => e.planId === selected.id).map(ev => {
                    const ec = eventColor(ev.severity);
                    return (
                      <div key={ev.id} className="p-2 border" style={{ borderColor: 'hsl(var(--border))' }}>
                        <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: ec.bg, color: ec.text, borderRadius: 0 }}>{ev.type}</span>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{ev.message}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{ev.date}</p>
                      </div>
                    );
                  })}
                  {events.filter(e => e.planId === selected.id).length === 0 && (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No events recorded for this plan.</p>
                  )}
                </TabsContent>

                <TabsContent value="feedback" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>Feedback Collection Portal</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>User complaints collected via integrated feedback portal (EU AI Act Art.62)</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5" style={{ background: selected.feedbackCollection ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))', color: selected.feedbackCollection ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', borderRadius: 0 }}>
                      {selected.feedbackCollection ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {(() => {
                    const complaints = events.filter(e => e.planId === selected.id && e.type === 'User Complaint');
                    return complaints.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Logged Complaints ({complaints.length})</p>
                        {complaints.map(c => (
                          <div key={c.id} className="p-2.5 border" style={{ borderColor: 'hsl(var(--s-wn-br))', background: 'hsl(var(--s-wn-bg))' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{c.id}</span>
                              <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{c.date}</span>
                            </div>
                            <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>{c.message}</p>
                            <Button size="sm" style={{ borderRadius: 0, fontSize: 11, height: 24, marginTop: 6 }}>Open Complaint</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 border text-center" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))' }}>
                        <p className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>✓ No user complaints logged for this plan</p>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Complaints (30d)', value: events.filter(e => e.planId === selected.id && e.type === 'User Complaint').length },
                      { label: 'Resolved', value: 0 },
                      { label: 'Avg. Resolution', value: 'N/A' },
                    ].map(s => (
                      <div key={s.label} className="p-2 border text-center" style={{ borderColor: 'hsl(var(--border))' }}>
                        <p className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Serious Incident Reports — EU AI Act Art.73</p>
                    <Button size="sm" style={{ borderRadius: 0, fontSize: 11, height: 26 }}>
                      <Warning size={12} className="mr-1" /> File Incident
                    </Button>
                  </div>
                  {selected.status === 'Critical' ? (
                    <div className="p-3 border space-y-2" style={{ borderColor: 'hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>Pending Art.73 Notification</span>
                        <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-er-tx))', color: 'hsl(var(--bg-surface))', borderRadius: 0 }}>ACTION REQUIRED</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>A serious incident has been detected. You must notify the relevant market surveillance authority within 15 days.</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" style={{ borderRadius: 0, fontSize: 11, height: 26, background: 'hsl(var(--s-er-tx))' }}>Submit to Authority</Button>
                        <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, height: 26 }}>Generate Report PDF</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border text-center" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))' }}>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>✓ No serious incidents reported to supervisory authority</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Reporting Obligations</p>
                    {[
                      { art: 'Art.73', desc: 'Serious incident notification to market surveillance authority', deadline: '15 days' },
                      { art: 'Art.74', desc: 'Post-market log maintained and available to authorities', deadline: 'Ongoing' },
                      { art: 'Art.72', desc: 'Post-market monitoring plan in place', deadline: 'Ongoing' },
                    ].map(o => (
                      <div key={o.art} className="flex items-center justify-between p-2 border" style={{ borderColor: 'hsl(var(--border))' }}>
                        <div>
                          <span className="text-[10px] font-bold mr-2" style={{ color: 'hsl(var(--brand))' }}>{o.art}</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{o.desc}</span>
                        </div>
                        <span className="text-[10px] font-medium ml-2 flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>{o.deadline}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Plan Modal */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Add Surveillance Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Plan Name *</label>
              <Input style={{ borderRadius: 0 }} value={wName} onChange={e => setWName(e.target.value)} placeholder="e.g. Credit Risk Monitoring" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Linked Model *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wModel} onChange={e => setWModel(e.target.value)}>
                <option value="">Select model...</option>
                {['Credit Risk Scorer', 'Fraud Detection Engine', 'Loan Approval Assistant', 'AML Transaction Monitor', 'HR Screening System', 'Customer Service Chatbot'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Monitoring Frequency *</label>
              <div className="flex gap-2">
                {(['Real-time', 'Daily', 'Weekly', 'Monthly'] as Frequency[]).map(f => (
                  <button key={f} onClick={() => setWFreq(f)}
                    className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wFreq === f ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wFreq === f ? 'hsl(var(--brand-subtle))' : 'transparent', color: wFreq === f ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Responsible Person *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wOwner} onChange={e => setWOwner(e.target.value)}>
                {['Sarah Chen', 'James Patel', 'Maria Santos', 'David Kim', 'Emma Wilson'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-3 border" style={{ borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
              <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>User feedback collection</span>
              <button onClick={() => setWFeedback(!wFeedback)}
                className="w-10 h-5 relative transition-colors"
                style={{ background: wFeedback ? 'hsl(var(--brand))' : 'hsl(var(--bg-raised))', borderRadius: 9999 }}>
                <span className="absolute top-0.5 h-4 w-4 bg-white transition-all" style={{ borderRadius: 9999, left: wFeedback ? '22px' : '2px' }} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setWizardOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitWizard}>Create Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
