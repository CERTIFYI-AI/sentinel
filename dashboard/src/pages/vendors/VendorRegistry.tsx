import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Buildings, MagnifyingGlass, Funnel,
  Warning, CheckCircle, ShieldWarning, Export, Handshake, Globe,
  CloudArrowUp, Siren, ChartPie, ClipboardText,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import {
  VENDORS, Vendor, MODELS, severityColor, statusColor, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function tierColor(risk: Vendor['risk']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', label: 'Tier 1' },
    high: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', label: 'Tier 1' },
    medium: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Tier 2' },
    low: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))', label: 'Tier 3' },
  };
  return map[risk] ?? map.medium;
}

function dpaStatusBadge(dpa: string) {
  const sc = statusColor(dpa === 'signed' ? 'signed' : dpa === 'pending' ? 'pending' : 'not_signed');
  const label = dpa === 'signed' ? 'DPA Signed' : dpa === 'pending' ? 'DPA Pending' : 'DPA Not Signed';
  return <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>{label}</Badge>;
}

function scoreProgressColor(score: number): string {
  if (score >= 80) return 'hsl(var(--s-ok-tx))';
  if (score >= 60) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

// ── Concentration Risk Data ───────────────────────────────────────────────────

const CONCENTRATION_DATA: { vendor: string; pct: number; color: string }[] = [
  { vendor: 'OpenAI', pct: 45, color: 'hsl(220 90% 56%)' },
  { vendor: 'Anthropic', pct: 30, color: 'hsl(280 67% 56%)' },
  { vendor: 'Internal', pct: 25, color: 'hsl(142 71% 45%)' },
];

const CONCENTRATION_THRESHOLD = 40;

// ── Security Questionnaire Data ──────────────────────────────────────────────

type VSQStatus = 'Complete' | 'In Progress' | 'Overdue' | 'Not Started';

interface VSQEntry { vendorId: string; status: VSQStatus; dueDate: string }

const VSQ_DATA: VSQEntry[] = [
  { vendorId: 'V-001', status: 'Complete', dueDate: '2026-02-15' },
  { vendorId: 'V-002', status: 'In Progress', dueDate: '2026-04-30' },
  { vendorId: 'V-003', status: 'Overdue', dueDate: '2026-03-01' },
  { vendorId: 'V-004', status: 'Not Started', dueDate: '2026-05-15' },
  { vendorId: 'V-005', status: 'Complete', dueDate: '2026-01-20' },
  { vendorId: 'V-006', status: 'In Progress', dueDate: '2026-06-01' },
];

function vsqStatusStyle(status: VSQStatus): { bg: string; color: string } {
  switch (status) {
    case 'Complete': return { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' };
    case 'In Progress': return { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' };
    case 'Overdue': return { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' };
    case 'Not Started': return { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VendorRegistry() {
  const { orgName } = useSettingsStore();
  const [vendors, setVendors] = useState<Vendor[]>(VENDORS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const totalVendors = vendors.length;
  const approved = vendors.filter(v => v.status === 'approved').length;
  const inReview = vendors.filter(v => v.status === 'in_review').length;
  const highRiskDpa = vendors.filter(v => v.status === 'high_risk' || v.dpaStatus === 'not_signed').length;

  // DPA warning vendors
  const dpaWarningVendors = vendors.filter(v => v.dpaStatus === 'not_signed');

  // Filters
  const filtered = vendors.filter(v => {
    const matchSearch = v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    setVendors(prev => prev.filter(v => v.id !== deleteTarget.id));
    toast(`${deleteTarget.id} ${deleteTarget.name} removed`, 'error');
    setDeleteTarget(null);
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Category', 'Risk', 'Score', 'DPA Status', 'Review Status', 'Last Review'].join(','),
      ...vendors.map(v => [v.id, v.name, v.category, v.risk, v.score, v.dpaStatus, v.status, v.lastReview].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `vendor-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('Vendor registry exported as CSV');
  };

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Registry</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Third-party AI vendor management & risk assessment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus className="h-4 w-4 mr-2" />Add Vendor
          </Button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vendors', value: totalVendors, color: 'hsl(var(--text-1))', icon: Buildings },
          { label: 'Approved', value: approved, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'In Review', value: inReview, color: 'hsl(var(--s-wn-tx))', icon: Warning },
          { label: 'High Risk / DPA Gap', value: highRiskDpa, color: 'hsl(var(--destructive))', icon: ShieldWarning },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DPA Warning */}
      {dpaWarningVendors.length > 0 && (
        <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}>
          <Siren size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {dpaWarningVendors.length} vendor{dpaWarningVendors.length > 1 ? 's' : ''} processing EU customer data without signed DPA — GDPR Art.28 violation
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>
              {dpaWarningVendors.map(v => v.name).join(', ')} require{dpaWarningVendors.length === 1 ? 's' : ''} immediate DPA execution.
            </p>
          </div>
        </div>
      )}

      {/* Concentration Risk */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChartPie size={16} style={{ color: 'hsl(var(--brand))' }} />
            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Concentration Risk</span>
          </div>
          {CONCENTRATION_DATA.some(d => d.pct > CONCENTRATION_THRESHOLD) && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
              <Warning size={12} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
              <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                <strong>Warning:</strong> {CONCENTRATION_DATA.filter(d => d.pct > CONCENTRATION_THRESHOLD).map(d => d.vendor).join(', ')} exceed{CONCENTRATION_DATA.filter(d => d.pct > CONCENTRATION_THRESHOLD).length === 1 ? 's' : ''} {CONCENTRATION_THRESHOLD}% dependency threshold
              </p>
            </div>
          )}
          <div className="space-y-2">
            {CONCENTRATION_DATA.map(d => (
              <div key={d.vendor} className="flex items-center gap-3">
                <span className="text-xs w-20 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.vendor}</span>
                <div className="flex-1 h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                  <div className="h-full" style={{ width: `${d.pct}%`, background: d.color, borderRadius: 0 }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: d.pct > CONCENTRATION_THRESHOLD ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                  {d.pct}%
                </span>
                {d.pct > CONCENTRATION_THRESHOLD && (
                  <Warning size={12} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-52 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {['approved', 'in_review', 'high_risk', 'blocked'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} vendors</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Buildings size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No vendors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Vendor', 'Category', 'Risk Tier', 'Score', 'DPA Status', 'VSQ Status', 'Review Status', 'Assignee', 'Last Review', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => {
                    const tc = tierColor(v.risk);
                    const stc = statusColor(v.status);
                    return (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors"
                        style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{v.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.category}</td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: tc.bg, color: tc.color, borderRadius: 0, fontSize: 10 }}>
                            {tc.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className="text-xs font-bold" style={{ color: scoreProgressColor(v.score), minWidth: 28 }}>{v.score}</span>
                            <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--border))' }}>
                              <div className="h-full transition-all" style={{ width: `${v.score}%`, background: scoreProgressColor(v.score) }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{dpaStatusBadge(v.dpaStatus)}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const vsq = VSQ_DATA.find(q => q.vendorId === v.id);
                            if (!vsq) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>--</span>;
                            const st = vsqStatusStyle(vsq.status);
                            return (
                              <div className="flex flex-col gap-0.5">
                                <Badge style={{ background: st.bg, color: st.color, borderRadius: 0, fontSize: 10 }}>
                                  <ClipboardText size={10} weight="fill" className="mr-1 inline" />{vsq.status}
                                </Badge>
                                <span className="text-xs" style={{ color: vsq.status === 'Overdue' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))', fontSize: 9 }}>
                                  Due: {formatDate(vsq.dueDate)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: stc.bg, color: stc.text, borderRadius: 0, fontSize: 10 }}>
                            {v.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                          {v.contact ? v.contact.split('@')[0] : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(v.lastReview)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setSelectedVendor(v); setDetailTab('overview'); }}>
                              <Eye size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setEditVendor(v)}>
                              <PencilSimple size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setDeleteTarget(v)}>
                              <Trash size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description={`This will remove ${deleteTarget?.id} from the vendor registry. This action cannot be undone.`}
        confirmLabel="Delete Vendor"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Vendor Detail Sheet */}
      <Sheet open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selectedVendor?.name} <span className="text-xs font-mono font-normal" style={{ color: 'hsl(var(--text-4))' }}>{selectedVendor?.id}</span>
            </SheetTitle>
          </SheetHeader>
          {selectedVendor && (
            <div className="mt-4 overflow-y-auto h-[calc(100vh-120px)]">
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="scorecard" style={{ borderRadius: 0 }}>Scorecard</TabsTrigger>
                  <TabsTrigger value="linked" style={{ borderRadius: 0 }}>Linked Models</TabsTrigger>
                  <TabsTrigger value="history" style={{ borderRadius: 0 }}>Review History</TabsTrigger>
                  <TabsTrigger value="dpa" style={{ borderRadius: 0 }}>DPA Status</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {(() => { const tc = tierColor(selectedVendor.risk); return <Badge style={{ background: tc.bg, color: tc.color, borderRadius: 0, fontSize: 10 }}>{tc.label} — {selectedVendor.risk}</Badge>; })()}
                    <Badge style={{ ...statusColor(selectedVendor.status), borderRadius: 0, fontSize: 10 }}>{selectedVendor.status.replace('_', ' ')}</Badge>
                    {dpaStatusBadge(selectedVendor.dpaStatus)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Description</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVendor.description}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Category</p><p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedVendor.category}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Website</p><p className="mt-1 font-mono" style={{ color: 'hsl(var(--brand))' }}>{selectedVendor.website}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Contact</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVendor.contact}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Overall Score</p><p className="mt-1 text-lg font-bold" style={{ color: scoreProgressColor(selectedVendor.score) }}>{selectedVendor.score}/100</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Last Review</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedVendor.lastReview)}</p></div>
                  </div>
                </TabsContent>

                {/* Scorecard */}
                <TabsContent value="scorecard" className="mt-4 space-y-4">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Risk Scorecard</p>
                  {[
                    { label: 'Data Sensitivity', value: selectedVendor.scoreBreakdown.dataPrivacy },
                    { label: 'Business Criticality', value: selectedVendor.scoreBreakdown.reliability },
                    { label: 'Past Incidents', value: 100 - (selectedVendor.risk === 'high' ? 40 : selectedVendor.risk === 'medium' ? 20 : 10) },
                    { label: 'Regulatory Exposure', value: selectedVendor.scoreBreakdown.compliance },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{item.label}</span>
                        <span className="text-xs font-bold" style={{ color: scoreProgressColor(item.value) }}>{item.value}/100</span>
                      </div>
                      <div className="h-2" style={{ background: 'hsl(var(--border))' }}>
                        <div className="h-full transition-all" style={{ width: `${item.value}%`, background: scoreProgressColor(item.value) }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Security</p>
                      <span className="text-sm font-bold" style={{ color: scoreProgressColor(selectedVendor.scoreBreakdown.security) }}>{selectedVendor.scoreBreakdown.security}/100</span>
                    </div>
                    <div className="mt-1 h-2" style={{ background: 'hsl(var(--border))' }}>
                      <div className="h-full" style={{ width: `${selectedVendor.scoreBreakdown.security}%`, background: scoreProgressColor(selectedVendor.scoreBreakdown.security) }} />
                    </div>
                  </div>
                </TabsContent>

                {/* Linked Models */}
                <TabsContent value="linked" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</p>
                  {selectedVendor.linkedModels.length === 0 ? (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No linked models</p>
                  ) : (
                    selectedVendor.linkedModels.map(modelId => {
                      const model = MODELS.find(m => m.id === modelId);
                      return model ? (
                        <div key={modelId} className="p-3 flex items-center justify-between" style={{ border: '1px solid hsl(var(--border))' }}>
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{model.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{model.id} · {model.version}</p>
                          </div>
                          <Badge style={{ ...statusColor(model.status), borderRadius: 0, fontSize: 10 }}>{model.status}</Badge>
                        </div>
                      ) : (
                        <p key={modelId} className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{modelId} — not found</p>
                      );
                    })
                  )}
                </TabsContent>

                {/* Review History */}
                <TabsContent value="history" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Review History</p>
                  {[
                    { date: selectedVendor.lastReview, reviewer: 'David Kim', result: selectedVendor.status === 'approved' ? 'Approved' : 'In Review', notes: 'Annual vendor review completed.' },
                    { date: '2025-10-15', reviewer: 'James Patel', result: 'Approved', notes: 'Initial vendor onboarding review.' },
                  ].map((review, idx) => (
                    <div key={idx} className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(review.date)}</p>
                        <Badge style={{
                          background: review.result === 'Approved' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(45 93% 47% / 0.15)',
                          color: review.result === 'Approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>{review.result}</Badge>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Reviewer: {review.reviewer}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{review.notes}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* DPA Status */}
                <TabsContent value="dpa" className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>DPA Status:</p>
                    {dpaStatusBadge(selectedVendor.dpaStatus)}
                  </div>

                  {selectedVendor.dpaStatus === 'signed' && (
                    <div className="p-3" style={{ border: '1px solid hsl(142 71% 45% / 0.3)', background: 'hsl(142 71% 45% / 0.05)' }}>
                      <p className="text-xs font-medium text-green-600 dark:text-green-400">Data Processing Agreement signed and active</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Signed: {formatDate(selectedVendor.lastReview)} · Valid for 12 months</p>
                    </div>
                  )}

                  {selectedVendor.dpaStatus !== 'signed' && (
                    <>
                      <div className="p-3" style={{ border: '1px solid hsl(0 72% 51% / 0.3)', background: 'hsl(0 72% 51% / 0.05)' }}>
                        <p className="text-xs font-medium text-destructive">
                          {selectedVendor.dpaStatus === 'pending' ? 'DPA pending signature' : 'No DPA on file — GDPR Art. 28 violation'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                          A Data Processing Agreement is required before this vendor can process EU customer data.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                          onClick={() => toast('DPA request sent to ' + selectedVendor.contact, 'info')}>
                          <Handshake size={14} className="mr-1" />Request DPA
                        </Button>
                        <Button size="sm" variant="outline" style={{ borderRadius: 0 }}>
                          <CloudArrowUp size={14} className="mr-1" />Upload Document
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editVendor} onOpenChange={() => setEditVendor(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Edit {editVendor?.name}</DialogTitle>
          </DialogHeader>
          {editVendor && (
            <EditVendorForm
              vendor={editVendor}
              onSave={(updated) => {
                setVendors(prev => prev.map(v => v.id === updated.id ? updated : v));
                toast(`${updated.id} updated`);
                setEditVendor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <AddVendorForm
            onSubmit={(newVendor) => {
              setVendors(prev => [...prev, newVendor]);
              toast(`${newVendor.id} ${newVendor.name} added`);
              setAddOpen(false);
            }}
            nextId={`V-${String(vendors.length + 1).padStart(3, '0')}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Edit Form ─────────────────────────────────────────────────────────────────

function EditVendorForm({ vendor, onSave }: { vendor: Vendor; onSave: (v: Vendor) => void }) {
  const [name, setName] = useState(vendor.name);
  const [category, setCategory] = useState(vendor.category);
  const [status, setStatus] = useState(vendor.status);
  const [contact, setContact] = useState(vendor.contact);

  return (
    <div className="space-y-3 py-2">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Category</label>
        <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Contact</label>
        <Input value={contact} onChange={e => setContact(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</label>
        <Select value={status} onValueChange={v => setStatus(v as Vendor['status'])}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['approved', 'in_review', 'high_risk', 'blocked'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({ ...vendor, name, category, status, contact })}
          style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Add Vendor Form ───────────────────────────────────────────────────────────

function AddVendorForm({ onSubmit, nextId }: { onSubmit: (v: Vendor) => void; nextId: string }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [contact, setContact] = useState('');
  const [assignee, setAssignee] = useState('');
  const [whatProvides, setWhatProvides] = useState('');
  const [riskTier, setRiskTier] = useState<Vendor['risk']>('medium');
  const [dpaStatus, setDpaStatus] = useState('pending');

  const canSubmit = name && category && assignee && whatProvides;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString().split('T')[0];
    onSubmit({
      id: nextId, name, category, risk: riskTier, score: 50, status: 'in_review',
      lastReview: now, contact, website, dpaStatus, description: whatProvides,
      linkedModels: [], scoreBreakdown: { security: 50, compliance: 50, reliability: 50, dataPrivacy: 50 },
    });
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Vendor name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Category *</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['Foundation Model', 'Infrastructure', 'Data Provider', 'Tool Provider', 'Analytics Platform', 'AI Platform', 'Consulting'].map(c =>
                <SelectItem key={c} value={c}>{c}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Website</label>
          <Input value={website} onChange={e => setWebsite(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="vendor.com" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Contact</label>
          <Input value={contact} onChange={e => setContact(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="email@vendor.com" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Assignee *</label>
        <Input value={assignee} onChange={e => setAssignee(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Internal reviewer" />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>What does this vendor provide? *</label>
        <textarea value={whatProvides} onChange={e => setWhatProvides(e.target.value)}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe what this vendor provides..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Risk Tier</label>
          <Select value={riskTier} onValueChange={v => setRiskTier(v as Vendor['risk'])}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['low', 'medium', 'high', 'critical'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>DPA Status</label>
          <Select value={dpaStatus} onValueChange={setDpaStatus}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['signed', 'pending', 'not_signed'].map(d => <SelectItem key={d} value={d}>{d.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? '#fff' : undefined }}>
          <Plus size={14} className="mr-1" />Add Vendor
        </Button>
      </div>
    </div>
  );
}
