// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// AuditTrail — the single canonical audit page for the platform
// (IA consolidation 2026-08-14: absorbs the former AuditLog, SystemAuditLog
// and AuditLogExplorer pages).
//
// Backed by the live, org-scoped `audit_log` table (RLS: org-scoped select,
// append-only — no update/delete). All platform writes are captured via
// lib/auditLogger.logAction(). Reads go through hooks/useAuditLogData →
// services/auditLogService and refresh in realtime via the global
// audit_log Realtime invalidation mounted in App.
//
// The former AuditLogExplorer hash-chain view was NOT carried over: it
// queried columns (sequence_no, row_hash, previous_hash, occurred_at) and an
// RPC (audit_log_verify_chain) that do not exist in this project's database,
// so its "chain verification" could never display real data.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockCounterClockwise, Export, Eye, Warning } from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuditLogData, type AuditLogRecord } from '@/hooks/useAuditLogData';

// ── Module badge styling (fallback for unlisted modules) ─────────────────────

const MODULE_COLORS: Record<string, { bg: string; color: string }> = {
  models: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  model: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  risk: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  risks: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  policy: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  policies: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  bias_audit: { bg: 'hsl(280 87% 65% / 0.15)', color: 'hsl(280 87% 65%)' },
  vendors: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  incidents: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  controls: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  evidence: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
};

function moduleBadge(module: string) {
  const s = MODULE_COLORS[module] ?? { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' };
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>
      {module.replace(/_/g, ' ') || 'general'}
    </Badge>
  );
}

// ── Cross-module deep links for audited entities ─────────────────────────────

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  model: id => `/models/inventory/${id}`,
  ai_model: id => `/models/inventory/${id}`,
  use_case: id => `/use-cases/${id}`,
  risk: id => `/risks?open=${id}`,
  control: id => `/controls/${id}`,
};

function entityRoute(e: AuditLogRecord): string | null {
  if (!e.entityId) return null;
  const build = ENTITY_ROUTES[e.entityType?.toLowerCase() ?? ''];
  return build ? build(e.entityId) : null;
}

/** Display label for the audited entity — never a raw uuid. */
function entityLabel(e: AuditLogRecord): string {
  if (e.entityName) return e.entityName;
  if (e.entityId) return 'Unavailable';
  return '—';
}

function filterByDateRange(entries: AuditLogRecord[], range: string): AuditLogRecord[] {
  if (range === 'all') return entries;
  const days = range === '30d' ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter(e => new Date(e.createdAt).getTime() >= cutoff);
}

