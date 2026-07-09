// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useCallback } from 'react';
import {
  Lightning, Eye, PencilSimple, Trash, MagnifyingGlass, Funnel,
  Plus, ShieldWarning, Fire, CheckCircle, Warning, Upload,
  ArrowRight, Clock, Target, X, Detective, CaretRight,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { THREATS, Threat, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useRedTeamData } from '../../hooks/useRedTeamData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';


// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface ExtThreat extends Threat {
  mitreId?: string;
}

// ── Extended Threats with MITRE ATT&CK ────────────────────────────────────────

const EXTENDED_THREATS: ExtThreat[] = THREATS.map(t => ({
  ...t,
  mitreId: ({
    'THR-001': 'T1190',
    'THR-002': 'T1552.004',
    'THR-003': 'T1059.007',
    'THR-004': 'T1110',
    'THR-005': 'T1041',
    'THR-006': 'T1210',
  } as Record<string, string>)[t.id] || '',
}));

// ── Chart Data ────────────────────────────────────────────────────────────────

const THREAT_CATEGORIES = [
  { category: 'Injection', count: 1 },
  { category: 'Unauthorized Access', count: 1 },
  { category: 'Data Exfiltration', count: 1 },
  { category: 'SSRF', count: 1 },
  { category: 'Prompt Injection', count: 1 },
  { category: 'Data Exposure', count: 1 },
];

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
      borderRadius: 0, color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Count: <span className="font-bold">{payload[0].value}</span></p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ThreatFeed() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const { items: threatData, isLoading: threatsLoading, saveRedTeam, removeRedTeam } = useRedTeamData();
  // Use DB data if available, otherwise fall back to extended threats from seed
  const [threats, setThreats] = useState<ExtThreat[]>(
    threatData.length > 0 ? threatData : EXTENDED_THREATS
  );
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedThreat, setSelectedThreat] = useState<ExtThreat | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<ExtThreat | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importFormat, setImportFormat] = useState('STIX 2.1');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: 'Adversarial ML', severity: 'high' as 'critical'|'high'|'medium'|'low', description: '', source: '' });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // All hooks called above — safe to do early return now
  if (threatsLoading) return <PageSkeleton />;

  // Filter logic
  const filtered = threats.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const criticalCount = threats.filter(t => t.severity === 'critical').length;
  const openCount = threats.filter(t => t.status === 'active' || t.status === 'investigating').length;
  const resolvedCount = threats.filter(t => t.status === 'resolved').length;

  // Actions
  const handleInvestigate = (threat: ExtThreat) => {
    setThreats(prev => prev.map(t => t.id === threat.id ? { ...t, status: 'investigating' as const } : t));
    toast(`${threat.id} status changed to Investigating. HITL item created.`, 'info');
  };

  const handleResolve = () => {
    if (!resolveTarget || !resolveNote.trim()) return;
    setThreats(prev => prev.map(t => t.id === resolveTarget.id ? { ...t, status: 'resolved' as const } : t));
    toast(`${resolveTarget.id} resolved. Notes: "${resolveNote.slice(0, 40)}..."`, 'success');
    setResolveTarget(null);
    setResolveNote('');
  };

  const openDetail = (threat: ExtThreat) => {
    setSelectedThreat(threat);
    setSheetOpen(true);
  };

  const threatKpiCards: StatCardRowItem[] = [
    {
      label: 'Total Threats',
      value: String(threats.length),
      icon: <ShieldWarning size={18} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} />,
    },
    {
      label: 'Critical',
      value: String(criticalCount),
      icon: <Fire size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />,
      delta: 'Immediate action',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Open / Investigating',
      value: String(openCount),
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: 'Active threats',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Resolved',
      value: String(resolvedCount),
      icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: 'Closed',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Page Header */}
      <PageHeader
        title="Threat Intelligence Feed"
        subtitle="Real-time threat indicators and IOCs"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Threats' }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setImportOpen(true)}>
              <Upload size={14} />Import Threat Feed
            </Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => setAddOpen(true)}>
              <Plus size={14} />Add Threat
            </Button>
          </div>
        }
      />

      {/* Threat Count KPI Row */}
      <StatCardRow cards={threatKpiCards} />

      {/* Chart */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Threats by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={THREAT_CATEGORIES} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="category" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <YAxis label={{ value: 'Threat Count', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill={ct.brand} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* FilterBar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search threats, IDs..."
        filters={[
          {
            key: 'severity',
            label: 'Severity',
            value: filterSeverity === 'all' ? '' : filterSeverity,
            onChange: v => setFilterSeverity(v || 'all'),
            options: [
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: filterStatus === 'all' ? '' : filterStatus,
            onChange: v => setFilterStatus(v || 'all'),
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Investigating', value: 'investigating' },
              { label: 'Mitigated', value: 'mitigated' },
              { label: 'Resolved', value: 'resolved' },
            ],
          },
        ]}
        activeFilterCount={[filterSeverity, filterStatus].filter(v => v !== 'all').length}
        onClearAll={() => { setSearch(''); setFilterSeverity('all'); setFilterStatus('all'); }}
      />

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Threat', 'Target System', 'Severity', 'Status', 'Detected', 'Source', 'MITRE ATT&CK', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(threat => {
                  const sc = severityColor(threat.severity);
                  const stc = statusColor(threat.status);
                  return (
                    <tr key={threat.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{threat.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{threat.name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {threat.affectedModels.length > 0 ? threat.affectedModels.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {threat.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: stc.bg, color: stc.text, border: `1px solid ${stc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {threat.status.charAt(0).toUpperCase() + threat.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(threat.detected)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{threat.source}</td>
                      <td className="px-4 py-3">
                        {threat.mitreId ? (
                          <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10, fontFamily: 'monospace' }}>
                            {threat.mitreId}
                          </Badge>
                        ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(threat)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          {(threat.status === 'active' || threat.status === 'mitigated') && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleInvestigate(threat)}>
                              <Detective size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />
                            </Button>
                          )}
                          {threat.status !== 'resolved' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setResolveTarget(threat); setResolveNote(''); }}>
                              <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>No threats match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resolve ConfirmDialog */}
      <ConfirmDialog
        open={!!resolveTarget}
        onClose={() => { setResolveTarget(null); setResolveNote(''); }}
        onConfirm={handleResolve}
        type="warning"
        title={`Resolve ${resolveTarget?.id}`}
        message={
          <div className="space-y-3">
            <p>Mark <strong>{resolveTarget?.name}</strong> as resolved?</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Resolution notes are required for audit compliance.</p>
            <textarea
              className="w-full px-3 py-2 text-sm border bg-transparent outline-none"
              style={{ borderColor: 'hsl(var(--border))', borderRadius: 0, minHeight: 80 }}
              placeholder="Enter resolution notes (required)..."
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
            />
          </div>
        }
        confirmLabel="Resolve Threat"
      />

      {/* Threat Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedThreat && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Lightning size={18} weight="fill" style={{ color: severityColor(selectedThreat.severity).text }} />
                  {selectedThreat.id} — {selectedThreat.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="affected" style={{ borderRadius: 0 }}>Affected Systems</TabsTrigger>
                  <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation Steps</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                      <div className="mt-1">
                        <Badge style={{ background: severityColor(selectedThreat.severity).bg, color: severityColor(selectedThreat.severity).text, borderRadius: 0, fontSize: 11 }}>
                          {selectedThreat.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">
                        <Badge style={{ background: statusColor(selectedThreat.status).bg, color: statusColor(selectedThreat.status).text, borderRadius: 0, fontSize: 11 }}>
                          {selectedThreat.status.charAt(0).toUpperCase() + selectedThreat.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Category</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.category}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Source</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.source}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Detected</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedThreat.detected)}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>MITRE ATT&CK</span>
                      <p className="text-sm font-mono font-medium mt-1 text-[hsl(var(--s-in-tx))]">{selectedThreat.mitreId || '—'}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.description}</p>
                  </div>
                  {selectedThreat.cve && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>CVE Reference</span>
                      <p className="text-sm font-mono mt-1 text-destructive">{selectedThreat.cve}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="affected" className="space-y-3 mt-4">
                  {selectedThreat.affectedModels.length > 0 ? (
                    selectedThreat.affectedModels.map(m => (
                      <div key={m} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center gap-2">
                          <Target size={14} style={{ color: 'hsl(var(--brand))' }} />
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m}</span>
                        </div>
                        <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Impacted</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No specific models affected — platform-level threat.</p>
                  )}
                </TabsContent>

                <TabsContent value="remediation" className="space-y-3 mt-4">
                  {selectedThreat.remediation.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 20 }}>
                        {i + 1}
                      </div>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{step}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="activity" className="space-y-3 mt-4">
                  <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Clock size={14} style={{ color: 'hsl(var(--text-4))' }} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Threat detected</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(selectedThreat.detected)} — Source: {selectedThreat.source}</p>
                    </div>
                  </div>
                  {selectedThreat.status === 'mitigated' && (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <CheckCircle size={14} weight="fill" className="text-[hsl(var(--s-ok-tx))] mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Threat mitigated</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Remediation steps applied successfully.</p>
                      </div>
                    </div>
                  )}
                  {selectedThreat.status === 'resolved' && (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <CheckCircle size={14} weight="fill" className="text-[hsl(var(--s-ok-tx))] mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Threat resolved</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Closed and archived.</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Import Threat Feed Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Import Threat Feed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Feed URL</label>
              <Input value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="https://feeds.example.com/threats.json" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Format</label>
              <Select value={importFormat} onValueChange={setImportFormat}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {['STIX 2.1', 'MISP', 'OpenIOC', 'CSV', 'JSON'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 text-xs space-y-1" style={{ background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))' }}>
              <p className="font-semibold" style={{ color: 'hsl(var(--s-in-tx))' }}>Supported sources</p>
              <p style={{ color: 'hsl(var(--text-3))' }}>MITRE ATT&CK, TAXII 2.1 servers, FS-ISAC, CISA AIS, commercial threat intel APIs.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => {
              if (!importUrl.trim()) { toast('Enter a valid feed URL', 'error'); return; }
              toast(`Importing ${importFormat} feed from ${importUrl.slice(0, 40)}…`, 'info');
              setImportOpen(false); setImportUrl('');
            }}>
              <Upload size={14} />Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Threat Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Add Threat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Threat Name *</label>
              <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Prompt Injection via API Gateway" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <Select value={addForm.category} onValueChange={v => setAddForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Adversarial ML','Data Poisoning','Model Theft','Privacy','Supply Chain','Prompt Injection','Evasion'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                <Select value={addForm.severity} onValueChange={v => setAddForm(f => ({ ...f, severity: v as any }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['critical','high','medium','low'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the threat vector and potential impact..." rows={3} className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Source / Intel Feed</label>
              <Input value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. MITRE ATT&CK, Internal SOC, Vendor Report" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => {
              if (!addForm.name.trim()) { toast('Threat name is required', 'error'); return; }
              const newThreat: ExtThreat = {
                id: `THR-${String(threats.length + 1).padStart(3, '0')}`,
                name: addForm.name,
                category: addForm.category,
                severity: addForm.severity,
                status: 'active',
                description: addForm.description || `${addForm.category} threat identified.`,
                source: addForm.source || 'Manual Entry',
                affectedModels: [],
            remediation: [],
                detected: new Date().toISOString().split('T')[0],
              };
              setThreats(prev => [newThreat, ...prev]);
              toast(`Threat ${newThreat.id} added successfully`, 'success');
              setAddOpen(false);
              setAddForm({ name: '', category: 'Adversarial ML', severity: 'high', description: '', source: '' });
            }}>
              <Plus size={14} />Add Threat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
