// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// AuditLog — immutable record of all system actions.

import { useAuditLogData } from "@/hooks/useAuditLogData";
import { useState } from 'react';
import { ClockCounterClockwise, Export, Eye } from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { AUDIT_LOG, AuditEntry, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';


const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  model: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))' },
  risk: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  policy: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
  bias_audit: { bg: 'hsl(280 87% 65% / 0.15)', color: 'hsl(280 87% 65%)' },
  vendor: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
  incident: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  control: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
  evidence: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
};

function categoryBadge(category: string) {
  const s = CATEGORY_COLORS[category] ?? { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' };
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>
      {category.replace('_', ' ')}
    </Badge>
  );
}

// Old/new value simulation for detail drawer
const DETAIL_MAP: Record<string, { oldValue?: string; newValue?: string; metadata?: string }> = {
  'AL-001': { oldValue: 'Risk Tier: Limited', newValue: 'Risk Tier: High', metadata: 'Triggered by EU AI Act Annex III reclassification review.' },
  'AL-002': { oldValue: 'N/A', newValue: 'Status: Open · Severity: Critical · Owner: James Patel', metadata: 'Created during GDPR audit scope review.' },
  'AL-003': { oldValue: 'Status: In Review', newValue: 'Status: Approved · Approvers: Sarah Chen, Emma Wilson', metadata: '3-reviewer workflow completed in 4h 22m.' },
  'AL-004': { oldValue: 'Result: Pending', newValue: 'Result: FAILED · Score: 0.79 · Action: Remediation Required', metadata: 'BA-001 completed. Protected attributes: Race/Ethnicity, Geography.' },
  'AL-005': { oldValue: 'N/A', newValue: 'Vendor: C3.ai · Score: 55 · Status: High Risk', metadata: 'DPA not signed. Data residency concerns flagged.' },
  'AL-006': { oldValue: 'N/A', newValue: 'Status: Investigating · Severity: Critical', metadata: 'HR screening suspended pending bias audit.' },
  'AL-007': { oldValue: 'Status: Planned', newValue: 'Status: Partial · Evidence: 3 docs uploaded', metadata: 'Evidence: human-oversight-log-q1-2026.pdf, hitl-review-01.xlsx.' },
  'AL-008': { oldValue: 'N/A', newValue: '12 evidence items synced · Source: Okta', metadata: 'Automated sync. No manual intervention required.' },
};

function filterByDateRange(entries: AuditEntry[], range: string): AuditEntry[] {
  if (range === 'all') return entries;
  const now = new Date();
  const days = range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter(e => new Date(e.timestamp) >= cutoff);
}

export default function AuditLog() {
  const { logs: supabaseLogs, isLoading } = useAuditLogData();
  // Use Supabase data when available, fall back to mock AUDIT_LOG
  const effectiveAuditLog = supabaseLogs.length > 0 ? supabaseLogs as any : AUDIT_LOG; // any: union of Supabase and seed types
  const { orgName } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [viewItem, setViewItem] = useState<AuditEntry | null>(null);

  if (isLoading) return <PageSkeleton />;

  const categories = Array.from(new Set(effectiveAuditLog.map((e: any) => e.category ?? e.action ?? 'unknown')));
  const actors = Array.from(new Set(effectiveAuditLog.map((e: any) => e.actor ?? e.userId ?? '').filter(Boolean)));

  const filtered = filterByDateRange(effectiveAuditLog, dateRange).filter((e: any) => {
    const matchSearch = e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entity.toLowerCase().includes(search.toLowerCase()) ||
      (e.actor ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.category ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchActor = actorFilter === 'all' || (e.actor ?? '') === actorFilter;
    return matchSearch && matchCat && matchActor;
  });

  const handleExport = () => {
    if (!filtered.length) return;
    const keys = Object.keys(filtered[0]);
    const csv = [keys.join(','), ...filtered.map((e: any) => keys.map((k: string) => JSON.stringify(e[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'audit-log.csv';
    a.click();
  };

  const activeFilterCount = (dateRange !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (actorFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle={`${orgName} · Immutable record of all system actions`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Audit Log' }]}
        actions={
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4" />Export
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: effectiveAuditLog.length },
          { label: 'Showing', value: filtered.length },
          { label: 'Active Users', value: new Set(effectiveAuditLog.map((e: any) => e.actor ?? e.userId ?? '')).size },
          { label: 'Categories', value: categories.length },
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
        searchPlaceholder="Search events, entities, actors…"
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
            key: 'category',
            label: 'Category',
            value: categoryFilter === 'all' ? '' : categoryFilter,
            onChange: v => setCategoryFilter(v || 'all'),
            options: (categories as string[]).map(c => ({ label: c.replace('_', ' '), value: c })),
          },
          {
            key: 'actor',
            label: 'Actor',
            value: actorFilter === 'all' ? '' : actorFilter,
            onChange: v => setActorFilter(v || 'all'),
            options: (actors as string[]).map(a => ({ label: a, value: a })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setDateRange('all'); setCategoryFilter('all'); setActorFilter('all'); }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        }
      />

      {/* Event Log */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <ClockCounterClockwise size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No audit events match your filters</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filtered.map((e: any, i: number) => (
                <div
                  key={e.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : undefined }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <ClockCounterClockwise size={16} style={{ color: 'hsl(var(--text-4))' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{e.action}</span>
                      {categoryBadge(e.category)}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{e.details}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>Entity: {e.entity}</span>
                      <span style={{ color: 'hsl(var(--border))' }}>·</span>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>By: <strong style={{ color: 'hsl(var(--text-1))' }}>{e.actor}</strong></span>
                      <span style={{ color: 'hsl(var(--border))' }}>·</span>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{new Date(e.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => setViewItem(e)}>
                    <Eye size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <SheetContent style={{ borderRadius: 0 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Event Detail</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-5 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Event ID</p><p className="font-mono">{viewItem.id}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Action</p><p className="font-semibold text-base">{viewItem.action}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Category</p>{categoryBadge(viewItem.category)}</div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity</p><p>{viewItem.entity} <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>({viewItem.entityId})</span></p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Actor</p><p className="font-medium">{viewItem.actor}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p>{new Date(viewItem.timestamp).toLocaleString()}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Details</p><p className="mt-1 leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>{viewItem.details}</p></div>

              {DETAIL_MAP[viewItem.id] && (
                <>
                  {DETAIL_MAP[viewItem.id].oldValue && DETAIL_MAP[viewItem.id].oldValue !== 'N/A' && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Previous Value</p>
                      <div className="p-2 text-xs font-mono" style={{ background: 'hsl(0 72% 51% / 0.08)', borderLeft: '2px solid hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}>
                        {DETAIL_MAP[viewItem.id].oldValue}
                      </div>
                    </div>
                  )}
                  {DETAIL_MAP[viewItem.id].newValue && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>New Value</p>
                      <div className="p-2 text-xs font-mono" style={{ background: 'hsl(142 71% 45% / 0.08)', borderLeft: '2px solid hsl(var(--s-ok-tx))', color: 'hsl(var(--s-ok-tx))' }}>
                        {DETAIL_MAP[viewItem.id].newValue}
                      </div>
                    </div>
                  )}
                  {DETAIL_MAP[viewItem.id].metadata && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Metadata</p>
                      <p className="text-xs p-2" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>{DETAIL_MAP[viewItem.id].metadata}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
