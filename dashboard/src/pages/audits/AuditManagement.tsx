// SPDX-License-Identifier: Apache-2.0
// Audit Management — real org-scoped backend (audits / audit_findings via
// useComplianceGroup). Findings interlink to controls and remediation plans;
// a finding can spawn a real remediation_plans row through the incident
// pipeline. No invented metrics: KPIs are counts over loaded records only.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { StatCardRow } from '../../components/ui/StatCardRow';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import {
  ClipboardText, Export, Plus, Eye, Warning, CheckCircle,
  CalendarCheck, User, PencilSimple, Trash, Wrench,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAudits, useAuditFindings } from '../../hooks/useComplianceGroup';
import { useRemediations } from '../../hooks/useRiskIncidents';
import type { AuditRecord, AuditFindingRecord } from '../../services/complianceOpsService';
import type { RemediationRecord } from '../../services/incidentResponseService';
import { exportCsv } from '../../lib/exportUtils';
import { severityColor, statusColor, formatDate } from '../../data/seed';

/* ── Constants ─────────────────────────────────────────────────────────── */

const AUDIT_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const AUDIT_TYPES = ['internal', 'external', 'certification', 'regulator'];
const FINDING_SEVERITIES = ['minor', 'moderate', 'major', 'critical'];
const FINDING_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_remediation', label: 'In Remediation' },
  { value: 'closed', label: 'Closed' },
];

// audit_findings severity vocabulary → the platform's risk color scale.
const SEVERITY_TO_SCALE: Record<string, string> = {
  critical: 'critical', major: 'high', moderate: 'medium', minor: 'low',
};
const findingSeverityStyle = (s?: string) =>
  severityColor(SEVERITY_TO_SCALE[(s || '').toLowerCase()] ?? 'medium');

// Remediation priority derived from finding severity.
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'critical', major: 'high', moderate: 'medium', minor: 'low',
};

const typeBadgeStyle = (t?: string): React.CSSProperties => {
  const map: Record<string, { bg: string; tx: string }> = {
    internal: { bg: 'hsl(var(--s-in-bg))', tx: 'hsl(var(--s-in-tx))' },
    external: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' },
    certification: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' },
    regulator: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' },
  };
  const s = map[(t || '').toLowerCase()] ?? { bg: 'hsl(var(--bg-muted))', tx: 'hsl(var(--text-3))' };
  return { background: s.bg, color: s.tx, borderRadius: 0, fontSize: 10 };
};

/* ── Forms ─────────────────────────────────────────────────────────────── */

interface AuditForm {
  id?: string;
  auditRef: string;
  title: string;
  auditType: string;
  framework: string;
  scope: string;
  auditor: string;
  status: string;
  startDate: string;
  endDate: string;
  owner: string;
  description: string;
}

const EMPTY_AUDIT_FORM: AuditForm = {
  auditRef: '', title: '', auditType: 'internal', framework: '', scope: '',
  auditor: '', status: 'planned', startDate: '', endDate: '', owner: '', description: '',
};

interface FindingForm {
  id?: string;
  findingRef: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  dueDate: string;
  owner: string;
  linkedControlId: string;
}

