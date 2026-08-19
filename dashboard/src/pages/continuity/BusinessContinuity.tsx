import { useState, useMemo, useEffect } from 'react';
import { useBcpPlansData } from '../../hooks/useBcpPlansData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Lifebuoy, MagnifyingGlass, Export, Eye, CheckCircle,
  Warning, Clock, ShieldCheck, ArrowsClockwise, Users,
  Phone, Envelope, TreeStructure, ListChecks,
  CaretRight, CalendarBlank, Timer, Funnel, Plus, Trash, PencilSimple,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { useOrgName } from '../../hooks/useOrganization';


// ── Types ────────────────────────────────────────────────────────────────────

interface BCPPlan {
  id: string;
  name: string;
  scope: string;
  rto: string;
  rpo: string;
  lastTested: string;
  testResult: 'Pass' | 'Pass with Issues' | 'Fail';
  owner: string;
  status: 'Active' | 'Under Review' | 'Draft' | 'Archived';
  nextTest: string;
  description: string;
  recoverySteps: { step: number; action: string; responsible: string; timeframe: string; status: 'Complete' | 'In Progress' | 'Pending' }[];
  dependencies: { system: string; type: string; criticality: 'Critical' | 'High' | 'Medium' | 'Low'; failoverAvailable: boolean }[];
  testResults: { date: string; type: string; result: string; duration: string; findings: string; participants: number }[];
  contacts: { name: string; role: string; phone: string; email: string; primary: boolean }[];
}

// ── Seed Data ────────────────────────────────────────────────────────────────


// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok' | 'info';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error:   { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn:    { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok:      { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    info:    { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function testResultBadge(result: BCPPlan['testResult']) {
  const map: Record<string, { bg: string; color: string }> = {
    'Pass':             { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'Pass with Issues': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Fail':             { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  };
  const c = map[result] ?? map['Pass'];
  return (
    <Badge style={{ background: c.bg, color: c.color, borderRadius: 0, fontSize: 11 }}>
      {result}
    </Badge>
  );
}

function statusBadge(status: BCPPlan['status']) {
  const map: Record<string, { bg: string; color: string }> = {
    'Active':       { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'Under Review': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Draft':        { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    'Archived':     { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' },
  };
  const c = map[status] ?? map['Active'];
  return (
    <Badge style={{ background: c.bg, color: c.color, borderRadius: 0, fontSize: 11 }}>
      {status}
    </Badge>
  );
}

function criticalityBadge(crit: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'Critical': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    'High':     { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Medium':   { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    'Low':      { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  };
  const c = map[crit] ?? map['Medium'];
  return (
    <Badge style={{ background: c.bg, color: c.color, borderRadius: 0, fontSize: 11 }}>
      {crit}
    </Badge>
  );
}

function stepStatusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'Complete':    { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'In Progress': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Pending':     { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' },
  };
  const c = map[status] ?? map['Pending'];
  return (
    <Badge style={{ background: c.bg, color: c.color, borderRadius: 0, fontSize: 10 }}>
      {status}
    </Badge>
  );
}

