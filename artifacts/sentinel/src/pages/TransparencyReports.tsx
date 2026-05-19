import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, MagnifyingGlass, ArrowRight, DownloadSimple, Globe,
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

type ReportType = 'System Transparency Art.13' | 'User Notification Art.52' | 'GPAI Disclosure Art.53' | 'Annual Summary';
type ReportStatus = 'Published' | 'Draft' | 'Overdue';
type Audience = 'Public/Regulators' | 'End Users' | 'Public' | 'Applicants/Regulators';

interface TransparencyReport {
  id: string;
  system: string;
  type: ReportType;
  version: string;
  audience: Audience;
  publishedDate: string;
  status: ReportStatus;
  url?: string;
}

const SEED: TransparencyReport[] = [
  { id: 'TR-001', system: 'Credit Risk Scorer', type: 'System Transparency Art.13', version: 'v2.0', audience: 'Public/Regulators', publishedDate: '2026-01-15', status: 'Published', url: 'https://sentinel.example.com/reports/tr-001' },
  { id: 'TR-002', system: 'Loan Approval Assistant', type: 'User Notification Art.52', version: 'v1.0', audience: 'End Users', publishedDate: '2026-02-01', status: 'Published' },
  { id: 'TR-003', system: 'HR Screening System', type: 'System Transparency Art.13', version: 'v1.0', audience: 'Applicants/Regulators', publishedDate: '', status: 'Draft' },
  { id: 'TR-004', system: 'Customer Service Chatbot', type: 'User Notification Art.52', version: 'v1.1', audience: 'End Users', publishedDate: '2026-01-01', status: 'Published' },
  { id: 'TR-005', system: 'Loan Approval Assistant', type: 'GPAI Disclosure Art.53', version: 'v1.0', audience: 'Public', publishedDate: '', status: 'Overdue' },
];

const REPORT_TYPES: ReportType[] = ['System Transparency Art.13', 'User Notification Art.52', 'GPAI Disclosure Art.53', 'Annual Summary'];
const AUDIENCES = ['Public/Regulators', 'End Users', 'Public', 'Applicants/Regulators', 'DPA'];

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

