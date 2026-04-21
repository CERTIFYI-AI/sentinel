// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { useEthicsReportsData } from '../hooks/useEthicsReportsData';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { toast } from 'sonner';
import {
  Eye, Trash, MagnifyingGlass, ArrowSquareOut, Link, ShieldWarning,
  UserCircleCheck,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {

  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';

type ReportCategory = 'AI Bias/Discrimination' | 'Safety Concern' | 'Privacy Violation' | 'Misuse of AI' | 'Regulatory Non-Compliance' | 'Ethical Concern' | 'Other';
type ReportSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
type ReportStatus = 'Open' | 'Under Investigation' | 'Resolved' | 'Closed';
type Source = 'Anonymous' | 'Named (hidden)';

interface EthicsReport {
  id: string;
  date: string;
  category: ReportCategory;
  severity: ReportSeverity;
  source: Source;
  status: ReportStatus;
  assignedInvestigator: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  resolution?: string;
  system?: string;
}

const SEED: EthicsReport[] = [
  { id: 'ER-001', date: '2026-03-15', category: 'AI Bias/Discrimination', severity: 'High', source: 'Anonymous', status: 'Under Investigation', assignedInvestigator: 'David Kim', priority: 'High', description: 'Credit scoring model appears to discriminate by zip code, resulting in higher rejection rates for certain geographic areas with no legitimate credit-risk basis.', system: 'Credit Risk Scorer' },
  { id: 'ER-002', date: '2026-03-20', category: 'Privacy Violation', severity: 'Critical', source: 'Named (hidden)', status: 'Open', assignedInvestigator: 'James Patel', priority: 'High', description: 'Customer PII accessed by unauthorized agent process outside of documented data processing agreement.', system: 'AML Transaction Monitor' },
  { id: 'ER-003', date: '2026-02-10', category: 'Regulatory Non-Compliance', severity: 'High', source: 'Anonymous', status: 'Resolved', assignedInvestigator: 'Emma Wilson', priority: 'Medium', description: 'Model deployed to production without completed bias audit as required by internal policy and EU AI Act.', resolution: 'Bias audit completed, model retrained and redeployed with appropriate controls.', system: 'HR Screening System' },
  { id: 'ER-004', date: '2026-03-25', category: 'Misuse of AI', severity: 'Medium', source: 'Anonymous', status: 'Open', assignedInvestigator: 'Sarah Chen', priority: 'Medium', description: 'Shadow AI tool used to make employment screening decisions without approval, outside sanctioned AI systems.', system: 'Unknown' },
  { id: 'ER-005', date: '2026-04-01', category: 'Safety Concern', severity: 'Critical', source: 'Anonymous', status: 'Under Investigation', assignedInvestigator: 'Maria Santos', priority: 'High', description: 'Hallucinating loan approval AI gave a customer incorrect legal advice, potentially causing financial harm.', system: 'Loan Approval Assistant' },
  { id: 'ER-006', date: '2026-02-28', category: 'Ethical Concern', severity: 'Medium', source: 'Anonymous', status: 'Resolved', assignedInvestigator: 'James Patel', priority: 'Low', description: 'Concern raised about lack of human oversight in automated underwriting decisions for high-value loans.', resolution: 'Human review process added for loans above $500K threshold.' },
  { id: 'ER-007', date: '2026-03-05', category: 'AI Bias/Discrimination', severity: 'Medium', source: 'Anonymous', status: 'Open', assignedInvestigator: 'David Kim', priority: 'Medium', description: 'Sentiment analysis model performing worse on non-native English speakers, creating service quality disparity.', system: 'Customer Sentiment Analyzer' },
  { id: 'ER-008', date: '2026-01-20', category: 'Other', severity: 'Low', source: 'Anonymous', status: 'Closed', assignedInvestigator: 'Emma Wilson', priority: 'Low', description: 'Request for clearer documentation on how AI systems are used in customer interactions.' },
];

function categoryColor(c: ReportCategory) {
  const map: Record<ReportCategory, { bg: string; text: string }> = {
    'AI Bias/Discrimination': { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
    'Safety Concern': { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
    'Privacy Violation': { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    'Misuse of AI': { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    'Regulatory Non-Compliance': { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    'Ethical Concern': { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' },
    'Other': { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-3))' },
  };
  return map[c];
}

function severityColor(s: ReportSeverity) {
  switch (s) {
    case 'Critical': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'High': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Medium': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Low': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  }
}

function statusColor(s: ReportStatus) {
  switch (s) {
    case 'Open': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Under Investigation': return { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' };
    case 'Resolved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Closed': return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

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

const REPORT_CATEGORIES: ReportCategory[] = ['AI Bias/Discrimination', 'Safety Concern', 'Privacy Violation', 'Misuse of AI', 'Regulatory Non-Compliance', 'Ethical Concern', 'Other'];
const INVESTIGATORS = ['David Kim', 'James Patel', 'Emma Wilson', 'Sarah Chen', 'Maria Santos'];

export default function EthicsReporting() {
  const { items: liveItems, isLoading, save, remove } = useEthicsReportsData();
  const { items: reports, isLoading, saveEthicsReports, removeEthicsReports } = useEthicsReportsData()

  useEffect(() => {
    if (liveItems.length > 0) setReports(liveItems as any[])
  }, [liveItems]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EthicsReport | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewIdentityOpen, setViewIdentityOpen] = useState(false);
  const [viewReason, setViewReason] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [wCategory, setWCategory] = useState<ReportCategory>('AI Bias/Discrimination');
  const [wSeverity, setWSeverity] = useState<ReportSeverity>('Medium');
  const [wSource, setWSource] = useState<Source>('Anonymous');
  const [wDesc, setWDesc] = useState('');
  const [wSystem, setWSystem] = useState('');
  const [wInvestigator, setWInvestigator] = useState('David Kim');

  if (isLoading) return <PageSkeleton title="Ethics Reporting" />;

  const filtered = useMemo(() => reports.filter(r =>
    !search || r.category.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())
  ), [reports, search]);

  const total = reports.length;
  const open = reports.filter(r => r.status === 'Open').length;
  const investigating = reports.filter(r => r.status === 'Under Investigation').length;
  const resolved = reports.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;

  async function deleteReport(id: string) {
    try {
      await remove(id);
    } catch {
      const report = reports.find(r => r.id === id);
      if (report) toast.success(`Report "${report.id}" removed`);
      setReports(prev => prev.filter(r => r.id !== id));
    }
  }

  async function submitCreate() {
    const newReport = {
      date: new Date().toISOString().split('T')[0],
      category: wCategory,
      severity: wSeverity,
      source: wSource,
      status: 'Open',
      assigned_investigator: wInvestigator,
      priority: wSeverity === 'Critical' || wSeverity === 'High' ? 'High' : wSeverity === 'Medium' ? 'Medium' : 'Low',
      description: wDesc || 'No description provided.',
      system: wSystem || undefined,
    };
    try {
      await save(newReport);
    } catch {
      toast.success('Ethics report submitted');
    }
    setCreateOpen(false);
    setWDesc(''); setWSystem('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Ethics & Whistleblower Reporting</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Anonymous AI ethics reporting channel — EU AI Act Art.83 + corporate governance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => {
            if (!filtered.length) return;
            const keys = Object.keys(filtered[0]);
            const csv = [keys.join(','), ...filtered.map((r: any) => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ethics-reports.csv'; a.click();
          }}>
            Export CSV
          </Button>
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => window.open('/ethics-reporting/submit', '_blank')}>
            <ArrowSquareOut size={14} className="mr-1.5" /> Public Form
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
            <UserCircleCheck size={15} className="mr-1.5" /> Log Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Total Reports" value={total} variant="default" />
        <MetricTile label="Open" value={open} variant="warn" />
        <MetricTile label="Under Investigation" value={investigating} variant="info" />
        <MetricTile label="Resolved" value={resolved} variant="ok" />
      </div>

      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent" style={{ color: 'hsl(var(--text-1))' }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['Report ID', 'Date', 'Category', 'Severity', 'Source', 'Status', 'Investigator', 'Priority', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cc = categoryColor(r.category);
                  const sc = severityColor(r.severity);
                  const stc = statusColor(r.status);
                  return (
                    <tr key={r.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                      onClick={() => { setSelected(r); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{r.id}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.date}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5" style={{ background: cc.bg, color: cc.text, borderRadius: 0 }}>{r.category}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 font-semibold" style={{ background: sc.bg, color: sc.text, borderRadius: 0 }}>{r.severity}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.source}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5" style={{ background: stc.bg, color: stc.text, borderRadius: 0 }}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.assignedInvestigator}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: r.priority === 'High' ? 'hsl(var(--s-er-tx))' : r.priority === 'Medium' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>{r.priority}</td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                            onClick={() => { setSelected(r); setSheetOpen(true); }}>
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
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                <AlertDialogDescription>Delete {r.id}? This action is permanent and cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction style={{ borderRadius: 0 }} onClick={() => deleteReport(r.id)}>Delete</AlertDialogAction>
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
        <SheetContent style={{ width: 580, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  <span className="text-xs px-2 py-0.5" style={{ background: categoryColor(selected.category).bg, color: categoryColor(selected.category).text, borderRadius: 0 }}>{selected.category}</span>
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="report" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="report" style={{ borderRadius: 0 }}>Report</TabsTrigger>
                  <TabsTrigger value="investigation" style={{ borderRadius: 0 }}>Investigation</TabsTrigger>
                  <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Evidence</TabsTrigger>
                  <TabsTrigger value="resolution" style={{ borderRadius: 0 }}>Resolution</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="report" className="mt-4 space-y-3">
                  <div className="p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))', borderRadius: 0 }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                  </div>
                  {[
                    { label: 'Category', value: selected.category },
                    { label: 'Severity', value: selected.severity },
                    { label: 'Source', value: selected.source },
                    { label: 'System Affected', value: selected.system || 'Not specified' },
                    { label: 'Date', value: selected.date },
                    { label: 'Status', value: selected.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                  {selected.source === 'Named (hidden)' && (
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setViewIdentityOpen(true)}>
                      <Eye size={13} className="mr-1.5" /> View Reporter Identity
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="investigation" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selected.assignedInvestigator}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Assigned Investigator</p>
                    </div>
                    <span className="text-xs px-2 py-0.5" style={{ background: statusColor(selected.status).bg, color: statusColor(selected.status).text, borderRadius: 0 }}>{selected.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" style={{ borderRadius: 0 }} className="flex-1">
                      <UserCircleCheck size={13} className="mr-1.5" /> Assign Investigator
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }} className="flex-1">
                      <ShieldWarning size={13} className="mr-1.5" /> Escalate to Board
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Linked evidence files and records.</p>
                  <div className="mt-3 p-3 border" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No evidence attached yet. Upload files or link to model records.</p>
                  </div>
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, marginTop: 12 }}>Upload Evidence</Button>
                </TabsContent>

                <TabsContent value="resolution" className="mt-4 space-y-3">
                  {selected.resolution ? (
                    <div className="p-3 border" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))', borderRadius: 0 }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--s-ok-tx))' }}>Resolution Notes</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.resolution}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Resolution Notes</label>
                      <textarea className="w-full text-sm border p-2 min-h-[80px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }} placeholder="Describe actions taken and outcome..." />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }}>
                      <Link size={13} className="mr-1.5" /> Link to Risk
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }}>
                      <Link size={13} className="mr-1.5" /> Link to Incident
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4 space-y-2">
                  {[
                    { date: selected.date, action: 'Report submitted', user: selected.source },
                    { date: selected.date, action: `Assigned to ${selected.assignedInvestigator}`, user: 'System' },
                    ...(selected.status !== 'Open' ? [{ date: selected.date, action: `Status updated: ${selected.status}`, user: selected.assignedInvestigator }] : []),
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

      {/* View Identity Dialog */}
      <Dialog open={viewIdentityOpen} onOpenChange={setViewIdentityOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle>View Reporter Identity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 border" style={{ borderColor: 'hsl(var(--s-wn-br))', background: 'hsl(var(--s-wn-bg))', borderRadius: 0 }}>
              <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>⚠ Accessing reporter identity will be logged in the audit trail. Provide a reason.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Reason for access *</label>
              <textarea className="w-full text-sm border p-2 min-h-[60px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={viewReason} onChange={e => setViewReason(e.target.value)} placeholder="Required for investigation..." />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setViewIdentityOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={!viewReason.trim()} onClick={() => setViewIdentityOpen(false)}>Access Identity</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Report Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle>Log Ethics Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 border" style={{ borderColor: 'hsl(var(--brand)/30%)', background: 'hsl(var(--brand-subtle))', borderRadius: 0 }}>
              <p className="text-xs" style={{ color: 'hsl(var(--brand))' }}>Use this form to log reports received via phone, email or in person. For self-submission, share the Public Form link.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Category *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wCategory} onChange={e => setWCategory(e.target.value as ReportCategory)}>
                {REPORT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Severity *</label>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High', 'Critical'] as ReportSeverity[]).map(s => (
                  <button key={s} onClick={() => setWSeverity(s)}
                    className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wSeverity === s ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wSeverity === s ? 'hsl(var(--brand-subtle))' : 'transparent', color: wSeverity === s ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Source</label>
              <div className="flex gap-2">
                {(['Anonymous', 'Named (hidden)'] as Source[]).map(src => (
                  <button key={src} onClick={() => setWSource(src)}
                    className="flex-1 py-1.5 text-xs border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wSource === src ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wSource === src ? 'hsl(var(--brand-subtle))' : 'transparent', color: wSource === src ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {src}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>AI System Affected</label>
                <input type="text" className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  placeholder="e.g. Credit Risk Scorer" value={wSystem} onChange={e => setWSystem(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Assign Investigator *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wInvestigator} onChange={e => setWInvestigator(e.target.value)}>
                  {INVESTIGATORS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Description *</label>
              <textarea className="w-full text-sm border p-2 min-h-[80px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wDesc} onChange={e => setWDesc(e.target.value)} placeholder="Describe the concern in detail..." />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitCreate}>Log Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
