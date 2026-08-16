// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bug, Eye, Trash, CheckCircle, Warning, Clock,
  Target, Wrench, X,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useVulns } from '../../hooks/useSecurityGroup';
import type { VulnRecord } from '../../services/securityGroupService';
import { useModelsData } from '../../hooks/useModelsData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';


// ── CVSS Badge (cvssScore is a string in the DB — parse before formatting) ─────

function cvssBadge(raw?: string) {
  const cvss = parseFloat(raw ?? '');
  if (Number.isNaN(cvss)) {
    return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>;
  }
  let bg: string, color: string, fontWeight = 400;
  if (cvss >= 9.0) { bg = 'hsl(var(--s-er-bg))'; color = 'hsl(var(--destructive))'; fontWeight = 700; }
  else if (cvss >= 7.0) { bg = 'hsl(var(--s-er-bg))'; color = 'hsl(var(--destructive))'; }
  else if (cvss >= 4.0) { bg = 'hsl(var(--s-wn-bg))'; color = 'hsl(var(--s-wn-tx))'; }
  else { bg = 'hsl(var(--s-ok-bg))'; color = 'hsl(var(--s-ok-tx))'; }
  return (
    <Badge style={{ background: bg, color, borderRadius: 0, fontSize: 11, fontWeight, fontFamily: 'monospace' }}>
      {cvss.toFixed(1)}
    </Badge>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VulnTracker() {
  const { orgName } = useSettingsStore();
  const { items: vulns, isLoading, error, save, remove, isSaving } = useVulns();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVuln, setSelectedVuln] = useState<VulnRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [patchTarget, setPatchTarget] = useState<VulnRecord | null>(null);
  const [patchEvidence, setPatchEvidence] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VulnRecord | null>(null);

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';

  if (isLoading) return <PageSkeleton title="Vulnerability Tracker" showStats rows={6} />;

  const filtered = vulns.filter(v => {
    if (modelParam && v.affectedModelId !== modelParam) return false;
    const q = search.toLowerCase();
    if (q && !(v.title ?? '').toLowerCase().includes(q) && !(v.cveRef ?? '').toLowerCase().includes(q) && !(v.vulnId ?? '').toLowerCase().includes(q)) return false;
    if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    return true;
  });

  // KPIs and the severity filter share one basis: the `severity` field.
  const criticalCount = vulns.filter(v => v.severity === 'critical').length;
  const highCount = vulns.filter(v => v.severity === 'high').length;
  const patchedCount = vulns.filter(v => v.status === 'patched').length;

  const handlePatch = async () => {
    if (!patchTarget) return;
    try {
      await save({
        ...patchTarget,
        status: 'patched',
        patchDate: new Date().toISOString(),
        patchEvidence: patchEvidence.trim() || undefined,
      });
      setPatchTarget(null);
      setPatchEvidence('');
    } catch { /* hook toasts error */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await remove(deleteTarget.id);
      if (selectedVuln?.id === deleteTarget.id) { setSheetOpen(false); setSelectedVuln(null); }
      setDeleteTarget(null);
    } catch { /* hook toasts error */ }
  };

  const openDetail = (v: VulnRecord) => { setSelectedVuln(v); setSheetOpen(true); };

  const vulnKpiCards: StatCardRowItem[] = [
    { label: 'Total CVEs', value: String(vulns.length), icon: <Bug size={18} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} /> },
    { label: 'Critical', value: String(criticalCount), icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} /> },
    { label: 'High Severity', value: String(highCount), icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} /> },
    { label: 'Patched', value: String(patchedCount), icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vulnerability Tracker"
        subtitle={`${orgName} — CVE tracking and remediation pipeline`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Vulnerabilities' }]}
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load vulnerabilities</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (deep-link from a model) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

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
                  {['ID', 'CVE', 'CVSS', 'Severity', 'Affected Component', 'Model', 'Status', 'Patch Date', 'Assigned To', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const sc = severityColor(v.severity);
                  const stc = statusColor(v.status || 'open');
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{v.vulnId || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-destructive">{v.cveRef || '—'}</td>
                      <td className="px-4 py-3">{cvssBadge(v.cvssScore)}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {(v.severity || 'medium').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{v.affectedComponent || '—'}</td>
                      <td className="px-4 py-3">
                        {v.affectedModelId
                          ? <InterlinkChip label={modelName(v.affectedModelId)} to={`/models/inventory/${v.affectedModelId}`} />
                          : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: stc.bg, color: stc.text, border: `1px solid ${stc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {(v.status || 'open').replace('_', ' ').charAt(0).toUpperCase() + (v.status || 'open').replace('_', ' ').slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{v.patchDate ? formatDate(v.patchDate) : '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{v.assignee || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(v)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          {v.status !== 'patched' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setPatchTarget(v); setPatchEvidence(''); }}>
                              <Wrench size={14} className="text-[hsl(var(--s-ok-tx))]" />
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
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    {vulns.length === 0
                      ? 'No vulnerabilities recorded yet.'
                      : 'No vulnerabilities match the current filters.'}
                  </td></tr>
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
        title={`Patch ${patchTarget?.cveRef ?? 'Vulnerability'}`}
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
        confirmLabel={isSaving ? 'Saving…' : 'Mark Patched'}
      />

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Vulnerability"
        message={<p>Delete <strong>{deleteTarget?.vulnId} ({deleteTarget?.cveRef})</strong> from the tracker? This creates an audit entry.</p>}
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
                  {selectedVuln.vulnId || 'Vulnerability'} — {selectedVuln.cveRef || selectedVuln.title}
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
                      <div className="mt-1">{cvssBadge(selectedVuln.cvssScore)}</div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                      <div className="mt-1">
                        <Badge style={{ background: severityColor(selectedVuln.severity).bg, color: severityColor(selectedVuln.severity).text, borderRadius: 0, fontSize: 11 }}>
                          {(selectedVuln.severity || 'medium').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">
                        <Badge style={{ background: statusColor(selectedVuln.status || 'open').bg, color: statusColor(selectedVuln.status || 'open').text, borderRadius: 0, fontSize: 11 }}>
                          {(selectedVuln.status || 'open').replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Discovered</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.discoveredAt ? formatDate(selectedVuln.discoveredAt) : '—'}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.description || '—'}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Assigned To</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.assignee || '—'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="assets" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center gap-2">
                      <Target size={14} style={{ color: 'hsl(var(--brand))' }} />
                      <span className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.affectedComponent || '—'}</span>
                    </div>
                    <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Primary</Badge>
                  </div>
                  {selectedVuln.affectedModelId && (
                    <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Affected Model</span>
                      <InterlinkChip label={modelName(selectedVuln.affectedModelId)} to={`/models/inventory/${selectedVuln.affectedModelId}`} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="remediation" className="space-y-3 mt-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Recommended Action</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedVuln.remediation || 'No remediation guidance recorded.'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="patches" className="space-y-3 mt-4">
                  {selectedVuln.patchDate ? (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <CheckCircle size={14} weight="fill" className="text-[hsl(var(--s-ok-tx))] mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Patched on {formatDate(selectedVuln.patchDate)}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>By {selectedVuln.assignee || '—'}</p>
                        {selectedVuln.patchEvidence && (
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>Evidence: {selectedVuln.patchEvidence}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-bg))', borderRadius: 0 }}>
                      <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}>Not yet patched</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Assigned to {selectedVuln.assignee || '—'} — awaiting fix deployment.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Clock size={14} style={{ color: 'hsl(var(--text-4))' }} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Vulnerability discovered</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedVuln.discoveredAt ? formatDate(selectedVuln.discoveredAt) : '—'}</p>
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
