import { useState } from 'react';
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
  Shield, Database, Terminal, Warning,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useSecurityScansData } from '../../hooks/useSecurityScansData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { SEED_VULNERABILITIES } from '../../data/seedData';


interface SecurityScan {
  id: string;
  name: string;
  type: string;
  target: string;
  status: 'completed' | 'running' | 'scheduled' | 'failed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  findings: number;
  criticalFindings: number;
  startedAt: string;
  duration: string;
  schedule: string;
  owner: string;
  description: string;
}

// MOCK_SCANS removed — all data now from Supabase security_scans table via useSecurityScansData

function statusStyle(status: string) {
  switch (status) {
    case 'completed': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'running': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'scheduled': return { bg: '#6366f120', text: '#6366f1', border: '#6366f140' };
    case 'failed': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

function statusIcon(status: string) {
  if (status === 'completed') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'running') return <Play size={14} style={{ color: '#3b82f6' }} />;
  if (status === 'scheduled') return <CalendarBlank size={14} style={{ color: '#6366f1' }} />;
  return <XCircle size={14} style={{ color: '#ef4444' }} />;
}

const EMPTY_SCAN: Omit<SecurityScan, 'id'> = {
  name: '', type: 'DAST', target: '', status: 'scheduled',
  severity: 'medium', findings: 0, criticalFindings: 0,
  startedAt: new Date().toISOString().split('T')[0], duration: '—',
  schedule: 'Weekly', owner: '', description: '',
};

export default function ScanCenter() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const { items: supabaseScans, isLoading: scansLoading, saveSecurityScans, removeSecurityScans } = useSecurityScansData()
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const scanList = supabaseScans.length > 0 ? supabaseScans as any as SecurityScan[] : scans;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [viewItem, setViewItem] = useState<SecurityScan | null>(null);
  const [editItem, setEditItem] = useState<SecurityScan | null>(null);
  const [deleteItem, setDeleteItem] = useState<SecurityScan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<SecurityScan, 'id'>>(EMPTY_SCAN);

  // All hooks called above — safe to do early return now
  if (scansLoading) return <PageSkeleton />;

  const filtered = scanList.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.target.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || s.status === filterStatus;
    const matchType = filterType === 'all' || s.type === filterType;
    return matchSearch && matchStat && matchType;
  });

  const typeData = Array.from(
    scanList.reduce((acc, s) => {
      acc.set(s.type, (acc.get(s.type) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  const stats = [
    { label: 'Total Scans', value: scanList.length, icon: Scan },
    { label: 'Running', value: scanList.filter(s => s.status === 'running').length, icon: Play },
    { label: 'Scheduled', value: scanList.filter(s => s.status === 'scheduled').length, icon: Clock },
    { label: 'Total Findings', value: scanList.reduce((sum, s) => sum + (s.findings || 0), 0), icon: XCircle },
  ];

  const scanTypes = Array.from(new Set(scanList.map(s => s.type)));

  async function handleCreate() {
    await saveSecurityScans({ ...formData }).catch(() => {});
    setCreateOpen(false);
    setFormData(EMPTY_SCAN);
  }

  async function handleEdit() {
    if (!editItem) return;
    await saveSecurityScans(editItem).catch(() => {});
    setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await removeSecurityScans(deleteItem.id).catch(() => {});
    setDeleteItem(null);
  }

  async function handleRun(scanId: string) {
    const scan = scanList.find(s => s.id === scanId);
    if (scan) await saveSecurityScans({ ...scan, status: 'running', startedAt: new Date().toISOString().split('T')[0] }).catch(() => {});
  }

  // Task 2: Calculate Aggregated Risk Trends
  const activeVulns = SEED_VULNERABILITIES.filter(v => v.status !== 'patched' && v.status !== 'resolved');
  const criticalCount = activeVulns.filter(v => v.severity?.toLowerCase() === 'critical').length;
  const highCount = activeVulns.filter(v => v.severity?.toLowerCase() === 'high').length;
  const mediumCount = activeVulns.filter(v => v.severity?.toLowerCase() === 'medium').length;
  const lowCount = activeVulns.filter(v => v.severity?.toLowerCase() === 'low').length;

  // Task 2: Actionable SLA Queue
  const slaQueue = activeVulns.map(v => {
    const discoveredDate = new Date(v.discovered || v.created_at || '2026-06-01');
    const slaDays = {
      critical: 14,
      high: 30,
      medium: 60,
      low: 90
    }[v.severity?.toLowerCase() || 'medium'] || 60;
    
    const deadline = new Date(discoveredDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
    const today = new Date('2026-06-15');
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...v,
      deadline: deadline.toISOString().split('T')[0],
      daysRemaining: diffDays,
      isOverdue: diffDays < 0,
      overdueText: diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d left`
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const scopes = [
    {
      name: 'Source Code Repositories',
      description: 'SAST, dependency SCA, and secrets scans on Git repositories',
      coverage: '98.4%',
      status: '2 active vulnerabilities',
      icon: Terminal,
      color: 'hsl(var(--brand))',
      bg: 'hsl(var(--brand) / 8%)'
    },
    {
      name: 'Container Registries',
      description: 'Base image vulnerability audits on registry containers',
      coverage: '100.0%',
      status: '0 active vulnerabilities',
      icon: Database,
      color: 'hsl(var(--s-ok-tx))',
      bg: 'hsl(142 71% 45% / 10%)'
    },
    {
      name: 'Cloud Infrastructure',
      description: 'IaC and configuration scans on production cloud clusters',
      coverage: '91.2%',
      status: '1 active vulnerability',
      icon: Shield,
      color: 'hsl(var(--s-wn-tx))',
      bg: 'hsl(45 93% 47% / 10%)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Scan Center</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Security scan management, scheduling & results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_SCAN); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> New Scan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Security Dashboard</TabsTrigger>
          <TabsTrigger value="scans" style={{ borderRadius: 0 }}>Scan Scheduler & History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Aggregated Risk Trends */}
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

          {/* Scopes of Scanned Perimeter */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Perimeter Scopes</h2>
            <div className="grid grid-cols-3 gap-4">
              {scopes.map(s => (
                <Card key={s.name} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2" style={{ background: s.bg, color: s.color }}>
                          <s.icon size={18} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.name}</span>
                      </div>
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{s.coverage} Covered</Badge>
                    </div>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.description}</p>
                    <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'hsl(var(--text-2))' }}>
                      <span>Status:</span>
                      <span className="font-semibold" style={{ color: s.color }}>{s.status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actionable Findings (SLA Violations Queue) */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Actionable SLA Queue</h2>
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                {slaQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-3))' }}>
                    <CheckCircle size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <p className="mt-2 text-sm font-medium">No active vulnerabilities found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['CVE/ID', 'Vulnerability', 'Component', 'Severity', 'Discovered', 'SLA Deadline', 'Overdue Days'].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slaQueue.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td className="p-3 text-xs font-mono font-bold" style={{ color: 'hsl(var(--text-1))' }}>{v.cve || v.id}</td>
                          <td className="p-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.title}</td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.component}</td>
                          <td className="p-3">
                            <Badge style={{ background: severityColor(v.severity).bg, color: severityColor(v.severity).text, border: `1px solid ${severityColor(v.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                              {v.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.discovered || v.created_at?.slice(0, 10)}</td>
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

          {/* Search + Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
              <Input placeholder="Search scans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
              <option value="all">All Statuses</option>
              {['completed', 'running', 'scheduled', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
              <option value="all">All Types</option>
              {scanTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {scanList.length} scans</span>
          </div>

          {/* Table */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
                  <Scan size={40} />
                  <p className="mt-3 text-sm font-medium">No scans match your filters</p>
                </div>
              ) : (
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
                        <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{s.id}</td>
                        <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{s.type}</Badge>
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.target}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {statusIcon(s.status)}
                            <Badge style={{ background: statusStyle(s.status).bg, color: statusStyle(s.status).text, border: `1px solid ${statusStyle(s.status).border}`, borderRadius: 0, fontSize: 11 }}>
                              {s.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          {s.status === 'completed' ? (
                            <Badge style={{ background: severityColor(s.severity).bg, color: severityColor(s.severity).text, border: `1px solid ${severityColor(s.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                              {s.severity}
                            </Badge>
                          ) : <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>—</span>}
                        </td>
                        <td className="p-3 text-sm" style={{ color: s.findings > 0 ? '#f97316' : 'hsl(var(--text-2))' }}>
                          {s.status === 'completed' ? `${s.findings} (${s.criticalFindings} crit)` : '—'}
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.schedule}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(s)}><Eye size={14} /></Button>
                            {s.status !== 'running' && (
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#10b981' }} onClick={() => handleRun(s.id)}><Play size={14} /></Button>
                            )}
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...s })}><PencilSimple size={14} /></Button>
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(s)}><Trash size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, border: `1px solid ${statusStyle(viewItem.status).border}`, borderRadius: 0 }}>{viewItem.status}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="results" style={{ borderRadius: 0 }}>Results</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Scan ID', value: viewItem.id },
                    { label: 'Target', value: viewItem.target },
                    { label: 'Owner', value: viewItem.owner },
                    { label: 'Schedule', value: viewItem.schedule },
                    { label: 'Started', value: formatDate(viewItem.startedAt) },
                    { label: 'Duration', value: viewItem.duration },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
                <TabsContent value="results" className="mt-4">
                  {viewItem.status === 'completed' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                          <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.findings}</p>
                          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Total Findings</p>
                        </div>
                        <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                          <p className="text-4xl font-bold" style={{ color: '#ef4444' }}>{viewItem.criticalFindings}</p>
                          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Critical</p>
                        </div>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-muted))' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Max Severity</p>
                        <Badge style={{ background: severityColor(viewItem.severity).bg, color: severityColor(viewItem.severity).text, border: `1px solid ${severityColor(viewItem.severity).border}`, borderRadius: 0 }}>
                          {viewItem.severity}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8" style={{ color: 'hsl(var(--text-3))' }}>
                      {statusIcon(viewItem.status)}
                      <p className="mt-3 text-sm">Results not yet available</p>
                      <p className="text-xs mt-1">Status: {viewItem.status}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
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
              {[{ label: 'Name', key: 'name' }, { label: 'Target', key: 'target' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                  <select value={editItem.type} onChange={e => setEditItem(prev => prev ? { ...prev, type: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['DAST', 'SAST', 'SCA', 'Network', 'AI Security', 'Configuration'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Schedule</label>
                  <select value={editItem.schedule} onChange={e => setEditItem(prev => prev ? { ...prev, schedule: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Security Scan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Name', key: 'name' }, { label: 'Target', key: 'target' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Scan Type</label>
                <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['DAST', 'SAST', 'SCA', 'Network', 'AI Security', 'Configuration'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Schedule</label>
                <select value={formData.schedule} onChange={e => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Schedule Scan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