function JsonBlock({ label, value, tone }: {
  label: string;
  value: Record<string, unknown>;
  tone: 'old' | 'new';
}) {
  const color = tone === 'old' ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))';
  const bg = tone === 'old' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))';
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
      <pre
        className="p-2 text-xs font-mono overflow-x-auto"
        style={{ background: bg, borderLeft: `2px solid ${color}`, color, maxHeight: 220 }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditTrail() {
  const { logs, isLoading, error } = useAuditLogData();
  const { orgName } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [viewItem, setViewItem] = useState<AuditLogRecord | null>(null);

  const modules = useMemo(
    () => Array.from(new Set(logs.map(e => e.module).filter(Boolean))).sort(),
    [logs],
  );
  const actors = useMemo(
    () => Array.from(new Set(logs.map(e => e.actorName).filter(Boolean))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return filterByDateRange(logs, dateRange).filter(e => {
      const matchSearch = !q ||
        e.action.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q) ||
        (e.entityName ?? '').toLowerCase().includes(q) ||
        e.actorName.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q);
      const matchModule = moduleFilter === 'all' || e.module === moduleFilter;
      const matchActor = actorFilter === 'all' || e.actorName === actorFilter;
      return matchSearch && matchModule && matchActor;
    });
  }, [logs, search, dateRange, moduleFilter, actorFilter]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['id', 'created_at', 'actor', 'actor_role', 'module', 'action', 'entity_type', 'entity_name', 'entity_id'];
    const rows = filtered.map(e => [
      e.id, e.createdAt, e.actorName, e.actorRole ?? '', e.module, e.action,
      e.entityType, e.entityName ?? '', e.entityId ?? '',
    ].map(v => JSON.stringify(v ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) return <PageSkeleton />;

  const activeFilterCount = (dateRange !== 'all' ? 1 : 0) + (moduleFilter !== 'all' ? 1 : 0) + (actorFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle={`${orgName} · Append-only, org-scoped record of all platform actions`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Audit Trail' }]}
        actions={
          <Button variant="outline" onClick={handleExport} disabled={!filtered.length} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4" />Export CSV
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="p-4 flex items-center gap-2" style={{
          background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--destructive))', borderRadius: 0,
        }}>
          <Warning size={16} style={{ color: 'hsl(var(--destructive))' }} />
          <span className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
            Failed to load the audit trail: {(error as Error).message}
          </span>
        </div>
      ) : (
        <>
          {/* Stats — derived from loaded events only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Events', value: logs.length },
              { label: 'Showing', value: filtered.length },
              { label: 'Actors', value: actors.length },
              { label: 'Modules', value: modules.length },
            ].map(stat => (
              <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search actions, entities, actors, modules…"
            filters={[
              {
                key: 'dateRange',
                label: 'Date Range',
                value: dateRange === 'all' ? '' : dateRange,
                onChange: v => setDateRange(v || 'all'),
                options: [
                  { label: 'Last 30 days', value: '30d' },
                  { label: 'Last 90 days', value: '90d' },
                ],
              },
              {
                key: 'module',
                label: 'Module',
                value: moduleFilter === 'all' ? '' : moduleFilter,
                onChange: v => setModuleFilter(v || 'all'),
                options: modules.map(m => ({ label: m.replace(/_/g, ' '), value: m })),
              },
              {
                key: 'actor',
                label: 'Actor',
                value: actorFilter === 'all' ? '' : actorFilter,
                onChange: v => setActorFilter(v || 'all'),
                options: actors.map(a => ({ label: a, value: a })),
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearAll={() => { setSearch(''); setDateRange('all'); setModuleFilter('all'); setActorFilter('all'); }}
            trailing={
              <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
            }
          />

          {/* Event Log */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                  <ClockCounterClockwise size={32} className="mb-2 opacity-40" />
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-3))' }}>No audit events recorded yet</p>
                  <p className="text-xs mt-1 max-w-md">
                    Actions performed across the platform — model changes, risk updates,
                    policy approvals — are captured here automatically as they happen.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <ClockCounterClockwise size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No audit events match your filters</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filtered.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : undefined }}
                      onClick={() => setViewItem(e)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <ClockCounterClockwise size={16} style={{ color: 'hsl(var(--text-4))' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{e.action}</span>
                          {moduleBadge(e.module)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            {e.entityType ? `${e.entityType.replace(/_/g, ' ')}: ` : ''}
                            <span style={{ color: 'hsl(var(--text-2))' }}>{entityLabel(e)}</span>
                          </span>
                          <span style={{ color: 'hsl(var(--border))' }}>·</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            By: <strong style={{ color: 'hsl(var(--text-1))' }}>{e.actorName}</strong>
                            {e.actorRole ? ` (${e.actorRole})` : ''}
                          </span>
                          <span style={{ color: 'hsl(var(--border))' }}>·</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={(ev) => { ev.stopPropagation(); setViewItem(e); }}>
                        <Eye size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <SheetContent className="overflow-y-auto" style={{ borderRadius: 0 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Event Detail</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-5 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Action</p><p className="font-semibold text-base">{viewItem.action}</p></div>
              <div><p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Module</p>{moduleBadge(viewItem.module)}</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{viewItem.entityType.replace(/_/g, ' ') || '—'}</span>
                  {entityRoute(viewItem) ? (
                    <Link
                      to={entityRoute(viewItem)!}
                      className="text-xs px-2 py-1 hover:opacity-80 transition-opacity"
                      style={{
                        background: 'hsl(var(--brand) / 0.08)',
                        border: '1px solid hsl(var(--brand) / 0.2)',
                        color: 'hsl(var(--brand))',
                        borderRadius: 999,
                      }}
                    >
                      {entityLabel(viewItem)}
                    </Link>
                  ) : (
                    <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{entityLabel(viewItem)}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Actor</p>
                <p className="font-medium">{viewItem.actorName}{viewItem.actorRole ? ` · ${viewItem.actorRole}` : ''}</p>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p>{new Date(viewItem.createdAt).toLocaleString()}</p></div>

              {viewItem.oldValues && Object.keys(viewItem.oldValues).length > 0 && (
                <JsonBlock label="Previous Values" value={viewItem.oldValues} tone="old" />
              )}
              {viewItem.newValues && Object.keys(viewItem.newValues).length > 0 && (
                <JsonBlock label="New Values" value={viewItem.newValues} tone="new" />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
