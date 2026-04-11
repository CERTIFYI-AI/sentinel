import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge, Plus, MagnifyingGlass, Funnel, Eye, Export, Trash,
  CheckCircle, Warning, XCircle, Buildings, Timer,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  VENDOR_SLAS, VENDORS, VendorSLA, SLAStatus, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function slaStatusStyle(status: SLAStatus): { bg: string; color: string; label: string; icon: React.ElementType } {
  const map: Record<SLAStatus, { bg: string; color: string; label: string; icon: React.ElementType }> = {
    healthy: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', label: 'Healthy', icon: CheckCircle },
    at_risk: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', label: 'At Risk', icon: Warning },
    breached: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'Breached', icon: XCircle },
    waived: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))', label: 'Waived', icon: CheckCircle },
    retired: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))', label: 'Retired', icon: Timer },
  };
  return map[status] ?? map.healthy;
}

const SLA_TYPES = ['Availability', 'Support Response', 'Incident Notification', 'RTO', 'RPO', 'Review Turnaround', 'DSR Support', 'Custom'] as const;

interface CreateForm {
  vendorId: string;
  serviceName: string;
  slaType: VendorSLA['slaType'];
  target: string;
  warningThreshold: string;
  breachThreshold: string;
  measurementWindow: string;
  owner: string;
  escalationPath: string;
  notes: string;
}

const BLANK_FORM: CreateForm = {
  vendorId: '',
  serviceName: '',
  slaType: 'Availability',
  target: '',
  warningThreshold: '',
  breachThreshold: '',
  measurementWindow: 'Monthly',
  owner: '',
  escalationPath: '',
  notes: '',
};

