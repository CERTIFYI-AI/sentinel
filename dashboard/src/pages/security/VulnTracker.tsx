// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useCallback } from 'react';
import {
  Bug, Eye, PencilSimple, Trash, MagnifyingGlass, Plus,
  ShieldWarning, Fire, CheckCircle, Warning, Upload, Clock,
  Target, Shield, Wrench, ArrowRight,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { VULNERABILITIES, Vulnerability, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAttackSurfaceData } from '../../hooks/useAttackSurfaceData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';


// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
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

// ── CVSS Badge ────────────────────────────────────────────────────────────────

function cvssBadge(cvss: number) {
  let bg: string, color: string, fontWeight = 400;
  if (cvss >= 9.0) { bg = 'hsl(0 72% 51% / 0.18)'; color = 'hsl(var(--destructive))'; fontWeight = 700; }
  else if (cvss >= 7.0) { bg = 'hsl(0 72% 51% / 0.12)'; color = 'hsl(var(--destructive))'; }
  else if (cvss >= 4.0) { bg = 'hsl(45 93% 47% / 0.15)'; color = 'hsl(var(--s-wn-tx))'; }
  else { bg = 'hsl(142 71% 45% / 0.12)'; color = 'hsl(var(--s-ok-tx))'; }
  return (
    <Badge style={{ background: bg, color, borderRadius: 0, fontSize: 11, fontWeight, fontFamily: 'monospace' }}>
      {cvss.toFixed(1)}
    </Badge>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VulnTracker() {
  const { orgName } = useSettingsStore();
  const { items: attackSurfaceItems, isLoading: asLoading, saveAttackSurface, removeAttackSurface } = useAttackSurfaceData();
  // Use attack_surface_assets from Supabase (confirmed has data), fallback to seed VULNERABILITIES
  const [vulns, setVulns] = useState<Vulnerability[]>(
    attackSurfaceItems.length > 0 ? attackSurfaceItems as any : [...VULNERABILITIES]
  );
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [patchTarget, setPatchTarget] = useState<Vulnerability | null>(null);
  const [patchEvidence, setPatchEvidence] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Vulnerability | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // All hooks called above — safe to do early return now
  if (asLoading) return <PageSkeleton />;

  const filtered = vulns.filter(v => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase()) && !v.cve.toLowerCase().includes(search.toLowerCase()) && !v.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    return true;
  });

  const criticalCount = vulns.filter(v => v.cvss >= 9.0).length;
  const highCount = vulns.filter(v => v.severity === 'high').length;
  const patchedCount = vulns.filter(v => v.status === 'patched').length;

  const handlePatch = async () => {
    if (!patchTarget) return;
    const now = new Date().toISOString().split('T')[0];
    setVulns(prev => prev.map(v =>
      v.id === patchTarget.id ? { ...v, status: 'patched', patchDate: now } : v
    ));
    await saveAttackSurface({ ...patchTarget, status: 'patched', patchDate: now }).catch(() => {});
    toast(`${patchTarget.id} (${patchTarget.cve}) marked as patched. Evidence: "${patchEvidence.slice(0, 40)}..."`, 'success');
    setPatchTarget(null);
    setPatchEvidence('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setVulns(prev => prev.filter(v => v.id !== deleteTarget.id));
    await removeAttackSurface(deleteTarget.id).catch(() => {});
    toast(`${deleteTarget.id} removed from tracker`, 'info');
    setDeleteTarget(null);
  };

  const openDetail = (v: Vulnerability) => { setSelectedVuln(v); setSheetOpen(true); };

  const vulnKpiCards: StatCardRowItem[] = [
    {
      label: 'Total CVEs',
      value: String(vulns.length),
      icon: <Bug size={18} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} />,
    },
    {
      label: 'Critical (CVSS 9+)',
      value: String(criticalCount),
      icon: <Fire size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />,
      delta: 'Immediate patching required',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'High Severity',
      value: String(highCount),
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: 'Patch within 7 days',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Patched',
      value: String(patchedCount),
      icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: 'Remediated',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
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
        title="Vulnerability Tracker"
        subtitle="CVE tracking and remediation pipeline"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Vulnerabilities' }]}
        actions={
          <Button variant="outline" style={{ borderRadius: 0 }}>
            <Upload size={14} className="mr-2" />Import Scan Results
          </Button>
        }
      />

      {/* CVE KPI Row */}
      <StatCardRow cards={vulnKpiCards} />

      {/* FilterBar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search CVEs, titles, IDs..."
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
              { label: 'Open', value: 'open' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Patched', value: 'patched' },
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
                  {['ID', 'CVE', 'CVSS', 'Severity', 'Affected Component', 'Status', 'Patch Date', 'Assigned To', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const sc = severityColor(v.severity);
                  const stc = statusColor(v.status);
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{v.id}</td>
                      <td className="px-4 py-3 text-xs font-mono text-destructive">{v.cve}</td>
                      <td className="px-4 py-3">{cvssBadge(v.cvss)}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {v.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{v.component}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: stc.bg, color: stc.text, border: `1px solid ${stc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {v.status.replace('_', ' ').charAt(0).toUpperCase() + v.status.replace('_', ' ').slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{v.patchDate ? formatDate(v.patchDate) : '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{v.assignee}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(v)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(v)}>
                            <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                          </Button>
                          {v.status !== 'patched' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setPatchTarget(v); setPatchEvidence(''); }}>
                              <Wrench size={14} className="text-green-600 dark:text-green-400" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(v)}>
                            <Trash size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>No vulnerabilities match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Patch ConfirmDialog */}
      <ConfirmDialog
        open={!!patchTarget}
        onClose={() => { setPatchTarget(null); setPatchEvidence(''); }}
        onConfirm={handlePatch}
        type="info"
        title={`Patch ${patchTarget?.cve}`}
        message={
          <div className="space-y-3">
            <p>Mark <strong>{patchTarget?.title}</strong> as patched?</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Attach evidence for audit compliance (patch reference, ticket, etc.).</p>
            <textarea
              className="w-full px-3 py-2 text-sm border bg-transparent outline-none"
              style={{ borderColor: 'hsl(var(--border))', borderRadius: 0, minHeight: 80 }}
              placeholder="Patch evidence / notes..."
              value={patchEvidence}
              onChange={e => setPatchEvidence(e.target.value)}
            />
          </div>
        }
        confirmLabel="Mark Patched"
      />

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Vulnerability"
        message={<p>Delete <strong>{deleteTarget?.id} ({deleteTarget?.cve})</strong> from the tracker? This creates an audit entry.</p>}
        confirmLabel="Delete"
      />

      {/* Vulnerability Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedVuln && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Bug size={18} weight="fill" style={{ color: severityColor(selectedVuln.severity).text }} />
                  {selectedVuln.id} — {selectedVuln.cve}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="assets" style={{ borderRadius: 0 }}>Affected Assets</TabsTrigger>
                  <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation</TabsTrigger>
                  <TabsTrigger value="patches" style={{ borderRadius: 0 }}>Patch History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Title</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>CVSS Score</span>
                      <div className="mt-1">{cvssBadge(selectedVuln.cvss)}</div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                      <div className="mt-1">
                        <Badge style={{ background: severityColor(selectedVuln.severity).bg, color: severityColor(selectedVuln.severity).text, borderRadius: 0, fontSize: 11 }}>
                          {selectedVuln.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">
                        <Badge style={{ background: statusColor(selectedVuln.status).bg, color: statusColor(selectedVuln.status).text, borderRadius: 0, fontSize: 11 }}>
                          {selectedVuln.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Discovered</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedVuln.discovered)}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.description}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Assigned To</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.assignee}</p>
                  </div>
                </TabsContent>

                <TabsContent value="assets" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center gap-2">
                      <Target size={14} style={{ color: 'hsl(var(--brand))' }} />
                      <span className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.component}</span>
                    </div>
                    <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Primary</Badge>
                  </div>
                  <p className="text-xs px-3" style={{ color: 'hsl(var(--text-4))' }}>Additional asset mapping requires integration with CMDB.</p>
                </TabsContent>

                <TabsContent value="remediation" className="space-y-3 mt-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Recommended Action</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedVuln.cvss >= 9.0
                        ? 'CRITICAL — Patch immediately. Isolate affected component until patched.'
                        : selectedVuln.cvss >= 7.0
                        ? 'HIGH — Schedule patch within 7 days. Apply temporary mitigations.'
                        : 'MODERATE — Schedule patch within 30 days. Monitor for exploitation.'}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>SLA Deadline</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedVuln.cvss >= 9.0 ? '24 hours' : selectedVuln.cvss >= 7.0 ? '7 days' : '30 days'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="patches" className="space-y-3 mt-4">
                  {selectedVuln.patchDate ? (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <CheckCircle size={14} weight="fill" className="text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Patched on {formatDate(selectedVuln.patchDate)}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>By {selectedVuln.assignee}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
                      <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}>Not yet patched</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Assigned to {selectedVuln.assignee} — awaiting fix deployment.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Clock size={14} style={{ color: 'hsl(var(--text-4))' }} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Vulnerability discovered</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(selectedVuln.discovered)}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
