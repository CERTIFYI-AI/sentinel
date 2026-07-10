import { useState, useCallback } from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardText, Plus, MagnifyingGlass, Funnel, Eye, Export,
  CheckCircle, Warning, Clock, XCircle, ArrowsClockwise, Buildings,
  CaretDown, Trash,
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
  VENDOR_ASSESSMENTS, VENDORS, VendorAssessment, AssessmentStatus, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';


interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function statusStyle(status: AssessmentStatus): { bg: string; color: string; label: string; icon: React.ElementType } {
  const map: Record<AssessmentStatus, { bg: string; color: string; label: string; icon: React.ElementType }> = {
    draft: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))', label: 'Draft', icon: ClipboardText },
    in_progress: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', label: 'In Progress', icon: ArrowsClockwise },
    submitted: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Submitted', icon: Clock },
    under_review: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Under Review', icon: Eye },
    approved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', label: 'Approved', icon: CheckCircle },
    approved_with_conditions: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Approved w/ Conditions', icon: Warning },
    rejected: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', label: 'Rejected', icon: XCircle },
    expired: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--text-4))', label: 'Expired', icon: Clock },
  };
  return map[status] ?? map.draft;
}

function recommendationBadge(rec: VendorAssessment['recommendation']) {
  if (!rec) return null;
  const map: Record<string, { bg: string; color: string }> = {
    'Approve': { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'Approve with Conditions': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Reject': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    'Reassess': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = map[rec] ?? map['Reassess'];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{rec}</Badge>;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'hsl(var(--text-4))';
  if (score >= 80) return 'hsl(var(--s-ok-tx))';
  if (score >= 60) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

const ASSESSMENT_TYPES = ['Security', 'Privacy', 'AI Governance', 'DPA Review', 'Financial', 'Operational Resilience', 'Business Continuity', 'Custom'] as const;
const FRAMEWORKS = ['SIG Lite', 'CAIQ', 'ISO 27001', 'ISO 42001', 'GDPR', 'SOC 2', 'Internal'];

interface CreateForm {
  vendorId: string;
  assessmentType: VendorAssessment['assessmentType'];
  frameworkBasis: string;
  owner: string;
  dueDate: string;
  summary: string;
}

const BLANK_FORM: CreateForm = {
  vendorId: '',
  assessmentType: 'Security',
  frameworkBasis: 'SIG Lite',
  owner: '',
  dueDate: '',
  summary: '',
};

export default function VendorAssessments() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const { data: assessments, setData: setAssessments } = useSupabaseTable('vendorassessments_table', VENDOR_ASSESSMENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [selected, setSelected] = useState<VendorAssessment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorAssessment | null>(null);
  const [form, setForm] = useState<CreateForm>(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, text, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const total = assessments.length;
  const pending = assessments.filter(a => ['draft', 'in_progress', 'submitted', 'under_review'].includes(a.status)).length;
  const approved = assessments.filter(a => ['approved', 'approved_with_conditions'].includes(a.status)).length;
  const critical = assessments.filter(a => a.criticalFindingsCount > 0).length;
  const expiringSoon = assessments.filter(a => {
    const d = new Date(a.nextReviewDate).getTime() - Date.now();
    return d > 0 && d < 60 * 24 * 60 * 60 * 1000;
  }).length;

  const filtered = assessments.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.id.toLowerCase().includes(q) || a.vendorName.toLowerCase().includes(q) || a.assessmentType.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchType = typeFilter === 'all' || a.assessmentType === typeFilter;
    const matchVendor = vendorFilter === 'all' || a.vendorId === vendorFilter;
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
    if (!form.vendorId || !form.owner || !form.dueDate) {
      setFormError('Vendor, Owner, and Due Date are required.');
      return;
    }
    const vendor = VENDORS.find(v => v.id === form.vendorId);
    if (!vendor) { setFormError('Select a valid vendor.'); return; }
    const newA: VendorAssessment = {
      id: `VA-${String(assessments.length + 1).padStart(3, '0')}`,
      vendorId: form.vendorId,
      vendorName: vendor.name,
      assessmentType: form.assessmentType,
      version: 'v1.0',
      status: 'draft',
      frameworkBasis: form.frameworkBasis,
      owner: form.owner,
      dueDate: form.dueDate,
      submittedAt: null,
      reviewedAt: null,
      approvedAt: null,
      score: null,
      riskFindingsCount: 0,
      criticalFindingsCount: 0,
      evidenceCount: 0,
      summary: form.summary || 'Assessment created — pending vendor questionnaire.',
      recommendation: null,
      nextReviewDate: '',
    };
    setAssessments(p => [newA, ...p]);
    setCreateOpen(false);
    setForm(BLANK_FORM);
    setFormError('');
    toast(`Assessment ${newA.id} created for ${vendor.name}`);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setAssessments(p => p.filter(a => a.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'error');
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) setSelected(null);
  }

  function handleExport() {
    const csv = [
      ['ID', 'Vendor', 'Type', 'Status', 'Score', 'Owner', 'Due Date', 'Recommendation'].join(','),
      ...assessments.map(a => [a.id, a.vendorName, a.assessmentType, a.status, a.score ?? '', a.owner, a.dueDate, a.recommendation ?? ''].join(',')),
    ].join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    el.download = `vendor-assessments-${new Date().toISOString().split('T')[0]}.csv`;
    el.click();
    toast('Assessments exported as CSV');
  }

  function advanceStatus(a: VendorAssessment) {
    const flow: AssessmentStatus[] = ['draft', 'in_progress', 'submitted', 'under_review', 'approved'];
    const idx = flow.indexOf(a.status as AssessmentStatus);
    if (idx < 0 || idx >= flow.length - 1) return;
    const next = flow[idx + 1];
    setAssessments(p => p.map(x => x.id === a.id ? { ...x, status: next, submittedAt: next === 'submitted' ? new Date().toISOString() : x.submittedAt, reviewedAt: next === 'under_review' ? new Date().toISOString() : x.reviewedAt, approvedAt: next === 'approved' ? new Date().toISOString() : x.approvedAt } : x));
    if (selected?.id === a.id) setSelected(p => p ? { ...p, status: next } : null);
    toast(`Assessment ${a.id} advanced to ${next.replace('_', ' ')}`);
  }

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Assessments</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Third-party risk assessments across all vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4" />Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus className="h-4 w-4" />New Assessment
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Assessments', value: total, color: 'hsl(var(--text-1))', icon: ClipboardText },
          { label: 'Pending / In Progress', value: pending, color: 'hsl(var(--s-wn-tx))', icon: Clock },
          { label: 'Approved', value: approved, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'Critical Findings', value: critical, color: 'hsl(var(--destructive))', icon: Warning },
          { label: 'Due for Review (<60d)', value: expiringSoon, color: 'hsl(var(--s-wn-tx))', icon: ArrowsClockwise },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
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
          <Input placeholder="Search assessments..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0 }} />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-40 h-9" style={{ borderRadius: 0 }}>
            <Buildings className="h-3 w-3 mr-1" /><SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Vendors</SelectItem>
            {VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Types</SelectItem>
            {ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['draft', 'in_progress', 'submitted', 'under_review', 'approved', 'approved_with_conditions', 'rejected', 'expired'] as AssessmentStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusStyle(s).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}>
            Clear filters ({activeFilters})
          </Button>
        )}
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} assessments</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
              <ClipboardText size={36} className="mb-2 opacity-40" />
              <p className="text-sm">No assessments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Assessment ID', 'Vendor', 'Type', 'Framework', 'Status', 'Score', 'Findings', 'Owner', 'Due Date', 'Recommendation', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const ss = statusStyle(a.status);
                    return (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid hsl(var(--border))' }}
                        onClick={() => setSelected(a)}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.id}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>v{a.version.replace('v', '')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}
                            onClick={e => { e.stopPropagation(); navigate(`/vendors/${a.vendorId}`); }}>
                            {a.vendorName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.assessmentType}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.frameworkBasis}</td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 10 }}>
                            {ss.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {a.score !== null ? (
                            <span className="text-sm font-bold" style={{ color: scoreColor(a.score) }}>{a.score}</span>
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.riskFindingsCount}</span>
                            {a.criticalFindingsCount > 0 && (
                              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>
                                {a.criticalFindingsCount} crit
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: new Date(a.dueDate) < new Date() && !['approved', 'rejected'].includes(a.status) ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                          {formatDate(a.dueDate)}
                        </td>
                        <td className="px-4 py-3">{recommendationBadge(a.recommendation)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(a)} aria-label="View assessment">
                              <Eye size={14} />
                            </Button>
                            {['draft', 'in_progress', 'submitted', 'under_review'].includes(a.status) && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => advanceStatus(a)} aria-label="Advance status">
                                <CaretDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(a)} aria-label="Delete assessment">
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

      {/* Assessment Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent style={{ borderRadius: 0, width: 580, maxWidth: '100vw' }} className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selected?.id} — {selected?.assessmentType}
              <span className="ml-2 text-xs font-mono font-normal" style={{ color: 'hsl(var(--text-4))' }}>{selected?.version}</span>
            </SheetTitle>
          </SheetHeader>
          {selected && (() => {
            const ss = statusStyle(selected.status);
            return (
              <div className="mt-6 space-y-5">
                {/* Status + Recommendation */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 11 }}>{ss.label}</Badge>
                  {recommendationBadge(selected.recommendation)}
                  {selected.criticalFindingsCount > 0 && (
                    <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 11 }}>
                      <Warning size={10} className="mr-1" />{selected.criticalFindingsCount} Critical Finding{selected.criticalFindingsCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Score */}
                {selected.score !== null && (
                  <div className="p-4" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>ASSESSMENT SCORE</p>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold" style={{ color: scoreColor(selected.score) }}>{selected.score}</span>
                      <span className="text-lg mb-1" style={{ color: 'hsl(var(--text-4))' }}>/100</span>
                      <div className="flex-1 mb-2">
                        <div className="h-2" style={{ background: 'hsl(var(--border))' }}>
                          <div className="h-full" style={{ width: `${selected.score}%`, background: scoreColor(selected.score) }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {selected.summary && (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>SUMMARY</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.summary}</p>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Vendor', value: selected.vendorName },
                    { label: 'Framework', value: selected.frameworkBasis },
                    { label: 'Owner', value: selected.owner },
                    { label: 'Due Date', value: formatDate(selected.dueDate) },
                    { label: 'Submitted', value: selected.submittedAt ? formatDate(selected.submittedAt) : '—' },
                    { label: 'Reviewed', value: selected.reviewedAt ? formatDate(selected.reviewedAt) : '—' },
                    { label: 'Approved', value: selected.approvedAt ? formatDate(selected.approvedAt) : '—' },
                    { label: 'Next Review', value: selected.nextReviewDate ? formatDate(selected.nextReviewDate) : '—' },
                    { label: 'Risk Findings', value: String(selected.riskFindingsCount) },
                    { label: 'Evidence Items', value: String(selected.evidenceCount) },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.label}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => navigate(`/vendors/${selected.vendorId}`)}>
                    <Buildings size={13} />View Vendor
                  </Button>
                  {['draft', 'in_progress', 'submitted', 'under_review'].includes(selected.status) && (
                    <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => advanceStatus(selected)}>
                      Advance Status
                    </Button>
                  )}
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }} onClick={() => setDeleteTarget(selected)}>
                    <Trash size={13} />Delete
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) { setForm(BLANK_FORM); setFormError(''); } }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Vendor Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {formError && <p className="text-xs text-destructive">{formError}</p>}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Assessment Type *</label>
                <Select value={form.assessmentType} onValueChange={v => setForm(p => ({ ...p, assessmentType: v as VendorAssessment['assessmentType'] }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Framework</label>
                <Select value={form.frameworkBasis} onValueChange={v => setForm(p => ({ ...p, frameworkBasis: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
                <Input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="Assigned reviewer" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Due Date *</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Summary / Scope</label>
              <textarea
                value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Describe the scope and objective of this assessment..."
                rows={3}
                style={{
                  width: '100%', borderRadius: 0, padding: '8px 12px', fontSize: 13,
                  background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--text-1))', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(BLANK_FORM); setFormError(''); }} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button onClick={handleCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>Create Assessment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.id}?`}
        description={`This will permanently delete the ${deleteTarget?.assessmentType} assessment for ${deleteTarget?.vendorName}. This action cannot be undone.`}
        confirmLabel="Delete Assessment"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