function normalizeBcpPlan(plan: any): BCPPlan {
  if (!plan) return {} as BCPPlan;

  let status = plan.status || 'Draft';
  if (typeof status === 'string') {
    const sLower = status.toLowerCase();
    if (sLower === 'active' || sLower === 'tested') status = 'Active';
    else if (sLower === 'under review' || sLower === 'under_review') status = 'Under Review';
    else if (sLower === 'draft') status = 'Draft';
    else if (sLower === 'archived') status = 'Archived';
  }

  const rawSteps = plan.recovery_steps || plan.recoverySteps || [];
  const recoverySteps = rawSteps.map((step: any, idx: number) => {
    if (typeof step === 'string') {
      return {
        step: idx + 1,
        action: step,
        responsible: 'DR Team',
        timeframe: 'N/A',
        status: 'Pending'
      };
    }
    return {
      step: step.step || idx + 1,
      action: step.action || '',
      responsible: step.responsible || 'DR Team',
      timeframe: step.timeframe || 'N/A',
      status: step.status || 'Pending'
    };
  });

  const rawDeps = plan.dependencies || [];
  const dependencies = rawDeps.map((dep: any) => {
    if (typeof dep === 'string') {
      return {
        system: dep,
        type: 'Dependency',
        criticality: 'High',
        failoverAvailable: false
      };
    }
    return {
      system: dep.system || '',
      type: dep.type || 'Dependency',
      criticality: dep.criticality || 'High',
      failoverAvailable: !!dep.failoverAvailable
    };
  });

  const rawContacts = plan.contacts || [];
  const contacts = rawContacts.map((c: any) => ({
    name: c.name || '',
    role: c.role || '',
    phone: c.phone || '',
    email: c.email || '',
    primary: !!c.primary
  }));

  const rawTestResults = plan.test_results || plan.testResults || [];
  const testResults = rawTestResults.map((r: any) => ({
    date: r.date || r.test_date || '',
    type: r.type || 'Drill',
    result: r.result || 'Pass',
    duration: r.duration || 'N/A',
    findings: r.findings || '',
    participants: typeof r.participants === 'number' ? r.participants : 0
  }));

  return {
    id: plan.id || `BCP-${crypto.randomUUID().slice(0, 8)}`,
    name: plan.name || plan.title || 'Unnamed Plan',
    scope: plan.scope || plan.category || 'General',
    rto: plan.rto || (plan.rto_hours ? `${plan.rto_hours}h` : 'N/A'),
    rpo: plan.rpo || (plan.rpo_hours ? `${plan.rpo_hours}h` : 'N/A'),
    lastTested: plan.lastTested || plan.last_tested || '',
    testResult: plan.testResult || plan.test_result || (plan.status === 'tested' ? 'Pass' : 'Pass with Issues'),
    owner: plan.owner || 'System',
    status: status,
    nextTest: plan.nextTest || plan.next_test || '',
    description: plan.description || plan.title || 'No description provided.',
    recoverySteps,
    dependencies,
    testResults,
    contacts
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    const target = d.getTime();
    const now = Date.now();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return isNaN(diff) ? 0 : diff;
  } catch {
    return 0;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function BusinessContinuity() {
  const orgName = useOrgName();
  const { items: liveItems, isLoading, error, refetch, save, remove } = useBcpPlansData();
  // V8 re-audit: the page previously fell back to the hardcoded BCP_PLANS
  // array whenever the table was empty — fabricated plans presented as the
  // tenant's own. An empty table now renders an honest empty state.
  const [plans, setPlans] = useState<BCPPlan[]>([]);

  useEffect(() => {
    setPlans((liveItems ?? []).map(normalizeBcpPlan));
  }, [liveItems]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail drawer
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BCPPlan | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', scope: '', rto: '', rpo: '', owner: '', status: 'Draft' as BCPPlan['status'], nextTest: '' });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<BCPPlan | null>(null);



  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return plans.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.id.toLowerCase().includes(q) &&
          !p.name.toLowerCase().includes(q) &&
          !p.scope.toLowerCase().includes(q) &&
          !p.owner.toLowerCase().includes(q)
        ) return false;
      }
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      return true;
    });
  }, [plans, search, filterStatus]);

  // ── KPIs — a metric with no underlying data renders '—', never 0/NaN. ─────
  const activePlans = plans.filter(p => p.status === 'Active' || p.status === 'Under Review').length;
  const rtoMetCount = plans.filter(p => p.testResult === 'Pass' || p.testResult === 'Pass with Issues').length;
  const rtoMetPct = plans.length ? `${Math.round((rtoMetCount / plans.length) * 100)}%` : '—';
  const rpoMetCount = plans.filter(p => p.testResult === 'Pass').length;
  const rpoMetPct = plans.length ? `${Math.round((rpoMetCount / plans.length) * 100)}%` : '—';
  // Derived from the stored records — previously a hardcoded literal date.
  const testedDates = plans.map(p => p.lastTested).filter(Boolean).sort();
  const lastTested = testedDates.length ? testedDates[testedDates.length - 1] : null;
  const lastTestDate = lastTested
    ? new Date(lastTested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openDetail = (plan: BCPPlan) => { setSelectedPlan(plan); setSheetOpen(true); };

  const handleCreate = async () => {
    if (!form.name || !form.scope || !form.rto || !form.rpo || !form.owner) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newPlan = {
      name: form.name, scope: form.scope, rto: form.rto, rpo: form.rpo,
      owner: form.owner, status: form.status, next_test: form.nextTest || '2026-12-31',
    };
    try {
      await save(newPlan);
      setCreateOpen(false);
      setForm({ name: '', scope: '', rto: '', rpo: '', owner: '', status: 'Draft', nextTest: '' });
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
    } catch {}
    if (selectedPlan?.id === deleteTarget.id) { setSheetOpen(false); setSelectedPlan(null); }
    setDeleteTarget(null);
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const csv = [
      ['Plan ID', 'Name', 'Scope', 'RTO', 'RPO', 'Last Tested', 'Test Result', 'Owner', 'Status', 'Next Test'].join(','),
      ...plans.map(p => [
        p.id,
        `"${p.name}"`,
        `"${p.scope}"`,
        p.rto,
        p.rpo,
        p.lastTested,
        `"${p.testResult}"`,
        `"${p.owner}"`,
        p.status,
        p.nextTest,
      ].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bcp-plans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('BCP plans exported as CSV');
  };

  if (isLoading) return <PageSkeleton title="Business Continuity" />;

  // A failed load is a real error — never silently replaced with sample plans.
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
          Business Continuity &amp; DR
        </h1>
        <ErrorState title="Could not load BCP plans" error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Business Continuity & DR
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} · Disaster recovery plans, RTO/RPO tracking & test management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" style={{ borderRadius: 0 }}>
            <Export size={14} />Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
            <Plus size={14} />New BCP Plan
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Active BCP Plans" value={activePlans} variant="default" />
        <MetricTile label="RTO Met %" value={rtoMetPct} variant="warn" />
        <MetricTile label="RPO Met %" value={rpoMetPct} variant="ok" />
        <MetricTile label="Last Test Date" value={lastTestDate} variant="info" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search plans by ID, name, scope, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}>
            <Funnel size={12} className="mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* BCP Plans Table — an empty org shows an honest empty state, never sample plans. */}
      {plans.length === 0 ? (
        <EmptyState
          icon={<Lifebuoy size={32} weight="duotone" />}
          title="No BCP plans yet"
          description="Record the disaster-recovery plans that cover your AI estate — RTO/RPO targets, recovery steps and test results all hang off a plan."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> New BCP Plan</Button>}
        />
      ) : (
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Plan ID', 'Name', 'Scope', 'RTO', 'RPO', 'Last Tested', 'Test Result', 'Owner', 'Status', 'Next Test', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(plan => {
                  const nextDays = daysUntil(plan.nextTest);
                  const isOverdue = nextDays < 0;
                  const isSoon = nextDays >= 0 && nextDays <= 14;
                  const isFailed = plan.testResult === 'Fail';
                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: isFailed ? '4px solid hsl(var(--destructive))' : 'none',
                      }}
                      onClick={() => openDetail(plan)}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{plan.id}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{plan.name}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{plan.scope}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{plan.rto}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{plan.rpo}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(plan.lastTested)}</span>
                      </td>
                      <td className="px-3 py-2">
                        {testResultBadge(plan.testResult)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{plan.owner}</span>
                      </td>
                      <td className="px-3 py-2">
                        {statusBadge(plan.status)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="text-xs font-mono"
                          style={{
                            color: isOverdue ? 'hsl(var(--destructive))' : isSoon ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))',
                            fontWeight: isOverdue || isSoon ? 600 : 400,
                          }}
                        >
                          {isOverdue ? 'OVERDUE' : formatDate(plan.nextTest)}
                        </span>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(plan)}>
                            <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(plan)}>
                            <Trash size={14} style={{ color: 'hsl(var(--destructive))' }} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No plans match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Plan count */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          Showing {filtered.length} of {plans.length} plans
        </p>
      </div>

      {/* ── Create Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>New BCP Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Plan Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Customer Portal DR Plan" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Scope *</Label>
                <Input value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="e.g., Customer Portal & Auth Services" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label>RTO *</Label>
                <Input value={form.rto} onChange={e => setForm(f => ({ ...f, rto: e.target.value }))} placeholder="e.g., 4h" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label>RPO *</Label>
                <Input value={form.rpo} onChange={e => setForm(f => ({ ...f, rpo: e.target.value }))} placeholder="e.g., 30min" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label>Owner *</Label>
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g., Sarah Chen" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as BCPPlan['status'] }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {(['Draft', 'Active', 'Under Review', 'Archived'] as const).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Next Test Date</Label>
                <Input type="date" value={form.nextTest} onChange={e => setForm(f => ({ ...f, nextTest: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        isDestructive
        title={`Delete "${deleteTarget?.name}"?`}
        message="This action cannot be undone. All plan data including recovery steps, test results, and contacts will be permanently removed."
        impactList={['Recovery procedures and runbooks', 'Dependency mapping and failover configs', 'DR test history and findings', 'Emergency contact records']}
        confirmLabel="Delete Plan"
      />

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedPlan && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedPlan.id}</span>
                  {statusBadge(selectedPlan.status)}
                  {testResultBadge(selectedPlan.testResult)}
                </div>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.name}</SheetTitle>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{selectedPlan.scope}</p>
              </SheetHeader>

              {/* RTO/RPO summary bar */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="p-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>RTO</p>
                  <p className="text-sm font-bold font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.rto}</p>
                </div>
                <div className="p-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>RPO</p>
                  <p className="text-sm font-bold font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.rpo}</p>
                </div>
                <div className="p-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.owner}</p>
                </div>
                <div className="p-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Next Test</p>
                  <p className="text-xs font-medium" style={{ color: daysUntil(selectedPlan.nextTest) < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                    {formatDate(selectedPlan.nextTest)}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="w-full" style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="recovery" style={{ borderRadius: 0 }}>Recovery Steps</TabsTrigger>
                  <TabsTrigger value="dependencies" style={{ borderRadius: 0 }}>Dependencies</TabsTrigger>
                  <TabsTrigger value="tests" style={{ borderRadius: 0 }}>Test Results</TabsTrigger>
                  <TabsTrigger value="contacts" style={{ borderRadius: 0 }}>Contacts</TabsTrigger>
                </TabsList>

                {/* ── Overview Tab ────────────────────────────────────────── */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Plan Owner</p>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedPlan.owner}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Status</p>
                      {statusBadge(selectedPlan.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Last Tested</p>
                      <div className="flex items-center gap-1.5">
                        <CalendarBlank size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedPlan.lastTested)}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Last Test Result</p>
                      {testResultBadge(selectedPlan.testResult)}
                    </div>
                  </div>

                  {/* Upcoming test warning */}
                  {daysUntil(selectedPlan.nextTest) <= 30 && (
                    <div
                      className="p-3 flex items-start gap-2"
                      style={{
                        background: daysUntil(selectedPlan.nextTest) < 0 ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))',
                        border: `1px solid ${daysUntil(selectedPlan.nextTest) < 0 ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-wn-br))'}`,
                        borderRadius: 0,
                      }}
                    >
                      <Timer size={16} weight="bold" style={{ color: daysUntil(selectedPlan.nextTest) < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: daysUntil(selectedPlan.nextTest) < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))' }}>
                          {daysUntil(selectedPlan.nextTest) < 0
                            ? `Test overdue by ${Math.abs(daysUntil(selectedPlan.nextTest))} days`
                            : `Next test in ${daysUntil(selectedPlan.nextTest)} days`
                          }
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          Scheduled: {formatDate(selectedPlan.nextTest)}. Regular testing ensures recovery procedures remain effective and meet compliance requirements.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Failed test warning */}
                  {selectedPlan.testResult === 'Fail' && (
                    <div className="p-3 flex items-start gap-2" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0 }}>
                      <Warning size={16} weight="bold" style={{ color: 'hsl(var(--destructive))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'hsl(var(--destructive))' }}>
                          Last DR test failed
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          Recovery objectives were not met during the last test. Immediate remediation and re-testing is required to ensure business continuity readiness.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── Recovery Steps Tab ──────────────────────────────────── */}
                <TabsContent value="recovery" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Recovery Procedure Steps</p>
                  </div>
                  <div className="space-y-2">
                    {selectedPlan.recoverySteps.map((step) => (
                      <div
                        key={step.step}
                        className="flex items-start gap-3 p-3"
                        style={{
                          background: 'hsl(var(--bg-surface))',
                          border: '1px solid hsl(var(--border))',
                          borderLeft: `3px solid ${step.status === 'Complete' ? 'hsl(var(--s-ok-tx))' : step.status === 'In Progress' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--border))'}`,
                          borderRadius: 0,
                        }}
                      >
                        <div
                          className="flex items-center justify-center w-6 h-6 flex-shrink-0 text-xs font-bold"
                          style={{
                            background: step.status === 'Complete' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--bg-muted))',
                            color: step.status === 'Complete' ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-4))',
                            borderRadius: '50%',
                          }}
                        >
                          {step.status === 'Complete' ? <CheckCircle size={14} weight="bold" /> : step.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{step.action}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{step.responsible}</span>
                            <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                              <Clock size={10} className="inline mr-0.5" />{step.timeframe}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {stepStatusBadge(step.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 text-center" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                    <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                      {selectedPlan.recoverySteps.filter(s => s.status === 'Complete').length} of {selectedPlan.recoverySteps.length} steps validated in last test
                    </p>
                  </div>
                </TabsContent>

                {/* ── Dependencies Tab ────────────────────────────────────── */}
                <TabsContent value="dependencies" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TreeStructure size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>System Dependencies</p>
                  </div>
                  <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            {['System', 'Type', 'Criticality', 'Failover'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlan.dependencies.map((dep, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              <td className="px-3 py-2">
                                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{dep.system}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{dep.type}</span>
                              </td>
                              <td className="px-3 py-2">
                                {criticalityBadge(dep.criticality)}
                              </td>
                              <td className="px-3 py-2">
                                {dep.failoverAvailable ? (
                                  <div className="flex items-center gap-1">
                                    <ShieldCheck size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                                    <span className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>Available</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Warning size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />
                                    <span className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>Not Available</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                  {selectedPlan.dependencies.some(d => !d.failoverAvailable) && (
                    <div className="p-3 flex items-start gap-2" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0 }}>
                      <Warning size={14} weight="bold" style={{ color: 'hsl(var(--s-wn-tx))', marginTop: 1 }} />
                      <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                        {selectedPlan.dependencies.filter(d => !d.failoverAvailable).length} dependency(ies) without failover capability. Consider establishing redundancy for these systems.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Test Results Tab ────────────────────────────────────── */}
                <TabsContent value="tests" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowsClockwise size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>DR Test History</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlan.testResults.map((test, i) => {
                      const resultColor = test.result === 'Pass'
                        ? { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' }
                        : test.result === 'Pass with Issues'
                        ? { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' }
                        : { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', border: 'hsl(var(--s-er-br))' };
                      return (
                        <div
                          key={i}
                          className="p-3"
                          style={{
                            background: 'hsl(var(--bg-surface))',
                            border: '1px solid hsl(var(--border))',
                            borderLeft: `3px solid ${resultColor.color}`,
                            borderRadius: 0,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(test.date)}</span>
                              <Badge style={{ background: resultColor.bg, color: resultColor.color, borderRadius: 0, fontSize: 10 }}>
                                {test.result}
                              </Badge>
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                              <Clock size={10} className="inline mr-0.5" />{test.duration}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{test.type}</span>
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                              <Users size={10} className="inline mr-0.5" />{test.participants} participants
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{test.findings}</p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* ── Contacts Tab ────────────────────────────────────────── */}
                <TabsContent value="contacts" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} style={{ color: 'hsl(var(--brand))' }} />
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Emergency Contacts</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlan.contacts.map((contact, i) => (
                      <div
                        key={i}
                        className="p-3"
                        style={{
                          background: 'hsl(var(--bg-surface))',
                          border: `1px solid ${contact.primary ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                          borderRadius: 0,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{contact.name}</span>
                            {contact.primary && (
                              <Badge style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', borderRadius: 0, fontSize: 9 }}>
                                PRIMARY
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-4))' }}>{contact.role}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} style={{ color: 'hsl(var(--text-4))' }} />
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{contact.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Envelope size={12} style={{ color: 'hsl(var(--text-4))' }} />
                            <span className="text-xs" style={{ color: 'hsl(var(--brand))' }}>{contact.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 text-center" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                    <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                      Contact information verified as of {formatDate(selectedPlan.lastTested)}. Ensure contacts are updated after personnel changes.
                    </p>
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
