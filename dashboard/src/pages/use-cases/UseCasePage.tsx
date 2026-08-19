import { useState, useCallback, useMemo, Fragment } from 'react';
import {
  Eye, Trash, Plus, MagnifyingGlass, Briefcase, Rows, Warning, CircleNotch,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useUseCases } from '@/hooks/useAiiaData';
import { RISK_CLASS_OPTIONS, type UseCase, type UseCaseRiskClass } from '@/services/useCaseService';

// ── Vocabulary ───────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:         { label: 'Draft',        bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  under_review:  { label: 'Under Review', bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  active:        { label: 'Active',       bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  approved:      { label: 'Approved',     bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  retired:       { label: 'Retired',      bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
};
const STATUS_TABS: string[] = ['All', 'draft', 'under_review', 'active', 'approved', 'retired'];

const RISK_META: Record<string, { bg: string; color: string }> = {
  high:         { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  limited:      { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  minimal:      { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  unacceptable: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
};
const riskLabel = (v: string) => RISK_CLASS_OPTIONS.find(o => o.value === v)?.label ?? v;

function RiskBadge({ riskClass }: { riskClass: UseCaseRiskClass }) {
  const style = RISK_META[riskClass] ?? RISK_META.minimal;
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{riskLabel(riskClass)}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' };
  return <Badge style={{ background: meta.bg, color: meta.color, borderRadius: 0, fontSize: 10 }}>{meta.label}</Badge>;
}

// ── Main Component ───────────────────────────────────────────────────────────

const COLS = ['UC-ID', 'Title', 'Goal', 'Owner', 'Risk Class', 'Status', 'Compliance', 'Actions'];

export default function UseCasePage() {
  const navigate = useNavigate();
  const { data: useCases, isLoading, error, remove } = useUseCases();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'risk' | 'owner'>('none');
  const [deleteTarget, setDeleteTarget] = useState<UseCase | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now() + crypto.getRandomValues(new Uint32Array(1))[0];
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const owners = useMemo(() => [...new Set(useCases.map(u => u.owner).filter(Boolean))], [useCases]);
  const total = useCases.length;
  const underReview = useCases.filter(u => u.status === 'under_review').length;
  const active = useCases.filter(u => u.status === 'active').length;
  const approved = useCases.filter(u => u.status === 'approved').length;

  const filtered = useMemo(() => useCases.filter(uc => {
    if (activeTab !== 'All' && uc.status !== activeTab) return false;
    if (riskFilter !== 'all' && uc.riskClass !== riskFilter) return false;
    if (ownerFilter !== 'all' && uc.owner !== ownerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (uc.title ?? '').toLowerCase().includes(q)
        || (uc.id ?? '').toLowerCase().includes(q)
        || (uc.goal ?? '').toLowerCase().includes(q);
    }
    return true;
  }), [useCases, activeTab, riskFilter, ownerFilter, search]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', rows: filtered }];
    const map = new Map<string, UseCase[]>();
    for (const uc of filtered) {
      const key =
        groupBy === 'status' ? (STATUS_META[uc.status]?.label ?? uc.status) :
        groupBy === 'risk'   ? riskLabel(uc.riskClass) :
                               (uc.owner || 'Unassigned');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(uc);
    }
    return [...map.entries()].map(([label, rows]) => ({ key: label, label, rows }));
  }, [filtered, groupBy]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    remove.mutate(target.id, {
      onSuccess: () => toast(`${target.title} deleted`, 'info'),
      onError: (err) => toast((err as Error).message, 'error'),
    });
    setDeleteTarget(null);
  };

  const renderRow = (uc: UseCase) => (
    <tr
      key={uc.id}
      className="group transition-colors hover:bg-[hsl(var(--bg-muted))] cursor-pointer"
      onClick={() => navigate(`/use-cases/${uc.id}`)}
      style={{ borderBottom: '1px solid hsl(var(--border))' }}
    >
      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{uc.id.slice(0, 8)}</td>
      <td className="px-4 py-3">
        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{uc.title}</span>
      </td>
      <td className="px-4 py-3 text-xs max-w-[220px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{uc.goal || '—'}</td>
      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.owner || '—'}</td>
      <td className="px-4 py-3"><RiskBadge riskClass={uc.riskClass} /></td>
      <td className="px-4 py-3"><StatusBadge status={uc.status} /></td>
      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{uc.complianceScore}%</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/use-cases/${uc.id}`); }} style={{ padding: '4px 8px', height: 'auto' }}>
            <Eye size={14} /> View
          </Button>
          <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={(e) => { e.stopPropagation(); setDeleteTarget(uc); }} style={{ padding: '4px 8px', height: 'auto', color: 'hsl(var(--s-er-tx))' }}>
            <Trash size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      <PageHeader
        title="Use Case Registry"
        subtitle="Track AI use cases across the organization with risk classification and compliance mapping"
        icon={Briefcase}
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => navigate('/use-cases/new')}>New Use Case</Button>
        }
      />

      <StatCardRow cards={[
        { label: 'Total Use Cases', value: total, variant: 'default' },
        { label: 'Under Review', value: underReview, variant: 'info' },
        { label: 'Active', value: active, variant: 'warn' },
        { label: 'Approved', value: approved, variant: 'ok' },
      ]} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0 }}>
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0 }}>{t === 'All' ? 'All' : (STATUS_META[t]?.label ?? t)}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search use cases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue placeholder="Risk Classification" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Risk Classes</SelectItem>
            {RISK_CLASS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />
        <Select value={groupBy} onValueChange={v => setGroupBy(v as typeof groupBy)}>
          <SelectTrigger className="w-[150px]" style={{ borderRadius: 0 }}>
            <div className="flex items-center gap-2"><Rows size={14} /> <SelectValue placeholder="Group By" /></div>
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="risk">Risk Class</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Warning size={32} className="mb-3" style={{ color: 'hsl(var(--destructive))' }} />
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Failed to load use cases</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'hsl(var(--text-4))' }}>
              <CircleNotch size={28} className="mb-3 animate-spin" />
              <p className="text-sm">Loading use cases…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase size={32} className="mb-3" style={{ color: 'hsl(var(--text-4))' }} />
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                {total === 0 ? 'No use cases yet' : 'No use cases match your filters'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                {total === 0 ? 'Create your first use case to get started.' : 'Try adjusting search, status or risk filters.'}
              </p>
              {total === 0 && (
                <Button size="sm" className="mt-4" leftIcon={<Plus size={14} />} onClick={() => navigate('/use-cases/new')} style={{ borderRadius: 0 }}>New Use Case</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {COLS.map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <Fragment key={g.key}>
                      {g.label && (
                        <tr style={{ background: 'hsl(var(--bg-muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                          <td colSpan={COLS.length} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-3))' }}>
                            {g.label} <span style={{ color: 'hsl(var(--text-4))' }}>· {g.rows.length}</span>
                          </td>
                        </tr>
                      )}
                      {g.rows.map(renderRow)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Use Case"
        message={<span>Delete <strong>{deleteTarget?.title}</strong>? This performs a soft delete and can be restored by an administrator.</span>}
        confirmLabel="Delete"
      />
    </div>
  );
}
