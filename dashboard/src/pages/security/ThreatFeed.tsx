// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Lightning, Eye, Plus, ShieldWarning, Fire, CheckCircle, Warning,
  Clock, Target, X, Detective,
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
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { severityColor, statusColor, formatDate } from '../../data/seed';
import { useOrgName } from '../../hooks/useOrganization';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useThreats } from '../../hooks/useSecurityGroup';
import type { ThreatRecord } from '../../services/securityGroupService';
import { useModelsData } from '../../hooks/useModelsData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';


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

const EMPTY_FORM = { title: '', threatType: 'Prompt Injection', severity: 'high', description: '', source: '', mitreTechnique: '' };

// Canonical status vocabulary (matches the security_threats seeds/migration):
// open | investigating | mitigated | resolved. Display labels are prettified.
const prettyStatus = (s?: string) => {
  const raw = s || 'open';
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ');
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ThreatFeed() {
  const orgName = useOrgName();
  const ct = useChartTheme();
  const { items: threats, isLoading, error, save, remove, isSaving } = useThreats();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedThreat, setSelectedThreat] = useState<ThreatRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<ThreatRecord | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveNoteError, setResolveNoteError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';

  if (isLoading) return <PageSkeleton title="Threat Intelligence Feed" showStats rows={6} />;

  // Filter logic
  const filtered = threats.filter(t => {
    if (modelParam && !(t.affectedModelIds ?? []).includes(modelParam)) return false;
    if (search && !(t.title ?? '').toLowerCase().includes(search.toLowerCase()) && !(t.threatId ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const criticalCount = threats.filter(t => t.severity === 'critical').length;
  const openCount = threats.filter(t => t.status === 'open' || t.status === 'investigating').length;
  const resolvedCount = threats.filter(t => t.status === 'resolved').length;

  // Category counts derived from real rows (threatType)
  const categoryData = Array.from(
    threats.reduce((acc, t) => {
      const key = t.threatType || 'Uncategorized';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([category, count]) => ({ category, count }));

  // Actions — persist via the hook (which throws → real error toast)
  const handleInvestigate = async (threat: ThreatRecord) => {
    try { await save({ ...threat, status: 'investigating' }); } catch { /* hook toasts error */ }
  };

  // Returns false to keep the ConfirmDialog open when the required note is
  // missing; otherwise returns the save promise so the dialog closes only
  // after the write resolves. The note persists as the record's `mitigation`.
  const handleResolve = (): false | Promise<unknown> => {
    if (!resolveTarget) return false;
    if (!resolveNote.trim()) { setResolveNoteError(true); return false; }
    return save({ ...resolveTarget, status: 'resolved', mitigation: resolveNote.trim() });
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) { toast.error('Threat title is required'); return; }
    try {
      await save({
        threatId: `THR-${Date.now().toString(36).toUpperCase()}`,
        title: addForm.title,
        threatType: addForm.threatType,
        severity: addForm.severity,
        status: 'open',
        description: addForm.description || `${addForm.threatType} threat identified.`,
        source: addForm.source || 'Manual Entry',
        mitreTechnique: addForm.mitreTechnique || undefined,
        detectedAt: new Date().toISOString(),
        remediationSteps: [],
        affectedModelIds: [],
      });
      setAddOpen(false);
      setAddForm({ ...EMPTY_FORM });
    } catch { /* hook toasts error */ }
  };

  const openDetail = (threat: ThreatRecord) => {
    setSelectedThreat(threat);
    setSheetOpen(true);
  };

  const threatKpiCards: StatCardRowItem[] = [
    { label: 'Total Threats', value: String(threats.length), icon: <ShieldWarning size={18} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} /> },
    { label: 'Critical', value: String(criticalCount), icon: <Fire size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} /> },
    { label: 'Open / Investigating', value: String(openCount), icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} /> },
    { label: 'Resolved', value: String(resolvedCount), icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Threat Intelligence Feed"
        subtitle={`${orgName} — Real-time threat indicators and IOCs`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Threats' }]}
        actions={
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => { setAddForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
            <Plus size={14} />Add Threat
          </Button>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load threats</p>
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

      {/* Threat Count KPI Row */}
      <StatCardRow cards={threatKpiCards} />

      {/* Chart — derived from real rows */}
      {categoryData.length > 0 && (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Threats by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="category" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis label={{ value: 'Threat Count', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} allowDecimals={false} />
                <ReTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill={ct.brand} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
              { label: 'Open', value: 'open' },
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
                  {['ID', 'Threat', 'Affected Models', 'Severity', 'Status', 'Detected', 'Source', 'MITRE ATT&CK', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(threat => {
                  const sc = severityColor(threat.severity);
                  const stc = statusColor(threat.status || 'open');
                  return (
                    <tr key={threat.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{threat.threatId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{threat.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(threat.affectedModelIds ?? []).length > 0
                            ? (threat.affectedModelIds ?? []).map(id => (
                                <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                              ))
                            : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {(threat.severity || 'medium').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: stc.bg, color: stc.text, border: `1px solid ${stc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {prettyStatus(threat.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{threat.detectedAt ? formatDate(threat.detectedAt) : '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{threat.source || '—'}</td>
                      <td className="px-4 py-3">
                        {threat.mitreTechnique ? (
                          <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10, fontFamily: 'monospace' }}>
                            {threat.mitreTechnique}
                          </Badge>
                        ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(threat)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          {(threat.status === 'open' || threat.status === 'mitigated') && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isSaving} onClick={() => handleInvestigate(threat)}>
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
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    {threats.length === 0
                      ? 'No threats recorded yet. Add a threat to start tracking.'
                      : 'No threats match the current filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resolve ConfirmDialog */}
      <ConfirmDialog
        open={!!resolveTarget}
        onClose={() => { setResolveTarget(null); setResolveNote(''); setResolveNoteError(false); }}
        onConfirm={handleResolve}
        type="warning"
        title={`Resolve ${resolveTarget?.threatId ?? 'Threat'}`}
        message={
          <div className="space-y-3">
            <p>Mark <strong>{resolveTarget?.title}</strong> as resolved?</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Resolution notes are required for audit compliance and are saved as the threat's mitigation.</p>
            <textarea
              className="w-full px-3 py-2 text-sm border bg-transparent outline-none"
              style={{ borderColor: resolveNoteError ? 'hsl(var(--destructive))' : 'hsl(var(--border))', borderRadius: 0, minHeight: 80 }}
              placeholder="Enter resolution notes (required)..."
              value={resolveNote}
              onChange={e => { setResolveNote(e.target.value); if (e.target.value.trim()) setResolveNoteError(false); }}
            />
            {resolveNoteError && (
              <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>A resolution note is required before resolving.</p>
            )}
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
                  {selectedThreat.threatId || 'Threat'} — {selectedThreat.title}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="affected" style={{ borderRadius: 0 }}>Affected Models</TabsTrigger>
                  <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation Steps</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                      <div className="mt-1">
                        <Badge style={{ background: severityColor(selectedThreat.severity).bg, color: severityColor(selectedThreat.severity).text, borderRadius: 0, fontSize: 11 }}>
                          {(selectedThreat.severity || 'medium').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">
                        <Badge style={{ background: statusColor(selectedThreat.status || 'open').bg, color: statusColor(selectedThreat.status || 'open').text, borderRadius: 0, fontSize: 11 }}>
                          {prettyStatus(selectedThreat.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Category</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.threatType || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Source</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.source || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Detected</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.detectedAt ? formatDate(selectedThreat.detectedAt) : '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>MITRE ATT&CK</span>
                      <p className="text-sm font-mono font-medium mt-1 text-[hsl(var(--s-in-tx))]">{selectedThreat.mitreTechnique || '—'}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedThreat.description || '—'}</p>
                  </div>
                  {selectedThreat.cveRef && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>CVE Reference</span>
                      <p className="text-sm font-mono mt-1 text-destructive">{selectedThreat.cveRef}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="affected" className="space-y-3 mt-4">
                  {(selectedThreat.affectedModelIds ?? []).length > 0 ? (
                    (selectedThreat.affectedModelIds ?? []).map(id => (
                      <div key={id} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center gap-2">
                          <Target size={14} style={{ color: 'hsl(var(--brand))' }} />
                          <InterlinkChip label={modelName(id)} to={`/models/inventory/${id}`} />
                        </div>
                        <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Impacted</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No specific models affected — platform-level threat.</p>
                  )}
                </TabsContent>

                <TabsContent value="remediation" className="space-y-3 mt-4">
                  {(selectedThreat.remediationSteps ?? []).length > 0 ? (
                    (selectedThreat.remediationSteps ?? []).map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 20 }}>
                          {i + 1}
                        </div>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{step}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No remediation steps recorded.</p>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-3 mt-4">
                  <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Clock size={14} style={{ color: 'hsl(var(--text-4))' }} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Threat detected</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedThreat.detectedAt ? formatDate(selectedThreat.detectedAt) : '—'} — Source: {selectedThreat.source || '—'}</p>
                    </div>
                  </div>
                  {(selectedThreat.status === 'mitigated' || selectedThreat.status === 'resolved') && (
                    <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <CheckCircle size={14} weight="fill" className="text-[hsl(var(--s-ok-tx))] mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Threat {selectedThreat.status}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Owner: {selectedThreat.owner || '—'}</p>
                        {selectedThreat.mitigation && (
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>Resolution: {selectedThreat.mitigation}</p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Threat Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Add Threat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Threat Title *</label>
              <Input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Prompt Injection via API Gateway" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <Select value={addForm.threatType} onValueChange={v => setAddForm(f => ({ ...f, threatType: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Adversarial ML','Data Poisoning','Model Theft','Privacy','Supply Chain','Prompt Injection','Data Exfiltration','Evasion'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                <Select value={addForm.severity} onValueChange={v => setAddForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['critical','high','medium','low'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>MITRE ATT&CK Technique</label>
              <Input value={addForm.mitreTechnique} onChange={e => setAddForm(f => ({ ...f, mitreTechnique: e.target.value }))} placeholder="e.g. T1190" style={{ borderRadius: 0 }} />
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
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} disabled={isSaving} onClick={handleAdd}>
              <Plus size={14} />Add Threat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
