// SPDX-License-Identifier: Apache-2.0
// Exception Management — real org-scoped backend (exceptions via
// useExceptions). Statuses are lowercase in data (pending | approved |
// denied | expired | under_review); TitleCase labels are applied at render.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlass, Eye, ShieldWarning, ClockCountdown, Warning,
  CheckCircle, Export, Plus, ArrowsClockwise,
  UserCircle, CalendarBlank, Prohibit, HourglassMedium,
  X, Trash, Buildings, ArrowSquareOut,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgName } from '../../hooks/useOrganization';
import { useAuthStore } from '../../stores/authStore';
import { useExceptions, useApprovals } from '../../hooks/useRiskIncidents';
import type { ExceptionRecord } from '../../services/incidentResponseService';
import { useModelsData } from '@/hooks/useModelsData';
import { useRisksData } from '@/hooks/useRisksData';
import { usePolicies } from '@/hooks/queries/usePolicies';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { exportCsv } from '@/lib/exportUtils';
import PageSkeleton from '../../components/ui/PageSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  expired: 'Expired',
  under_review: 'Under Review',
};
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const FRAMEWORK_OPTIONS = ['GDPR', 'EU AI Act', 'ISO 42001', 'ISO 27001', 'NIST AI RMF', 'SOC 2', 'SR 11-7', 'CCPA', 'DORA', 'MAS TRM', 'PCI DSS', 'HIPAA'];
const APPROVER_OPTIONS = ['Chief Risk Officer', 'CISO', 'Data Protection Officer', 'Chief Compliance Officer', 'General Counsel', 'Head of Model Risk', 'Board Risk Committee'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpiringSoon(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry > now && expiry - now <= thirtyDays;
}

function riskScoreColor(score: number) {
  if (score >= 15) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  if (score >= 8) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
}

function statusStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'pending': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'under_review': return { bg: 'hsl(220 80% 56% / 0.12)', text: 'hsl(220 80% 50%)', border: 'hsl(220 80% 56% / 0.3)' };
    case 'denied': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))', border: 'hsl(var(--border))' };
  }
}

function riskLevelStyle(r?: string | null) {
  switch (r) {
    case 'Critical':
    case 'High': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Medium': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    default: return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  }
}

function decisionStyle(decision: string | null) {
  switch (decision) {
    case 'approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'denied': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case null: return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}
const decisionLabel = (d: string | null) => d === null ? 'Pending' : d.charAt(0).toUpperCase() + d.slice(1);

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
          <div style={{ color }}>{icon}</div>
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {statusLabel(status)}
    </span>
  );
}

// ── RiskBadge ─────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level?: string | null }) {
  const s = riskLevelStyle(level);
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.text }}>
      {level ?? '—'}
    </span>
  );
}