const EMPTY_FINDING_FORM: FindingForm = {
  findingRef: '', title: '', description: '', severity: 'moderate',
  status: 'open', dueDate: '', owner: '', linkedControlId: '',
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function AuditManagement() {
  const { orgName } = useSettingsStore();
  const audits = useAudits();
  const findings = useAuditFindings();
  const remediations = useRemediations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditForm, setAuditForm] = useState<AuditForm>(EMPTY_AUDIT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AuditRecord | null>(null);
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [findingForm, setFindingForm] = useState<FindingForm>(EMPTY_FINDING_FORM);
  const [deleteFindingTarget, setDeleteFindingTarget] = useState<AuditFindingRecord | null>(null);
  // Which finding currently has a remediation-plan write in flight.
  const [remediatingId, setRemediatingId] = useState<string | null>(null);

  // Deep link: ?open=<id> opens that audit once data is loaded.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || audits.isLoading) return;
    const match = audits.items.find(a => a.id === openId);
    if (match) setSelected(match);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audits.isLoading, audits.items.length]);

  const findingsByAudit = useMemo(() => {
    const map = new Map<string, AuditFindingRecord[]>();
    for (const f of findings.items) {
      const list = map.get(f.auditId) ?? [];
      list.push(f);
      map.set(f.auditId, list);
    }
    return map;
  }, [findings.items]);

  // Remediation plans already raised from a finding. Match on the same key
  // handleCreateRemediation stores (finding_ref, falling back to the uuid) so
  // ref-less findings still show their plans instead of inviting duplicates.
  const plansForFinding = (f: AuditFindingRecord): RemediationRecord[] => {
    const key = f.findingRef ?? f.id;
    return key ? remediations.items.filter(p => p.sourceId === key) : [];
  };

  const filtered = useMemo(() => audits.items.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const hay = [a.auditRef, a.title, a.framework, a.scope, a.auditor, a.leadAuditor]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  }), [audits.items, search, filterStatus]);

  const activeCount = audits.items.filter(a => ['planned', 'in_progress'].includes(a.status)).length;
  const openFindings = findings.items.filter(f => f.status !== 'closed').length;
  const inRemediation = findings.items.filter(f => f.status === 'in_remediation').length;
  const overdueFindings = findings.items.filter(f =>
    f.status !== 'closed' && f.dueDate && new Date(f.dueDate).getTime() < Date.now()).length;

  const kpis: StatCardRowItem[] = [
    { label: 'Active Audits', value: audits.items.length === 0 ? '—' : String(activeCount), icon: <ClipboardText size={18} style={{ color: 'hsl(var(--s-in-tx))' }} /> },
    { label: 'Open Findings', value: findings.items.length === 0 ? '—' : String(openFindings), icon: <Warning size={18} style={{ color: 'hsl(var(--s-wn-tx))' }} /> },
    { label: 'In Remediation', value: findings.items.length === 0 ? '—' : String(inRemediation), icon: <Wrench size={18} style={{ color: 'hsl(var(--brand))' }} /> },
    { label: 'Overdue Findings', value: findings.items.length === 0 ? '—' : String(overdueFindings), icon: <CheckCircle size={18} style={{ color: 'hsl(var(--s-er-tx))' }} /> },
  ];

  /* ── Handlers (toasts are owned by the hooks — no fake success here) ── */

  const openCreateAudit = () => { setAuditForm(EMPTY_AUDIT_FORM); setAuditDialogOpen(true); };
  const openEditAudit = (a: AuditRecord) => {
    setAuditForm({
      id: a.id,
      auditRef: a.auditRef ?? '',
      title: a.title,
      auditType: a.auditType ?? 'internal',
      framework: a.framework ?? '',
      scope: a.scope ?? '',
      auditor: a.auditor ?? '',
      status: a.status,
      startDate: a.startDate ?? '',
      endDate: a.endDate ?? '',
      owner: a.owner ?? '',
      description: a.description ?? '',
    });
    setAuditDialogOpen(true);
  };

  const handleSaveAudit = async () => {
    if (!auditForm.title.trim()) return;
    const existing = auditForm.id ? audits.items.find(a => a.id === auditForm.id) : undefined;
    const record: AuditRecord = {
      id: auditForm.id,
      auditRef: auditForm.auditRef.trim() || undefined,
      title: auditForm.title.trim(),
      auditType: auditForm.auditType,
      framework: auditForm.framework.trim() || undefined,
      scope: auditForm.scope.trim() || undefined,
      auditor: auditForm.auditor.trim() || undefined,
      status: auditForm.status,
      startDate: auditForm.startDate || null,
      endDate: auditForm.endDate || null,
      owner: auditForm.owner.trim() || null,
      // Counts are backend/seed-owned — never recalculated client-side.
      findingsCount: existing?.findingsCount ?? 0,
      description: auditForm.description.trim() || undefined,
    };
    try {
      const saved = await audits.save(record); // hook toasts success; throws on failure
      setAuditDialogOpen(false);
      if (selected?.id && selected.id === saved.id) setSelected(saved);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDeleteAudit = async () => {
    if (!deleteTarget?.id) return;
    try {
      await audits.remove(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const openCreateFinding = () => { setFindingForm(EMPTY_FINDING_FORM); setFindingDialogOpen(true); };
  const openEditFinding = (f: AuditFindingRecord) => {
    setFindingForm({
      id: f.id,
      findingRef: f.findingRef ?? '',
      title: f.title,
      description: f.description ?? '',
      severity: f.severity ?? 'moderate',
      status: f.status,
      dueDate: f.dueDate ?? '',
      owner: f.owner ?? '',
      linkedControlId: f.linkedControlId ?? '',
    });
    setFindingDialogOpen(true);
  };

  const handleSaveFinding = async () => {
    if (!selected?.id || !findingForm.title.trim()) return;
    const record: AuditFindingRecord = {
      id: findingForm.id,
      auditId: selected.id,
      findingRef: findingForm.findingRef.trim() || undefined,
      title: findingForm.title.trim(),
      description: findingForm.description.trim() || undefined,
      severity: findingForm.severity,
      status: findingForm.status,
      linkedControlId: findingForm.linkedControlId.trim() || null,
      dueDate: findingForm.dueDate || null,
      owner: findingForm.owner.trim() || null,
    };
    try {
      await findings.save(record);
      setFindingDialogOpen(false);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDeleteFinding = async () => {
    if (!deleteFindingTarget?.id) return;
    try {
      await findings.remove(deleteFindingTarget.id);
      setDeleteFindingTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  // Raise a REAL remediation plan from a finding through the incident
  // pipeline; the plan links back via source_type/source_id = finding_ref.
  const handleCreateRemediation = async (f: AuditFindingRecord) => {
    const ref = f.findingRef ?? f.id;
    if (!ref) return;
    setRemediatingId(f.id ?? ref);
    const plan: RemediationRecord = {
      title: f.findingRef ? `Remediate ${f.findingRef} — ${f.title}` : `Remediate — ${f.title}`,
      status: 'planned',
      priority: SEVERITY_TO_PRIORITY[(f.severity || '').toLowerCase()] ?? 'medium',
      sourceType: 'audit_finding',
      sourceId: ref,
      dueDate: f.dueDate ?? null,
      owner: f.owner ?? null,
      progressPct: 0,
      milestones: [],
    };
    try {
      await remediations.save(plan); // hook toasts 'Plan saved'; throws on failure
    } catch { /* hook surfaces the error toast */ }
    setRemediatingId(null);
  };

  const handleExport = () => {
    if (!filtered.length) return;
    exportCsv(
      filtered.map(a => ({
        audit_ref: a.auditRef ?? '',
        title: a.title,
        type: a.auditType ?? '',
        framework: a.framework ?? '',
        auditor: a.auditor ?? '',
        status: a.status,
        start_date: a.startDate ?? '',
        end_date: a.endDate ?? '',
        findings_count: a.findingsCount,
      })),
      'audits.csv',
    );
  };

  if (audits.isLoading) return <PageSkeleton />;

  const selectedFindings = selected?.id ? (findingsByAudit.get(selected.id) ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Management"
        subtitle={`${orgName} · Internal, external and certification audits with tracked findings`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Audit Management' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!filtered.length} style={{ borderRadius: 0 }}>
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreateAudit} style={{ borderRadius: 0 }}>
              <Plus size={14} /> New Audit
            </Button>
          </div>
        }
      />

      <StatCardRow cards={kpis} />

      {audits.error && (
        <div role="alert" className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load audits: {(audits.error as Error).message}
        </div>
      )}
      {findings.error && (
        <div role="alert" className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load audit findings: {(findings.error as Error).message}
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ref, title, framework, auditor…"
        filters={[
          {
            key: 'status', label: 'Status',
            value: filterStatus === 'all' ? '' : filterStatus,
            onChange: (v: string) => setFilterStatus(v || 'all'),
            options: AUDIT_STATUSES.map(s => ({ label: s.label, value: s.value })),
          },
        ]}
        activeFilterCount={filterStatus !== 'all' ? 1 : 0}
        onClearAll={() => { setSearch(''); setFilterStatus('all'); }}
        trailing={
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
            {filtered.length} of {audits.items.length} audits
          </span>
        }
      />

      {!audits.error && audits.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
          <ClipboardText size={40} />
          <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No audits recorded yet</p>
          <p className="text-xs mt-1 max-w-md">Track internal reviews, external certification audits and regulator examinations — findings link to controls and remediation plans.</p>
          <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={openCreateAudit}>
            <Plus size={14} /> New Audit
          </Button>
        </div>
      ) : (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Ref', 'Title', 'Type', 'Framework', 'Auditor', 'Status', 'Start', 'End', 'Findings', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const sc = statusColor(a.status);
                    return (
                      <tr
                        key={a.id}
                        style={{ borderTop: '1px solid hsl(var(--border))' }}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelected(a)}
                      >
                        <td className="px-3 py-2.5 text-xs font-mono font-medium" style={{ color: 'hsl(var(--brand))' }}>{a.auditRef ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium max-w-[240px] truncate" style={{ color: 'hsl(var(--text-1))' }}>{a.title}</td>
                        <td className="px-3 py-2.5">
                          {a.auditType ? <Badge style={typeBadgeStyle(a.auditType)}>{a.auditType}</Badge> : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.framework ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.auditor ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>{a.status.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>{a.startDate ? formatDate(a.startDate) : '—'}</td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>{a.endDate ? formatDate(a.endDate) : '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium" style={{ color: a.findingsCount > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>{a.findingsCount}</td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => setSelected(a)} aria-label="View audit">
                              <Eye size={13} />
                            </Button>
                            <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => openEditAudit(a)} aria-label="Edit audit">
                              <PencilSimple size={13} />
                            </Button>
                            <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteTarget(a)} aria-label="Delete audit">
                              <Trash size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-3))' }}>
                <ClipboardText size={32} />
                <p className="mt-2 text-sm">No audits match the current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
                  {selected.auditRef ? `${selected.auditRef} — ${selected.title}` : selected.title}
                </SheetTitle>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge style={{ background: statusColor(selected.status).bg, color: statusColor(selected.status).text, borderRadius: 0, fontSize: 10 }}>
                    {selected.status.replace(/_/g, ' ')}
                  </Badge>
                  {selected.auditType && <Badge style={typeBadgeStyle(selected.auditType)}>{selected.auditType}</Badge>}
                  {selected.framework && <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{selected.framework}</Badge>}
                </div>
              </SheetHeader>

              <div className="space-y-3">
                {selected.description && (
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                )}
                {[
                  { label: 'Scope', value: selected.scope ?? '—' },
                  { label: 'Auditor', value: selected.auditor ?? '—' },
                  { label: 'Lead Auditor', value: selected.leadAuditor ?? '—' },
                  { label: 'Owner', value: selected.owner ?? '—' },
                  { label: 'Period', value: `${selected.startDate ? formatDate(selected.startDate) : '—'} → ${selected.endDate ? formatDate(selected.endDate) : '—'}` },
                  { label: 'Findings on record', value: String(selected.findingsCount) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 gap-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm flex-shrink-0" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium text-right" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}

                {/* Findings */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                      Findings ({selectedFindings.length})
                    </p>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={openCreateFinding}>
                      <Plus size={12} /> Add Finding
                    </Button>
                  </div>

                  {findings.isLoading ? (
                    <p className="text-xs py-4" style={{ color: 'hsl(var(--text-4))' }}>Loading findings…</p>
                  ) : selectedFindings.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: 'hsl(var(--text-3))' }}>No findings recorded for this audit yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedFindings.map(f => {
                        const fs = findingSeverityStyle(f.severity);
                        const plans = plansForFinding(f);
                        const overdue = f.status !== 'closed' && f.dueDate && new Date(f.dueDate).getTime() < Date.now();
                        return (
                          <div key={f.id} className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                                {f.findingRef && <span className="font-mono text-xs mr-1.5" style={{ color: 'hsl(var(--brand))' }}>{f.findingRef}</span>}
                                {f.title}
                              </p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {f.severity && (
                                  <Badge style={{ background: fs.bg, color: fs.text, border: `1px solid ${fs.border}`, borderRadius: 0, fontSize: 9, textTransform: 'uppercase' }}>
                                    {f.severity}
                                  </Badge>
                                )}
                                <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9 }}>{f.status.replace(/_/g, ' ')}</Badge>
                              </div>
                            </div>
                            {f.description && <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{f.description}</p>}
                            <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'hsl(var(--text-4))' }}>
                              {f.owner && <span><User size={10} className="inline mr-1" />{f.owner}</span>}
                              {f.dueDate && (
                                <span style={overdue ? { color: 'hsl(var(--s-er-tx))', fontWeight: 600 } : undefined}>
                                  <CalendarCheck size={10} className="inline mr-1" />Due {formatDate(f.dueDate)}{overdue ? ' · overdue' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {f.linkedControlId && (
                                <InterlinkChip label={`Control ${f.linkedControlId}`} to={`/compliance/controls?open=${f.linkedControlId}`} />
                              )}
                              {plans.map(p => (
                                <InterlinkChip
                                  key={p.id}
                                  label={p.planRef ? `Plan ${p.planRef}` : p.title}
                                  to={`/remediation-tracker?open=${p.id}`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Button
                                size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, height: 26 }}
                                disabled={remediations.isSaving && remediatingId === (f.id ?? f.findingRef)}
                                onClick={() => handleCreateRemediation(f)}
                              >
                                <Wrench size={11} />
                                {remediations.isSaving && remediatingId === (f.id ?? f.findingRef) ? 'Creating…' : 'Create remediation plan'}
                              </Button>
                              <Button size="sm" variant="ghost" style={{ borderRadius: 0, height: 26, padding: '2px 6px' }} onClick={() => openEditFinding(f)} aria-label="Edit finding">
                                <PencilSimple size={12} />
                              </Button>
                              <Button size="sm" variant="ghost" style={{ borderRadius: 0, height: 26, padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteFindingTarget(f)} aria-label="Delete finding">
                                <Trash size={12} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => openEditAudit(selected)}>
                  <PencilSimple size={14} /> Edit Audit
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setSelected(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Audit Create/Edit Dialog ── */}
      <Dialog open={auditDialogOpen} onOpenChange={o => !o && setAuditDialogOpen(false)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle>{auditForm.id ? 'Edit Audit' : 'New Audit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Audit Ref</Label>
                <Input style={{ borderRadius: 0 }} placeholder="e.g. AUD-2026-001" value={auditForm.auditRef} onChange={e => setAuditForm(p => ({ ...p, auditRef: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Type</Label>
                <Select value={auditForm.auditType} onValueChange={v => setAuditForm(p => ({ ...p, auditType: v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {AUDIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Title *</Label>
              <Input style={{ borderRadius: 0 }} value={auditForm.title} onChange={e => setAuditForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Framework</Label>
                <Input style={{ borderRadius: 0 }} placeholder="e.g. ISO/IEC 42001, EU AI Act" value={auditForm.framework} onChange={e => setAuditForm(p => ({ ...p, framework: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Auditor</Label>
                <Input style={{ borderRadius: 0 }} placeholder="Audit firm or internal team" value={auditForm.auditor} onChange={e => setAuditForm(p => ({ ...p, auditor: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Scope</Label>
              <Input style={{ borderRadius: 0 }} placeholder="Coverage area" value={auditForm.scope} onChange={e => setAuditForm(p => ({ ...p, scope: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Start Date</Label>
                <Input type="date" style={{ borderRadius: 0 }} value={auditForm.startDate} onChange={e => setAuditForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>End Date</Label>
                <Input type="date" style={{ borderRadius: 0 }} value={auditForm.endDate} onChange={e => setAuditForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Status</Label>
                <Select value={auditForm.status} onValueChange={v => setAuditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {AUDIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Owner</Label>
                <Input style={{ borderRadius: 0 }} placeholder="Internal owner" value={auditForm.owner} onChange={e => setAuditForm(p => ({ ...p, owner: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Description</Label>
              <Textarea rows={3} style={{ borderRadius: 0 }} value={auditForm.description} onChange={e => setAuditForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setAuditDialogOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={!auditForm.title.trim() || audits.isSaving} onClick={handleSaveAudit}>
              {audits.isSaving ? 'Saving…' : auditForm.id ? 'Save Changes' : 'Create Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Finding Editor Dialog ── */}
      <Dialog open={findingDialogOpen} onOpenChange={o => !o && setFindingDialogOpen(false)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle>{findingForm.id ? 'Edit Finding' : 'Add Finding'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Finding Ref</Label>
                <Input style={{ borderRadius: 0 }} placeholder="e.g. AF-012" value={findingForm.findingRef} onChange={e => setFindingForm(p => ({ ...p, findingRef: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Severity</Label>
                <Select value={findingForm.severity} onValueChange={v => setFindingForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FINDING_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Title *</Label>
              <Input style={{ borderRadius: 0 }} value={findingForm.title} onChange={e => setFindingForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Description</Label>
              <Textarea rows={2} style={{ borderRadius: 0 }} value={findingForm.description} onChange={e => setFindingForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Status</Label>
                <Select value={findingForm.status} onValueChange={v => setFindingForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FINDING_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Due Date</Label>
                <Input type="date" style={{ borderRadius: 0 }} value={findingForm.dueDate} onChange={e => setFindingForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Owner</Label>
                <Input style={{ borderRadius: 0 }} placeholder="Responsible team or role" value={findingForm.owner} onChange={e => setFindingForm(p => ({ ...p, owner: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Linked Control ID</Label>
                <Input style={{ borderRadius: 0 }} placeholder="controls.id" value={findingForm.linkedControlId} onChange={e => setFindingForm(p => ({ ...p, linkedControlId: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setFindingDialogOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={!findingForm.title.trim() || findings.isSaving} onClick={handleSaveFinding}>
              {findings.isSaving ? 'Saving…' : findingForm.id ? 'Save Changes' : 'Add Finding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmations ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title={`Delete audit${deleteTarget?.auditRef ? ` ${deleteTarget.auditRef}` : ''}?`}
        description={`"${deleteTarget?.title ?? ''}" will be permanently removed. Findings recorded against it remain in the audit_findings table but lose their parent.`}
        confirmLabel="Delete Audit"
        isDestructive
        onConfirm={handleDeleteAudit}
      />
      <ConfirmDialog
        open={!!deleteFindingTarget}
        onOpenChange={o => !o && setDeleteFindingTarget(null)}
        title={`Delete finding${deleteFindingTarget?.findingRef ? ` ${deleteFindingTarget.findingRef}` : ''}?`}
        description={`"${deleteFindingTarget?.title ?? ''}" will be permanently removed. Linked remediation plans are not deleted.`}
        confirmLabel="Delete Finding"
        isDestructive
        onConfirm={handleDeleteFinding}
      />
    </div>
  );
}
