// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Scan, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, Play, Clock, CheckCircle, XCircle, CalendarBlank,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useScans, useVulns } from '../../hooks/useSecurityGroup';
import type { ScanRecord } from '../../services/securityGroupService';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { exportCsv } from '../../lib/exportUtils';


function statusStyle(status: string) {
  switch (status) {
    case 'completed': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'running': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'scheduled': return { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' };
    case 'failed': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function statusIcon(status: string) {
  if (status === 'completed') return <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  if (status === 'running') return <Play size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />;
  if (status === 'scheduled') return <CalendarBlank size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />;
  return <XCircle size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />;
}

type ScanForm = {
  title: string; scanType: string; target: string; status: string; severity: string;
  schedule: string; initiatedBy: string;
};
// Canonical scan_type vocabulary (matches the security_scans seeds); display
// labels are prettified in the selects and derived lists.
const SCAN_TYPES = ['llm_probe', 'sca', 'dlp', 'asm', 'dast', 'sast', 'config'];
const SCAN_TYPE_LABELS: Record<string, string> = {
  llm_probe: 'LLM probe', sca: 'SCA', dlp: 'DLP', asm: 'ASM',
  dast: 'DAST', sast: 'SAST', config: 'Configuration',
};
const scanTypeLabel = (t?: string) => (t ? SCAN_TYPE_LABELS[t] ?? t : '—');
const SCHEDULES = ['daily', 'weekly', 'monthly', 'manual'];
const scheduleLabel = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const EMPTY_SCAN: ScanForm = {
  title: '', scanType: 'dast', target: '', status: 'scheduled',
  severity: 'medium', schedule: 'weekly', initiatedBy: '',
};

const SLA_DAYS: Record<string, number> = { critical: 14, high: 30, medium: 60, low: 90 };

export default function ScanCenter() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const { items: scans, isLoading: scansLoading, error: scansError, save, remove, isSaving } = useScans();
  const { items: vulns, isLoading: vulnsLoading, error: vulnsError } = useVulns();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [viewItem, setViewItem] = useState<ScanRecord | null>(null);
  const [editItem, setEditItem] = useState<ScanRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<ScanRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ScanForm>(EMPTY_SCAN);

  if (scansLoading || vulnsLoading) return <PageSkeleton title="Scan Center" showStats rows={6} />;

  const filtered = scans.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.title ?? '').toLowerCase().includes(q) || (s.target ?? '').toLowerCase().includes(q) || (s.scanType ?? '').toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || s.status === filterStatus;
    const matchType = filterType === 'all' || s.scanType === filterType;
    return matchSearch && matchStat && matchType;
  });

  const typeData = Array.from(
    scans.reduce((acc, s) => {
      const key = s.scanType || 'other';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([key, count]) => ({ name: scanTypeLabel(key), count }));

  const stats = [
    { label: 'Total Scans', value: scans.length, icon: Scan },
    { label: 'Running', value: scans.filter(s => s.status === 'running').length, icon: Play },
    { label: 'Scheduled', value: scans.filter(s => s.status === 'scheduled').length, icon: Clock },
    { label: 'Total Findings', value: scans.reduce((sum, s) => sum + (s.findingsCount || 0), 0), icon: XCircle },
  ];

  const scanTypes = Array.from(new Set(scans.map(s => s.scanType).filter(Boolean) as string[]));

  // Aggregated risk trends + SLA queue from real vulnerabilities
  // (canonical statuses: resolved and false_positive are not active)
  const activeVulns = vulns.filter(v => v.status !== 'resolved' && v.status !== 'false_positive');
  const sevCount = (sev: string) => activeVulns.filter(v => (v.severity || '').toLowerCase() === sev).length;
  const criticalCount = sevCount('critical');
  const highCount = sevCount('high');
  const mediumCount = sevCount('medium');
  const lowCount = sevCount('low');

  const today = new Date();
  const slaQueue = activeVulns
    .filter(v => v.discoveredAt)
    .map(v => {
      const discoveredDate = new Date(v.discoveredAt as string);
      const slaDays = SLA_DAYS[(v.severity || 'medium').toLowerCase()] || 60;
      const deadline = new Date(discoveredDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...v,
        deadline: deadline.toISOString().split('T')[0],
        daysRemaining: diffDays,
        isOverdue: diffDays < 0,
        overdueText: diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d left`,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  async function handleCreate() {
    if (!formData.title.trim()) { toast.error('Scan name is required'); return; }
    try {
      await save({ ...formData });
      setCreateOpen(false);
      setFormData(EMPTY_SCAN);
    } catch { /* hook toasts error */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try {
      await save(editItem);
      setEditItem(null);
    } catch { /* hook toasts error */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try {
      await remove(deleteItem.id);
      setDeleteItem(null);
    } catch { /* hook toasts error */ }
  }

  async function handleRun(scan: ScanRecord) {
    try {
      await save({ ...scan, status: 'running', startedAt: new Date().toISOString() });
    } catch { /* hook toasts error */ }
  }

  function handleExport() {
    if (filtered.length === 0) { toast.error('No scans to export'); return; }
    exportCsv(filtered as unknown as Record<string, unknown>[], 'security-scans.csv');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Center"
        subtitle={`${orgName} — Security scan management, scheduling & results`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Scans' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} /> Export</Button>
            <Button size="sm" onClick={() => { setFormData(EMPTY_SCAN); setCreateOpen(true); }}>
              <Plus size={14} /> New Scan
            </Button>
          </div>
        }
      />

      {(scansError || vulnsError) && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load scan data</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{((scansError || vulnsError) as Error).message}</p>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Security Dashboard</TabsTrigger>
          <TabsTrigger value="scans" style={{ borderRadius: 0 }}>Scan Scheduler & History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Aggregated Risk Trends — real active vulnerabilities */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Aggregated Risk Trends</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Critical Severity', value: criticalCount, border: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 8%)', text: 'hsl(var(--destructive))' },
                { label: 'High Severity', value: highCount, border: 'hsl(var(--s-wn-tx))', bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
                { label: 'Medium Severity', value: mediumCount, border: 'hsl(var(--brand))', bg: 'hsl(var(--brand) / 8%)', text: 'hsl(var(--brand))' },
                { label: 'Low Severity', value: lowCount, border: 'hsl(var(--text-3))', bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-2))' },
              ].map(r => (
                <Card key={r.label} style={{ borderRadius: 0, border: `1px solid ${r.border}`, background: r.bg }}>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</p>
                    <p className="text-3xl font-bold mt-1.5" style={{ color: r.text }}>{r.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actionable SLA Queue — real active vulnerabilities */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Actionable SLA Queue</h2>
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                {slaQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-3))' }}>
                    <CheckCircle size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <p className="mt-2 text-sm font-medium">
                      {vulns.length === 0 ? 'No vulnerabilities recorded yet' : 'No active vulnerabilities with SLA deadlines'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['CVE/ID', 'Vulnerability', 'Component', 'Severity', 'Discovered', 'SLA Deadline', 'SLA Status'].map(h => (
                            <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slaQueue.map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="p-3 text-xs font-mono font-bold" style={{ color: 'hsl(var(--text-1))' }}>{v.cveRef || v.vulnId || '—'}</td>
                            <td className="p-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.title}</td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.affectedComponent || '—'}</td>
                            <td className="p-3">
                              <Badge style={{ background: severityColor(v.severity).bg, color: severityColor(v.severity).text, border: `1px solid ${severityColor(v.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                                {v.severity || 'medium'}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.discoveredAt ? v.discoveredAt.slice(0, 10) : '—'}</td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.deadline}</td>
                            <td className="p-3">
                              <Badge style={{ background: v.isOverdue ? 'hsl(var(--destructive) / 10%)' : 'hsl(var(--brand) / 10%)', color: v.isOverdue ? 'hsl(var(--destructive))' : 'hsl(var(--brand))', border: `1px solid ${v.isOverdue ? 'hsl(var(--destructive) / 30%)' : 'hsl(var(--brand) / 30%)'}`, borderRadius: 0, fontSize: 11, fontWeight: 'bold' }}>
                                {v.overdueText}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scans" className="space-y-6 mt-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map(s => (
              <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                  </div>
                  <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {typeData.length > 0 && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Scans by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                    <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                    <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                    <Bar dataKey="count" fill={ct.brand} radius={0} name="Scans" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Search + Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
              <Input placeholder="Search scans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All Statuses</SelectItem>
                {['completed', 'running', 'scheduled', 'failed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All Types</SelectItem>
                {scanTypes.map(t => <SelectItem key={t} value={t}>{scanTypeLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {scans.length} scans</span>
          </div>

          {/* Table */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
                  <Scan size={40} />
                  <p className="mt-3 text-sm font-medium">
                    {scans.length === 0 ? 'No scans recorded yet. Schedule a scan to get started.' : 'No scans match your filters'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr>
                        {['ID', 'Name', 'Type', 'Target', 'Status', 'Severity', 'Findings', 'Schedule', 'Actions'].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr
                          key={s.id}
                          className="cursor-pointer"
                          style={{ borderTop: '1px solid hsl(var(--border))' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                          onClick={() => setViewItem(s)}
                        >
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{s.scanId || '—'}</td>
                          <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.title}</td>
                          <td className="p-3">
                            <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{scanTypeLabel(s.scanType)}</Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.target || '—'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {statusIcon(s.status || 'scheduled')}
                              <Badge style={{ background: statusStyle(s.status || 'scheduled').bg, color: statusStyle(s.status || 'scheduled').text, border: `1px solid ${statusStyle(s.status || 'scheduled').border}`, borderRadius: 0, fontSize: 11 }}>
                                {s.status || 'scheduled'}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            {s.status === 'completed' ? (
                              <Badge style={{ background: severityColor(s.severity).bg, color: severityColor(s.severity).text, border: `1px solid ${severityColor(s.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                                {s.severity || 'medium'}
                              </Badge>
                            ) : <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>—</span>}
                          </td>
                          <td className="p-3 text-sm" style={{ color: (s.findingsCount || 0) > 0 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-2))' }}>
                            {s.status === 'completed' ? `${s.findingsCount || 0} (${s.criticalCount || 0} crit)` : '—'}
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.schedule ? scheduleLabel(s.schedule) : '—'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(s)}><Eye size={14} /></Button>
                              {s.status !== 'running' && (
                                <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-ok-tx))' }} disabled={isSaving} onClick={() => handleRun(s)}><Play size={14} /></Button>
                              )}
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...s })}><PencilSimple size={14} /></Button>
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(s)}><Trash size={14} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: statusStyle(viewItem.status || 'scheduled').bg, color: statusStyle(viewItem.status || 'scheduled').text, border: `1px solid ${statusStyle(viewItem.status || 'scheduled').border}`, borderRadius: 0 }}>{viewItem.status || 'scheduled'}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{scanTypeLabel(viewItem.scanType)}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="results" style={{ borderRadius: 0 }}>Results</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Scan ID', value: viewItem.scanId || '—' },
                    { label: 'Target', value: viewItem.target || '—' },
                    { label: 'Initiated By', value: viewItem.initiatedBy || '—' },
                    { label: 'Schedule', value: viewItem.schedule ? scheduleLabel(viewItem.schedule) : '—' },
                    { label: 'Started', value: viewItem.startedAt ? formatDate(viewItem.startedAt) : '—' },
                    { label: 'Completed', value: viewItem.completedAt ? formatDate(viewItem.completedAt) : '—' },
                    { label: 'Duration', value: viewItem.durationMinutes != null ? `${viewItem.durationMinutes} min` : '—' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="results" className="mt-4">
                  {viewItem.status === 'completed' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                          <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.findingsCount || 0}</p>
                          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Total Findings</p>
                        </div>
                        <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                          <p className="text-4xl font-bold" style={{ color: 'hsl(var(--s-er-tx))' }}>{viewItem.criticalCount || 0}</p>
                          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Critical</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        <div className="p-2" style={{ border: '1px solid hsl(var(--border))' }}>High<br /><span className="text-lg font-bold" style={{ color: 'hsl(var(--r-hi-tx))' }}>{viewItem.highCount || 0}</span></div>
                        <div className="p-2" style={{ border: '1px solid hsl(var(--border))' }}>Medium<br /><span className="text-lg font-bold" style={{ color: 'hsl(var(--r-md-tx))' }}>{viewItem.mediumCount || 0}</span></div>
                        <div className="p-2" style={{ border: '1px solid hsl(var(--border))' }}>Low<br /><span className="text-lg font-bold" style={{ color: 'hsl(var(--r-lo-tx))' }}>{viewItem.lowCount || 0}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8" style={{ color: 'hsl(var(--text-3))' }}>
                      {statusIcon(viewItem.status || 'scheduled')}
                      <p className="mt-3 text-sm">Results not yet available</p>
                      <p className="text-xs mt-1">Status: {viewItem.status || 'scheduled'}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Scan</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'title' }, { label: 'Target', key: 'target' }, { label: 'Initiated By', key: 'initiatedBy' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                  <Select value={editItem.scanType} onValueChange={v => setEditItem(prev => prev ? { ...prev, scanType: v } : null)}>
                    <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {SCAN_TYPES.map(t => <SelectItem key={t} value={t}>{scanTypeLabel(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Schedule</label>
                  <Select value={editItem.schedule} onValueChange={v => setEditItem(prev => prev ? { ...prev, schedule: v } : null)}>
                    <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {SCHEDULES.map(s => <SelectItem key={s} value={s}>{scheduleLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Security Scan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Name', key: 'title' }, { label: 'Target', key: 'target' }, { label: 'Initiated By', key: 'initiatedBy' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Scan Type</label>
                <Select value={formData.scanType} onValueChange={v => setFormData(prev => ({ ...prev, scanType: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {SCAN_TYPES.map(t => <SelectItem key={t} value={t}>{scanTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Schedule</label>
                <Select value={formData.schedule} onValueChange={v => setFormData(prev => ({ ...prev, schedule: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {SCHEDULES.map(s => <SelectItem key={s} value={s}>{scheduleLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title || isSaving}>Schedule Scan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