// ── ScorePill ─────────────────────────────────────────────────────────────────
function ScorePill({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>;
  const c = riskScoreColor(score);
  return (
    <span className="font-mono font-bold text-xs px-2 py-0.5" style={{ background: c.bg, color: c.text }}>{score}</span>
  );
}

// ── ApprovalTimeline ──────────────────────────────────────────────────────────
function ApprovalTimeline({ chain }: { chain: ExceptionRecord['approvalChain'] }) {
  if (!chain.length) {
    return <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--text-4))' }}>No approval steps recorded yet.</p>;
  }
  return (
    <div className="space-y-3">
      {chain.map((step, i) => {
        const s = decisionStyle(step.decision);
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}30` }}>
                {i + 1}
              </div>
              {i < chain.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))' }} />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{step.role}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: s.bg, color: s.text }}>{decisionLabel(step.decision)}</span>
                {step.date && <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fmt(step.date)}</span>}
              </div>
              {step.notes && (
                <p className="text-xs italic" style={{ color: 'hsl(var(--text-3))' }}>"{step.notes}"</p>
              )}
              {!step.notes && step.decision === null && (
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Awaiting review</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const EMPTY_FORM = {
  title: '', policyRef: '', requestedBy: '', approver: 'Chief Risk Officer', department: '',
  riskAccepted: 'Medium', likelihood: 2, impact: 3,
  expiryDate: '', description: '', justification: '',
  impactScope: '', regulatoryRef: '', frameworkMapping: [] as string[],
  affectedSystems: [] as string[], compensatingControls: '', tags: [] as string[],
  linkedRiskId: '', linkedModelIds: [] as string[],
};

export default function ExceptionManagement() {
  const orgName = useOrgName();
  const { user } = useAuthStore();
  const { items: exceptions, isLoading, error, save, remove, isSaving } = useExceptions();
  // Central approval queue — exceptions surface there as approvals rows, and
  // decisions made here settle the matching pending row (both ways stay in sync;
  // oversightService.decideApproval mirrors queue decisions back onto exceptions).
  const { items: approvalItems, save: saveApprovalRequest, decide: decideApprovalRequest } = useApprovals();
  const qc = useQueryClient();
  const { models } = useModelsData();
  const { risks } = useRisksData();
  const { data: policyOptions = [] } = usePolicies();
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Detail drawer
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => exceptions.find(e => e.id === selectedId) ?? null,
    [exceptions, selectedId],
  );

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [systemInput, setSystemInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Approve/Deny dialog
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'denied'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionBy, setDecisionBy] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<ExceptionRecord | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ExceptionRecord | null>(null);

  // Renewal dialog
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  // Deep link: ?open=<id or exceptionId> opens the detail drawer.
  useEffect(() => {
    if (!openParam || isLoading) return;
    const match = exceptions.find(e => e.id === openParam || e.exceptionId === openParam);
    if (match?.id) { setSelectedId(match.id); setSheetOpen(true); }
  }, [openParam, exceptions, isLoading]);

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';
  const riskTitle = (id: string) => risks.find(r => r.id === id)?.title ?? 'Unavailable';

  // Resolve a stored policy reference against the real policies table. When it
  // resolves, show the picker's label; when it doesn't, fall back to the raw
  // text (plain, not styled as a code) with the unresolved state in the title.
  const resolvePolicy = (ref: string): { label: string; resolved: boolean } => {
    const p = policyOptions.find(po => (po.policyRef ?? po.id) === ref);
    if (!p) return { label: ref, resolved: false };
    return { label: p.policyRef ? `${p.policyRef} · ${p.title}` : p.title, resolved: true };
  };
  const currentUserName = user?.fullName ?? user?.email ?? '';
  const currentUserRole = user?.role ?? '';

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return exceptions.filter(exc => {
      if (search) {
        const q = search.toLowerCase();
        const match = (exc.exceptionId ?? exc.id ?? '').toLowerCase().includes(q)
          || exc.title.toLowerCase().includes(q)
          || (exc.requestedBy ?? '').toLowerCase().includes(q)
          || (exc.description ?? '').toLowerCase().includes(q)
          || (exc.impactScope ?? '').toLowerCase().includes(q)
          || exc.tags.some(t => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterStatus !== 'all' && exc.status !== filterStatus) return false;
      if (filterRisk !== 'all' && exc.riskAccepted !== filterRisk) return false;
      return true;
    });
  }, [exceptions, search, filterStatus, filterRisk]);

  const activeCount = exceptions.filter(e => e.status === 'approved').length;
  const pendingCount = exceptions.filter(e => e.status === 'pending' || e.status === 'under_review').length;
  const expiringSoon = exceptions.filter(e => e.status === 'approved' && isExpiringSoon(e.expiryDate)).length;
  const expiredCount = exceptions.filter(e => e.status === 'expired').length;
  const highRiskCount = exceptions.filter(e => (e.riskAccepted === 'High' || e.riskAccepted === 'Critical') && e.status === 'approved').length;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openDetail = (exc: ExceptionRecord) => { setSelectedId(exc.id ?? null); setSheetOpen(true); };
  const closeSheet = (open: boolean) => {
    setSheetOpen(open);
    if (!open && openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.justification.trim()) {
      toast.error('Please fill in all required fields'); return;
    }
    const record: ExceptionRecord = {
      // id omitted — the service generates it.
      title: form.title.trim(),
      policyRef: form.policyRef.trim() || null,
      requestedBy: form.requestedBy.trim() || currentUserName || null,
      requestedDate: new Date().toISOString().split('T')[0],
      approver: form.approver,
      status: 'pending',
      riskAccepted: form.riskAccepted,
      likelihood: form.likelihood,
      impact: form.impact,
      riskScore: form.likelihood * form.impact,
      expiryDate: form.expiryDate || null,
      compensatingControls: form.compensatingControls.trim() || null,
      description: form.description.trim(),
      justification: form.justification.trim(),
      impactScope: form.impactScope.trim() || null,
      department: form.department.trim() || null,
      affectedSystems: form.affectedSystems,
      frameworkMapping: form.frameworkMapping,
      regulatoryRef: form.regulatoryRef.trim() || null,
      renewalCount: 0,
      approvalChain: [
        { role: form.approver, decision: null, date: null, notes: null },
      ],
      renewalHistory: [],
      tags: form.tags,
      linkedRiskId: form.linkedRiskId || null,
      linkedModelIds: form.linkedModelIds,
    };
    try {
      const saved = await save(record); // hook toasts success; throws on failure
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setSystemInput(''); setTagInput('');
      // Surface the pending request in the central approvals queue too, so it
      // reaches reviewers who work from Approval Workflows.
      if (saved.status === 'pending' && saved.id) {
        try {
          await saveApprovalRequest({
            entityType: 'exception',
            entityId: saved.id,
            entityName: `${saved.exceptionId ?? saved.id} — ${saved.title}`,
            requestedBy: saved.requestedBy ?? null,
            requestedAction: 'approve_exception',
            status: 'pending',
            stepIndex: 0,
          });
        } catch { /* approvals hook surfaced the error; the exception itself persisted */ }
      }
    } catch { /* hook surfaces the error toast */ }
  };

  const openDecision = (exc: ExceptionRecord, d: 'approved' | 'denied') => {
    setDecisionTarget(exc);
    setDecision(d);
    setDecisionNotes('');
    setDecisionBy(currentUserName);
    setDecisionOpen(true);
  };

  const handleDecision = async () => {
    if (!decisionTarget) return;
    const actor = currentUserRole
      ? `${currentUserRole}${decisionBy.trim() ? ` (${decisionBy.trim()})` : ''}`
      : (decisionBy.trim() || 'Reviewer');
    const step = {
      role: actor,
      decision,
      date: new Date().toISOString().split('T')[0],
      notes: decisionNotes.trim() || null,
    };
    const updated: ExceptionRecord = {
      ...decisionTarget,
      status: decision === 'denied' ? 'denied' : 'approved',
      approver: decisionBy.trim() || decisionTarget.approver,
      approvalChain: [
        // Resolve the open (pending) step if one exists, else append.
        ...decisionTarget.approvalChain.map((s, i) =>
          s.decision === null && i === decisionTarget.approvalChain.findIndex(x => x.decision === null)
            ? { ...s, decision: step.decision, date: step.date, notes: step.notes }
            : s),
        ...(decisionTarget.approvalChain.some(s => s.decision === null) ? [] : [step]),
      ],
    };
    try {
      await save(updated); // hook toasts success; throws on failure
      setDecisionOpen(false);
      // Settle the matching pending row in the central approvals queue, so a
      // decision made here doesn't leave a stale request behind. No matching
      // row → nothing to do.
      const pendingApproval = approvalItems.find(a =>
        a.entityType === 'exception' && a.entityId === decisionTarget.id && a.status === 'pending');
      if (pendingApproval?.id) {
        try {
          await decideApprovalRequest({
            id: pendingApproval.id,
            decision: decision === 'denied' ? 'rejected' : 'approved',
            approver: actor,
          });
          // decideApproval also syncs the exceptions row — refresh our cache.
          qc.invalidateQueries({ queryKey: ['ri-exceptions'] });
        } catch { /* approvals hook surfaced the error; the exception decision persisted */ }
      }
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDelete = async (exc: ExceptionRecord) => {
    if (!exc.id) return;
    try {
      await remove(exc.id);
      if (selectedId === exc.id) { setSheetOpen(false); setSelectedId(null); }
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleRenewal = async () => {
    if (!selected) return;
    const newExpiry = renewalDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    const updated: ExceptionRecord = {
      ...selected,
      status: 'pending',
      expiryDate: newExpiry,
      renewalCount: selected.renewalCount + 1,
      renewalHistory: [
        ...selected.renewalHistory,
        { date: new Date().toISOString().split('T')[0], by: currentUserName || undefined, notes: renewalNotes.trim() || undefined },
      ],
    };
    try {
      await save(updated); // hook toasts success; throws on failure
      setRenewalOpen(false);
      setRenewalDate(''); setRenewalNotes('');
    } catch { /* hook surfaces the error toast */ }
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error('No exceptions to export'); return; }
    exportCsv(
      filtered.map(e => ({
        id: e.exceptionId ?? e.id ?? '',
        title: e.title,
        policy_ref: e.policyRef ?? '',
        requested_by: e.requestedBy ?? '',
        approver: e.approver ?? '',
        status: statusLabel(e.status),
        risk_level: e.riskAccepted ?? '',
        risk_score: e.riskScore ?? '',
        expiry_date: e.expiryDate ?? '',
        impact_scope: e.impactScope ?? '',
        frameworks: e.frameworkMapping.join('; '),
        regulatory_ref: e.regulatoryRef ?? '',
        linked_risk: e.linkedRiskId ?? '',
        linked_models: (e.linkedModelIds ?? []).map(modelName).join('; '),
      })),
      `exceptions-${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  const addSystem = () => {
    if (systemInput.trim()) {
      setForm(f => ({ ...f, affectedSystems: [...f.affectedSystems, systemInput.trim()] }));
      setSystemInput('');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const toggleFramework = (fw: string) => {
    setForm(f => ({
      ...f,
      frameworkMapping: f.frameworkMapping.includes(fw)
        ? f.frameworkMapping.filter(x => x !== fw)
        : [...f.frameworkMapping, fw],
    }));
  };

  const toggleModel = (id: string) => {
    setForm(f => ({
      ...f,
      linkedModelIds: f.linkedModelIds.includes(id)
        ? f.linkedModelIds.filter(x => x !== id)
        : [...f.linkedModelIds, id],
    }));
  };

  const canDecide = (exc: ExceptionRecord) => exc.status === 'pending' || exc.status === 'under_review';

  if (isLoading) return <PageSkeleton title="Exception Management" showStats rows={6} />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Exception Management"
        subtitle={`${orgName} · Policy exception requests, approval chains & compensating controls`}
        icon={ShieldWarning}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={handleExport}>
              <Export size={14} />Export CSV
            </Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => setCreateOpen(true)}>
              <Plus size={14} />Request Exception
            </Button>
          </div>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load exceptions</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <MetricTile label="Active Exceptions" value={activeCount}
          sub="Currently approved" icon={<ShieldWarning size={16} weight="duotone" />} color="hsl(220 80% 56%)" />
        <MetricTile label="Pending Review" value={pendingCount}
          sub="Awaiting decision" icon={<HourglassMedium size={16} weight="duotone" />} color="hsl(var(--s-wn-tx))" />
        <MetricTile label="Expiring ≤30d" value={expiringSoon}
          sub="Renewal required" icon={<ClockCountdown size={16} weight="duotone" />} color="hsl(var(--s-er-tx))" />
        <MetricTile label="Expired" value={expiredCount}
          sub="Past expiry date" icon={<Prohibit size={16} weight="duotone" />} color="hsl(var(--text-4))" />
        <MetricTile label="High/Critical Risk" value={highRiskCount}
          sub="Active approved" icon={<Warning size={16} weight="duotone" />} color="hsl(var(--s-er-tx))" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search exceptions, policies, tags…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-36 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Risk Levels</SelectItem>
            {RISK_LEVELS.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {exceptions.length} exceptions
        </span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Policy', 'Requested By', 'Status', 'Risk Level', 'Score', 'Expiry', 'Frameworks', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-raised))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(exc => {
                  const expiring = exc.status === 'approved' && isExpiringSoon(exc.expiryDate);
                  const isExp = exc.status === 'expired';
                  const leftColor = isExp ? 'hsl(var(--s-er-tx))' : expiring ? 'hsl(var(--s-wn-tx))' : 'transparent';
                  return (
                    <tr key={exc.id}
                      className="hover:bg-muted/30 cursor-pointer group transition-colors"
                      style={{ borderBottom: '1px solid hsl(var(--border))', borderLeft: `3px solid ${leftColor}` }}
                      onClick={() => openDetail(exc)}>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{exc.exceptionId ?? exc.id}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--text-1))' }}>{exc.title}</p>
                        {exc.policyRef ? (() => {
                          const pol = resolvePolicy(exc.policyRef);
                          return (
                            <p className="text-[10px] truncate" style={{ color: 'hsl(var(--text-4))' }}
                              title={pol.resolved ? undefined : `Unresolved reference: ${exc.policyRef}`}>
                              {pol.label}
                            </p>
                          );
                        })() : (
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>—</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <UserCircle size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{exc.requestedBy ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={exc.status} /></td>
                      <td className="px-3 py-2"><RiskBadge level={exc.riskAccepted} /></td>
                      <td className="px-3 py-2"><ScorePill score={exc.riskScore} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: isExp ? 'hsl(var(--s-er-tx))' : expiring ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-2))' }}>
                            {fmt(exc.expiryDate)}
                          </span>
                          {expiring && <ClockCountdown size={11} style={{ color: 'hsl(var(--s-wn-tx))' }} />}
                          {isExp && <Warning size={11} style={{ color: 'hsl(var(--s-er-tx))' }} />}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {exc.frameworkMapping.slice(0, 2).map(fw => (
                            <span key={fw} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>
                              {fw.split(' ')[0]}
                            </span>
                          ))}
                          {exc.frameworkMapping.length > 2 && (
                            <span className="text-[9px] px-1 py-0.5" style={{ color: 'hsl(var(--text-4))' }}>+{exc.frameworkMapping.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => openDetail(exc)}>
                            <Eye size={12} />
                          </Button>
                          {canDecide(exc) && (
                            <>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                                style={{ color: 'hsl(var(--s-ok-tx))' }}
                                onClick={() => openDecision(exc, 'approved')}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                                style={{ color: 'hsl(var(--s-er-tx))' }}
                                onClick={() => openDecision(exc, 'denied')}>
                                <Prohibit size={12} />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                            style={{ color: 'hsl(var(--s-er-tx))' }}
                            onClick={() => setDeleteTarget(exc)}>
                            <Trash size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      {exceptions.length === 0
                        ? 'No exceptions recorded yet. Request the first exception to start the approval workflow.'
                        : 'No exceptions match your criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Drawer ─────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-[640px] sm:max-w-[640px] overflow-y-auto p-0" style={{ borderRadius: 0 }}>
          {selected && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selected.exceptionId ?? selected.id}</span>
                  <StatusBadge status={selected.status} />
                  <RiskBadge level={selected.riskAccepted} />
                  <ScorePill score={selected.riskScore} />
                </div>
                <SheetTitle className="text-base font-bold leading-snug" style={{ color: 'hsl(var(--text-1))' }}>
                  {selected.title}
                </SheetTitle>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                  Requested {fmt(selected.requestedDate)}{selected.requestedBy ? ` by ${selected.requestedBy}` : ''}
                </p>
                {(selected.policyRef || selected.linkedRiskId || (selected.linkedModelIds ?? []).length > 0) && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {selected.policyRef && (() => {
                      const pol = resolvePolicy(selected.policyRef);
                      return pol.resolved ? (
                        <InterlinkChip label={pol.label} to={`/policies?open=${selected.policyRef}`} />
                      ) : (
                        <span title={`Unresolved reference: ${selected.policyRef}`}>
                          <InterlinkChip label={pol.label} to={`/policies?open=${selected.policyRef}`} />
                        </span>
                      );
                    })()}
                    {selected.linkedRiskId && (
                      <InterlinkChip label={riskTitle(selected.linkedRiskId)} to={`/risks?open=${selected.linkedRiskId}`} />
                    )}
                    {(selected.linkedModelIds ?? []).map(id => (
                      <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                    ))}
                  </div>
                )}
                {selected.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {selected.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-6 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'hsl(var(--border))' }}>
                {canDecide(selected) && (
                  <>
                    <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: 'hsl(var(--bg-surface))', height: 30 }}
                      onClick={() => openDecision(selected, 'approved')}>
                      <CheckCircle size={12} />Approve
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))', borderColor: 'hsl(var(--s-er-tx))', height: 30 }}
                      onClick={() => openDecision(selected, 'denied')}>
                      <Prohibit size={12} />Deny
                    </Button>
                  </>
                )}
                {(selected.status === 'expired' || selected.status === 'approved') && (
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, height: 30 }}
                    onClick={() => { setRenewalDate(''); setRenewalNotes(''); setRenewalOpen(true); }}>
                    <ArrowsClockwise size={12} />Request Renewal
                  </Button>
                )}
                <Button size="sm" variant="outline" style={{ borderRadius: 0, height: 30 }}
                  onClick={() => setDeleteTarget(selected)}>
                  <Trash size={12} />Delete
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="overview" className="h-full">
                  <div className="px-6 pt-3">
                    <TabsList className="w-full h-8" style={{ borderRadius: 0 }}>
                      {['overview', 'risk', 'controls', 'approval', 'renewal'].map(t => (
                        <TabsTrigger key={t} value={t} style={{ borderRadius: 0, fontSize: 11, textTransform: 'capitalize' }}>{t}</TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Overview */}
                  <TabsContent value="overview" className="px-6 pb-6 space-y-5 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Requested By', value: selected.requestedBy ?? '—', icon: <UserCircle size={12} /> },
                        { label: 'Approver', value: selected.approver ?? '—', icon: <UserCircle size={12} /> },
                        { label: 'Requested Date', value: fmt(selected.requestedDate), icon: <CalendarBlank size={12} /> },
                        { label: 'Expiry Date', value: fmt(selected.expiryDate), icon: <CalendarBlank size={12} /> },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: 'hsl(var(--text-4))' }}>{icon}</span>
                            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description || '—'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Business Justification</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.justification || '—'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Impact Scope</p>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selected.impactScope ?? '—'}</p>
                    </div>

                    {selected.affectedSystems.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Affected Systems</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.affectedSystems.map(s => (
                            <span key={s} className="text-[11px] px-2 py-1 flex items-center gap-1"
                              style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                              <Buildings size={10} />{s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.frameworkMapping.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Framework Mapping</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.frameworkMapping.map(fw => (
                            <span key={fw} className="text-[11px] px-2 py-1"
                              style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>
                              {fw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.regulatoryRef && (
                      <div className="p-3 flex items-start gap-2"
                        style={{ background: 'hsl(220 80% 56% / 0.07)', border: '1px solid hsl(220 80% 56% / 0.2)' }}>
                        <ArrowSquareOut size={14} style={{ color: 'hsl(220 80% 56%)' }} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(220 80% 56%)' }}>Regulatory Reference</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{selected.regulatoryRef}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Risk */}
                  <TabsContent value="risk" className="px-6 pb-6 space-y-5 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Likelihood', value: selected.likelihood != null ? `${selected.likelihood} / 5` : '—', color: 'hsl(var(--s-wn-tx))' },
                        { label: 'Impact', value: selected.impact != null ? `${selected.impact} / 5` : '—', color: 'hsl(var(--s-er-tx))' },
                        { label: 'Risk Score', value: selected.riskScore ?? '—', color: selected.riskScore != null ? riskScoreColor(selected.riskScore).text : 'hsl(var(--text-4))' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 text-center" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                          <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {selected.riskAccepted != null && (
                      <div className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>Residual Risk Accepted</p>
                        <RiskBadge level={selected.riskAccepted} />
                      </div>
                    )}
                    {selected.linkedRiskId && (
                      <div className="p-3 flex items-center justify-between" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Linked Risk</p>
                        <InterlinkChip label={riskTitle(selected.linkedRiskId)} to={`/risks?open=${selected.linkedRiskId}`} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Controls */}
                  <TabsContent value="controls" className="px-6 pb-6 space-y-4 mt-4">
                    {selected.compensatingControls ? (
                      <div className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>Compensating Controls</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{selected.compensatingControls}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--text-4))' }}>No compensating controls documented yet.</p>
                    )}
                  </TabsContent>

                  {/* Approval */}
                  <TabsContent value="approval" className="px-6 pb-6 mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'hsl(var(--text-4))' }}>
                      Approval Chain · {selected.approvalChain.filter(s => s.decision === 'approved').length}/{selected.approvalChain.length} Approved
                    </p>
                    <ApprovalTimeline chain={selected.approvalChain} />
                  </TabsContent>

                  {/* Renewal */}
                  <TabsContent value="renewal" className="px-6 pb-6 mt-4">
                    {selected.renewalHistory.length === 0 ? (
                      <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--text-4))' }}>No renewal history for this exception.</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.renewalHistory.map((r, i) => (
                          <div key={i} className="p-4" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>Renewal {i + 1}</span>
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fmt(r.date)}</span>
                            </div>
                            {r.by && <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>Requested by {r.by}</p>}
                            {r.notes && <p className="text-xs mt-1 italic" style={{ color: 'hsl(var(--text-3))' }}>{r.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create Exception Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>Request Policy Exception</DialogTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Complete all required fields. Submission triggers the approval chain.
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Policy */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Policy Name <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
                <Input placeholder="e.g., Data Retention Policy" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Linked Policy</Label>
                {/* Real policy picker fed by the policies table — stores the
                    picked policy's business ref (policyRef) as the display
                    reference on this exception (no schema change). */}
                <Select
                  value={form.policyRef || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, policyRef: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No linked policy" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="none">No linked policy</SelectItem>
                    {policyOptions.filter(p => p.policyRef || p.id).map(p => {
                      const ref = p.policyRef ?? p.id!;
                      return (
                        <SelectItem key={p.id} value={ref}>
                          {p.policyRef ? `${p.policyRef} · ${p.title}` : p.title}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Requested By</Label>
                <Input placeholder="Your name" value={form.requestedBy}
                  onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department / Division</Label>
                <Input placeholder="e.g., Credit Risk Division" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Approving Authority <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
                <Select value={form.approver} onValueChange={v => setForm(f => ({ ...f, approver: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {APPROVER_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expiry Date</Label>
                <Input type="date" value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="p-4 space-y-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Risk Assessment</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Residual Risk Level</Label>
                  <Select value={form.riskAccepted} onValueChange={v => setForm(f => ({ ...f, riskAccepted: v }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Likelihood (1–5)</Label>
                  <Select value={String(form.likelihood)} onValueChange={v => setForm(f => ({ ...f, likelihood: Number(v) }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'][n - 1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Impact (1–5)</Label>
                  <Select value={String(form.impact)} onValueChange={v => setForm(f => ({ ...f, impact: Number(v) }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'][n - 1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Calculated Risk Score:</span>
                <ScorePill score={form.likelihood * form.impact} />
              </div>
            </div>

            {/* Description & Justification */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Exception Description <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea placeholder="Describe the specific policy requirement being excepted and the context…" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Justification <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea placeholder="Why is this exception necessary? What is the business impact of not granting it?" rows={3}
                value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Compensating Controls</Label>
              <Textarea placeholder="What controls will mitigate the additional risk introduced by this exception?" rows={2}
                value={form.compensatingControls} onChange={e => setForm(f => ({ ...f, compensatingControls: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Impact Scope</Label>
              <Input placeholder="e.g., Credit Scoring Division — 2.4M customer records" value={form.impactScope}
                onChange={e => setForm(f => ({ ...f, impactScope: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Regulatory Reference</Label>
              <Input placeholder="e.g., GDPR Art. 5(1)(e) — Storage limitation" value={form.regulatoryRef}
                onChange={e => setForm(f => ({ ...f, regulatoryRef: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            {/* Linked Risk */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Linked Risk</Label>
              <Select value={form.linkedRiskId || 'none'} onValueChange={v => setForm(f => ({ ...f, linkedRiskId: v === 'none' ? '' : v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No linked risk" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="none">No linked risk</SelectItem>
                  {risks.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Models */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Linked Models</Label>
              {models.length === 0 ? (
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in the inventory yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {models.map(m => (
                    <button key={m.id} type="button"
                      onClick={() => toggleModel(m.id)}
                      className="text-[11px] px-2 py-1 transition-colors"
                      style={{
                        background: form.linkedModelIds.includes(m.id) ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                        color: form.linkedModelIds.includes(m.id) ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                        border: `1px solid ${form.linkedModelIds.includes(m.id) ? 'hsl(var(--brand)/0.3)' : 'hsl(var(--border))'}`,
                      }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Affected Systems */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Affected Systems</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g., Credit Scoring Model v3.1" value={systemInput}
                  onChange={e => setSystemInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSystem())}
                  style={{ borderRadius: 0 }} />
                <Button type="button" variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={addSystem}><Plus size={13} /></Button>
              </div>
              {form.affectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.affectedSystems.map(s => (
                    <span key={s} className="flex items-center gap-1 text-[11px] px-2 py-0.5"
                      style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                      {s}
                      <button onClick={() => setForm(f => ({ ...f, affectedSystems: f.affectedSystems.filter(x => x !== s) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Framework Mapping */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Applicable Frameworks</Label>
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORK_OPTIONS.map(fw => (
                  <button key={fw} type="button"
                    onClick={() => toggleFramework(fw)}
                    className="text-[11px] px-2 py-1 transition-colors"
                    style={{
                      background: form.frameworkMapping.includes(fw) ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                      color: form.frameworkMapping.includes(fw) ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                      border: `1px solid ${form.frameworkMapping.includes(fw) ? 'hsl(var(--brand)/0.3)' : 'hsl(var(--border))'}`,
                    }}>
                    {fw}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tags</Label>
              <div className="flex gap-2">
                <Input placeholder="Add tag…" value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  style={{ borderRadius: 0 }} />
                <Button type="button" variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={addTag}><Plus size={13} /></Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5"
                      style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>
                      {t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              disabled={isSaving} onClick={handleCreate}>
              {isSaving ? 'Submitting…' : 'Submit Exception Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve / Deny Dialog ──────────────────────────────────────────────── */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approved' ? '✓ Approve Exception' : '✕ Deny Exception'}
            </DialogTitle>
            {decisionTarget && (
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {decisionTarget.exceptionId ?? decisionTarget.id} — {decisionTarget.title}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3" style={{
              background: decision === 'approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
              border: `1px solid ${decision === 'approved' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--s-er-br))'}`,
            }}>
              <p className="text-xs font-semibold" style={{ color: decision === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                {decision === 'approved'
                  ? 'You are approving this exception. The decision is recorded in the approval chain.'
                  : 'You are denying this exception. The requester will be notified. A denial is final.'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reviewer Name {!currentUserRole && <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span>}</Label>
              <Input placeholder="Who is making this decision?" value={decisionBy}
                onChange={e => setDecisionBy(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reviewer Notes <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea
                placeholder={decision === 'approved'
                  ? 'State any conditions or requirements attached to this approval…'
                  : 'State the reason for denial and any remediation path…'}
                rows={4} value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button
              style={{
                borderRadius: 0,
                background: decision === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                color: 'hsl(var(--bg-surface))',
              }}
              onClick={handleDecision}
              disabled={isSaving || !decisionNotes.trim() || (!currentUserRole && !decisionBy.trim())}>
              {isSaving ? 'Saving…' : decision === 'approved' ? 'Confirm Approval' : 'Confirm Denial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Renewal Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>Request Renewal</DialogTitle>
            {selected && <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selected.exceptionId ?? selected.id} — {selected.title}</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Expiry Date</Label>
              <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Renewal Justification</Label>
              <Textarea placeholder="Why is renewal required? Have compensating controls changed?" rows={3}
                value={renewalNotes} onChange={e => setRenewalNotes(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setRenewalOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              disabled={isSaving} onClick={handleRenewal}>
              {isSaving ? 'Submitting…' : 'Submit Renewal Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exception?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.exceptionId ?? deleteTarget?.id}</strong> — {deleteTarget?.title}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