function statusColor(s: ReportStatus) {
  switch (s) {
    case 'Published': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Draft': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    case 'Overdue': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  }
}

const ART13_SECTIONS = [
  { key: 'provider', label: 'Provider identity + contact' },
  { key: 'purpose', label: 'Intended purpose' },
  { key: 'risk', label: 'Risk classification' },
  { key: 'oversight', label: 'Human oversight measures' },
  { key: 'training', label: 'Training data description' },
  { key: 'performance', label: 'Performance metrics' },
  { key: 'limitations', label: 'Known limitations + prohibited uses' },
];

const ART52_SECTIONS = [
  { key: 'disclosure', label: '"This system uses AI" disclosure template' },
  { key: 'nature', label: 'Nature and purpose' },
  { key: 'contact', label: 'Contact for explanations' },
  { key: 'rights', label: 'Right to explanation notice' },
];

const ART53_SECTIONS = [
  { key: 'arch', label: 'Model architecture summary' },
  { key: 'data', label: 'Training data summary' },
  { key: 'compute', label: 'Compute resources' },
  { key: 'safety', label: 'Safety evaluations' },
  { key: 'policy', label: 'EU policy compliance measures' },
];

function getSections(type: ReportType) {
  if (type === 'System Transparency Art.13') return ART13_SECTIONS;
  if (type === 'User Notification Art.52') return ART52_SECTIONS;
  if (type === 'GPAI Disclosure Art.53') return ART53_SECTIONS;
  return ART13_SECTIONS;
}

export default function TransparencyReports() {
  const [items, setItems] = useState<TransparencyReport[]>(SEED);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState<TransparencyReport | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [wSystem, setWSystem] = useState('');
  const [wType, setWType] = useState<ReportType>('System Transparency Art.13');
  const [wAudience, setWAudience] = useState('Public/Regulators');
  const [wVersion, setWVersion] = useState('v1.0');
  const [wEffectiveDate, setWEffectiveDate] = useState('');
  const [wSections, setWSections] = useState<Record<string, string>>({});

  const filtered = useMemo(() => items.filter(i => {
    const matchSearch = !search || i.system.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || (activeTab === 'art13' && i.type === 'System Transparency Art.13') ||
      (activeTab === 'art52' && i.type === 'User Notification Art.52') ||
      (activeTab === 'art53' && i.type === 'GPAI Disclosure Art.53') ||
      (activeTab === 'annual' && i.type === 'Annual Summary');
    return matchSearch && matchTab;
  }), [items, search, activeTab]);

  const total = items.length;
  const published = items.filter(i => i.status === 'Published').length;
  const draft = items.filter(i => i.status === 'Draft').length;
  const overdue = items.filter(i => i.status === 'Overdue').length;

  function submitWizard() {
    const newReport: TransparencyReport = {
      id: `TR-${String(items.length + 1).padStart(3, '0')}`,
      system: wSystem || 'Unnamed System',
      type: wType,
      version: wVersion,
      audience: wAudience as Audience,
      publishedDate: '',
      status: 'Draft',
    };
    setItems(prev => [newReport, ...prev]);
    toast.success(`Transparency report "${newReport.id}" created`);
    setWizardOpen(false);
    setWSystem(''); setWType('System Transparency Art.13'); setWAudience('Public/Regulators'); setWSections({});
  }

  function deleteItem(id: string) {
    const item = items.find(i => i.id === id);
    if (item) toast.success(`Report "${item.id}" deleted`);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const sections = getSections(wType);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>AI Transparency Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Public transparency disclosures per EU AI Act Articles 13 and 52</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Total Reports" value={total} variant="default" />
        <MetricTile label="Published" value={published} variant="ok" />
        <MetricTile label="Draft" value={draft} variant="warn" />
        <MetricTile label="Overdue" value={overdue} variant="error" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'art13', label: 'System Transparency (Art.13)' },
          { key: 'art52', label: 'User Notification (Art.52)' },
          { key: 'art53', label: 'GPAI Disclosure (Art.53)' },
          { key: 'annual', label: 'Annual Summary' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-xs font-medium border-b-2 transition-colors"
            style={{ borderColor: activeTab === tab.key ? 'hsl(var(--brand))' : 'transparent', color: activeTab === tab.key ? 'hsl(var(--brand))' : 'hsl(var(--text-4))', borderRadius: 0 }}>
            {tab.label}
          </button>
        ))}
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
                  {['TR ID', 'System', 'Type', 'Version', 'Audience', 'Published Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const sc = statusColor(item.status);
                  return (
                    <tr key={item.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                      onClick={() => { setSelected(item); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{item.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.system}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.type}</td>
                      <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.version}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.audience}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.publishedDate || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 font-medium" style={{ background: sc.bg, color: sc.text, borderRadius: 0 }}>{item.status}</span>
                      </td>
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
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
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
                  <TabsTrigger value="content" style={{ borderRadius: 0 }}>Content</TabsTrigger>
                  <TabsTrigger value="publication" style={{ borderRadius: 0 }}>Publication</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  {[
                    { label: 'System', value: selected.system },
                    { label: 'Report Type', value: selected.type },
                    { label: 'Version', value: selected.version },
                    { label: 'Audience', value: selected.audience },
                    { label: 'Published', value: selected.publishedDate || 'Not yet published' },
                    { label: 'Status', value: selected.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="content" className="mt-4 space-y-3">
                  {getSections(selected.type).map(sec => (
                    <div key={sec.key} className="space-y-1">
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>{sec.label}</p>
                      <div className="p-2 border text-xs" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))', borderRadius: 0 }}>
                        [Auto-filled from model card or enter manually]
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="publication" className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Published URL</label>
                    <Input style={{ borderRadius: 0 }} defaultValue={selected.url || ''} placeholder="https://..." />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" style={{ borderRadius: 0 }} className="flex-1">
                      <DownloadSimple size={13} className="mr-1.5" /> Download PDF
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }} className="flex-1">
                      <Globe size={13} className="mr-1.5" /> Submit to EU AI Office
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4 space-y-2">
                  {[
                    { date: '2026-01-01', action: 'Report created', user: 'System' },
                    ...(selected.status === 'Published' ? [{ date: selected.publishedDate, action: 'Report published', user: 'James Patel' }] : []),
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

      {/* Generate Report Modal */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 620 }}>
          <DialogHeader>
            <DialogTitle>Generate Transparency Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>System *</label>
                <Input style={{ borderRadius: 0 }} value={wSystem} onChange={e => setWSystem(e.target.value)} placeholder="e.g. Credit Risk Scorer" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Report Type *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wType} onChange={e => setWType(e.target.value as ReportType)}>
                  {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Target Audience *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wAudience} onChange={e => setWAudience(e.target.value)}>
                  {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Version</label>
                <Input style={{ borderRadius: 0 }} value={wVersion} onChange={e => setWVersion(e.target.value)} placeholder="v1.0" />
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Report Sections — {wType}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sections.map(sec => (
                  <div key={sec.key} className="space-y-0.5">
                    <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>{sec.label}</label>
                    <div className="flex gap-2">
                      <textarea className="flex-1 text-xs border p-1.5 min-h-[40px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                        value={wSections[sec.key] || ''} onChange={e => setWSections(prev => ({ ...prev, [sec.key]: e.target.value }))} />
                      <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11 }} onClick={() => setWSections(prev => ({ ...prev, [sec.key]: '[Auto-filled from model card]' }))}>
                        Auto-fill
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setWizardOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitWizard}>Generate Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