export default function VendorSLA() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const [slas, setSlas] = useState<VendorSLA[]>(VENDOR_SLAS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [selected, setSelected] = useState<VendorSLA | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorSLA | null>(null);
  const [form, setForm] = useState<CreateForm>(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, text, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const healthy = slas.filter(s => s.status === 'healthy').length;
  const atRisk = slas.filter(s => s.status === 'at_risk').length;
  const breached = slas.filter(s => s.status === 'breached').length;
  const total = slas.filter(s => !['waived', 'retired'].includes(s.status)).length;

  const filtered = slas.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.id.toLowerCase().includes(q) || s.vendorName.toLowerCase().includes(q) || s.serviceName.toLowerCase().includes(q) || s.slaType.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchType = typeFilter === 'all' || s.slaType === typeFilter;
    const matchVendor = vendorFilter === 'all' || s.vendorId === vendorFilter;
    return matchSearch && matchStatus && matchType && matchVendor;
  });

  const activeFilters = [statusFilter !== 'all', typeFilter !== 'all', vendorFilter !== 'all', search !== ''].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setVendorFilter('all');
  }

  function handleCreate() {
    if (!form.vendorId || !form.serviceName || !form.target || !form.owner) {
      setFormError('Vendor, Service Name, Target, and Owner are required.');
      return;
    }
    const vendor = VENDORS.find(v => v.id === form.vendorId);
    if (!vendor) { setFormError('Select a valid vendor.'); return; }
    const newSla: VendorSLA = {
      id: `SLA-${String(slas.length + 1).padStart(3, '0')}`,
      vendorId: form.vendorId,
      vendorName: vendor.name,
      serviceName: form.serviceName,
      slaType: form.slaType,
      target: form.target,
      warningThreshold: form.warningThreshold || 'TBD',
      breachThreshold: form.breachThreshold || 'TBD',
      measurementWindow: form.measurementWindow,
      currentPerformance: 'Monitoring...',
      status: 'healthy',
      owner: form.owner,
      escalationPath: form.escalationPath || form.owner,
      lastMeasuredAt: new Date().toISOString().split('T')[0],
      lastBreachAt: null,
      linkedTickets: [],
      notes: form.notes,
    };
    setSlas(p => [newSla, ...p]);
    setCreateOpen(false);
    setForm(BLANK_FORM);
    setFormError('');
    toast(`${newSla.id} created for ${vendor.name}`);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setSlas(p => p.filter(s => s.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'error');
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) setSelected(null);
  }

  function handleExport() {
    const csv = [
      ['ID', 'Vendor', 'Service', 'Type', 'Target', 'Current', 'Status', 'Owner', 'Last Measured', 'Last Breach'].join(','),
      ...slas.map(s => [s.id, s.vendorName, s.serviceName, s.slaType, s.target, s.currentPerformance, s.status, s.owner, s.lastMeasuredAt, s.lastBreachAt ?? ''].join(',')),
    ].join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    el.download = `vendor-slas-${new Date().toISOString().split('T')[0]}.csv`;
    el.click();
    toast('SLAs exported as CSV');
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Vendor SLA Monitoring</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Service level agreement tracking across all third-party vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus className="h-4 w-4 mr-2" />Add SLA
          </Button>
        </div>
      </div>

      {/* Breached SLAs alert */}
      {breached > 0 && (
        <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}>
          <XCircle size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {breached} SLA{breached > 1 ? 's' : ''} currently breached — immediate escalation required
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>
              {slas.filter(s => s.status === 'breached').map(s => `${s.vendorName} (${s.serviceName})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active SLAs', value: total, color: 'hsl(var(--text-1))', icon: Gauge },
          { label: 'Healthy', value: healthy, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'At Risk', value: atRisk, color: 'hsl(var(--s-wn-tx))', icon: Warning },
          { label: 'Breached', value: breached, color: 'hsl(var(--destructive))', icon: XCircle },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${s.color === 'hsl(var(--destructive))' && s.value > 0 ? 'hsl(0 72% 51% / 0.4)' : 'hsl(var(--border))'}` }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-52 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search SLAs..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0 }} />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <Buildings className="h-3 w-3 mr-1" /><SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Vendors</SelectItem>
            {VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="SLA Type" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Types</SelectItem>
            {SLA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['healthy', 'at_risk', 'breached', 'waived', 'retired'] as SLAStatus[]).map(s => (
              <SelectItem key={s} value={s}>{slaStatusStyle(s).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}>
            Clear filters ({activeFilters})
          </Button>
        )}
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} SLAs</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
              <Gauge size={36} className="mb-2 opacity-40" />
              <p className="text-sm">No SLAs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Vendor', 'Service / Type', 'Target', 'Current', 'Status', 'Owner', 'Last Measured', 'Last Breach', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const ss = slaStatusStyle(s.status);
                    const isBreached = s.status === 'breached';
                    return (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid hsl(var(--border))', background: isBreached ? 'hsl(0 72% 51% / 0.04)' : 'transparent' }}
                        onClick={() => setSelected(s)}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}
                            onClick={e => { e.stopPropagation(); navigate(`/vendors/${s.vendorId}`); }}>
                            {s.vendorName}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.serviceName}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{s.slaType}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{s.target}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold" style={{
                            color: s.status === 'healthy' ? 'hsl(var(--s-ok-tx))' : s.status === 'breached' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))',
                          }}>{s.currentPerformance}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 10 }}>
                            {ss.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.owner}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(s.lastMeasuredAt)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: s.lastBreachAt ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                          {s.lastBreachAt ? formatDate(s.lastBreachAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(s)} aria-label="View SLA">
                              <Eye size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(s)} aria-label="Delete SLA">
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

      {/* SLA Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent style={{ borderRadius: 0, width: 540, maxWidth: '100vw' }} className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selected?.id} — {selected?.serviceName}
            </SheetTitle>
          </SheetHeader>
          {selected && (() => {
            const ss = slaStatusStyle(selected.status);
            return (
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 11 }}>{ss.label}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{selected.slaType}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{selected.measurementWindow}</Badge>
                </div>

                {/* Performance visual */}
                <div className="p-4" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>CURRENT PERFORMANCE</span>
                    <span className="text-sm font-bold" style={{
                      color: selected.status === 'healthy' ? 'hsl(var(--s-ok-tx))' : selected.status === 'breached' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))',
                    }}>{selected.currentPerformance}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                    <div>
                      <p className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>Target</p>
                      <p className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selected.target}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>Warning</p>
                      <p className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selected.warningThreshold}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>Breach</p>
                      <p className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selected.breachThreshold}</p>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Vendor', value: selected.vendorName },
                    { label: 'Owner', value: selected.owner },
                    { label: 'Last Measured', value: formatDate(selected.lastMeasuredAt) },
                    { label: 'Last Breach', value: selected.lastBreachAt ? formatDate(selected.lastBreachAt) : 'None' },
                    { label: 'Linked Tickets', value: selected.linkedTickets.length > 0 ? selected.linkedTickets.join(', ') : 'None' },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.label}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</p>
                    </div>
                  ))}
                </div>

                {/* Escalation */}
                <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>ESCALATION PATH</p>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.escalationPath}</p>
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>NOTES</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => navigate(`/vendors/${selected.vendorId}`)}>
                    <Buildings size={13} className="mr-1" />View Vendor
                  </Button>
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }} onClick={() => { setDeleteTarget(selected); setSelected(null); }}>
                    <Trash size={13} className="mr-1" />Delete SLA
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) { setForm(BLANK_FORM); setFormError(''); } }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Vendor SLA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Vendor *</label>
                <Select value={form.vendorId} onValueChange={v => setForm(p => ({ ...p, vendorId: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>SLA Type *</label>
                <Select value={form.slaType} onValueChange={v => setForm(p => ({ ...p, slaType: v as VendorSLA['slaType'] }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {SLA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Service Name *</label>
              <Input value={form.serviceName} onChange={e => setForm(p => ({ ...p, serviceName: e.target.value }))} placeholder="e.g. GPT-4o API, S3 Storage" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target *</label>
                <Input value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} placeholder="e.g. 99.9%" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Warning Threshold</label>
                <Input value={form.warningThreshold} onChange={e => setForm(p => ({ ...p, warningThreshold: e.target.value }))} placeholder="e.g. 99.5%" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Breach Threshold</label>
                <Input value={form.breachThreshold} onChange={e => setForm(p => ({ ...p, breachThreshold: e.target.value }))} placeholder="e.g. 99.0%" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
                <Input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="SLA owner" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Measurement Window</label>
                <Select value={form.measurementWindow} onValueChange={v => setForm(p => ({ ...p, measurementWindow: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Monthly', 'Weekly', 'Per Incident', 'Per Batch', 'Per DSR', 'Quarterly'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Escalation Path</label>
              <Input value={form.escalationPath} onChange={e => setForm(p => ({ ...p, escalationPath: e.target.value }))} placeholder="e.g. Owner → VP → CISO" style={{ borderRadius: 0 }} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(BLANK_FORM); setFormError(''); }} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button onClick={handleCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Add SLA</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.id}?`}
        description={`This will delete the ${deleteTarget?.slaType} SLA for ${deleteTarget?.vendorName} (${deleteTarget?.serviceName}).`}
        confirmLabel="Delete SLA"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
