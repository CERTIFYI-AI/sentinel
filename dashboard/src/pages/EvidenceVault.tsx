// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Evidence — the single evidence surface for the platform.
// Tabs: Vault (real org-scoped `evidence` records) · Chain of Custody
// (read-only view over the append-only `evidence_chain` ledger) · Sync
// (collection-source coverage derived from real records; integrations
// pending). Consolidates the former Evidence Hub, Evidence Chain and
// Evidence Sync Engine pages.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Vault, FileText, UploadSimple, Trash, Eye, Clock, Link as LinkIcon,
  Robot, Plugs, Lock, ArrowSquareOut, Export, Cube, ShieldCheck,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useEvidenceData, useEvidenceChain } from '../hooks/useEvidenceData';
import { useModelsData } from '../hooks/useModelsData';
import { useIncidents } from '@/hooks/useRiskIncidents';
import { InterlinkChip } from '../components/ui/InterlinkChip';
import type { EvidenceRecord } from '../services/evidenceService';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCardRow } from '../components/ui/StatCardRow';
import type { StatCardRowItem } from '../components/ui/StatCardRow';
import { FilterBar } from '../components/ui/FilterBar';

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function freshnessStyle(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'fresh') return { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', label: 'Fresh' };
  if (s === 'aging') return { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Aging' };
  if (s === 'stale') return { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', label: 'Stale' };
  if (s === 'expired') return { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', label: 'Expired' };
  return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', label: status || 'Unknown' };
}

function truncateHash(h?: string | null) {
  if (!h) return '—';
  if (h.length <= 18) return h;
  return h.slice(0, 10) + '…' + h.slice(-8);
}

const EVIDENCE_TYPES = [
  'Policy Document', 'Report', 'Audit Report', 'Test Result', 'Log File',
  'Certificate', 'Attestation', 'Screenshot', 'Legal Document', 'Security Report',
  'Regulatory Filing',
];

interface UploadForm {
  title: string;
  type: string;
  source: string;
  collection_date: string;
  description: string;
  url: string;
  /** → incidents.id (uuid); empty = not linked. */
  linked_incident_id: string;
  /** → conformity_assessments.id (text ref); empty = not linked. */
  linked_assessment_id: string;
}

const EMPTY_FORM: UploadForm = {
  title: '', type: 'Report', source: '',
  collection_date: new Date().toISOString().split('T')[0],
  description: '', url: '',
  linked_incident_id: '', linked_assessment_id: '',
};

// Chain-of-custody entries reference governed entities by type + id — these
// are the modules a chain row can deep-link back into.
const CHAIN_ENTITY_ROUTES: Record<string, (id: string) => string> = {
  incident: id => `/risk/incidents?open=${id}`,
  risk: id => `/risks?open=${id}`,
  model: id => `/models/inventory/${id}`,
};

// Derived from the record's own collection date — <=30d Fresh, <=90d Aging, else Stale.
function deriveFreshness(collectionDate: string): string {
  const days = Math.floor((Date.now() - new Date(collectionDate).getTime()) / 86400000);
  if (days <= 30) return 'Fresh';
  if (days <= 90) return 'Aging';
  return 'Stale';
}

export default function EvidenceVault() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { evidence, isLoading, error, save, remove, isSaving } = useEvidenceData();
  const { chain, isLoading: chainLoading, error: chainError } = useEvidenceChain();
  const { models } = useModelsData();
  const { items: incidents } = useIncidents();

  // ?tab=vault|chain|sync selects the initial tab (used by legacy-route redirects).
  const initialTab = ['vault', 'chain', 'sync'].includes(searchParams.get('tab') || '')
    ? (searchParams.get('tab') as string)
    : 'vault';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterFreshness, setFilterFreshness] = useState('all');
  const [viewItem, setViewItem] = useState<EvidenceRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<EvidenceRecord | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);

  const types = useMemo(
    () => Array.from(new Set(evidence.map(e => e.type).filter(Boolean))) as string[],
    [evidence],
  );

  // Cross-module deep links: ?open=<id> opens a record; ?model=<uuid> filters
  // the list to records linked to that model (dismissible chip).
  const modelParam = searchParams.get('model');
  const modelFilter = modelParam ? models.find(m => m.id === modelParam) : undefined;
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || evidence.length === 0) return;
    const record = evidence.find(e => e.id === openId);
    if (record) setViewItem(record);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidence.length]);

  const filtered = useMemo(() => evidence.filter(e => {
    if (modelParam) {
      const refs = e.linked_models || [];
      const matchesModel = refs.includes(modelParam) || (modelFilter?.slug ? refs.includes(modelFilter.slug) : false);
      if (!matchesModel) return false;
    }
    const q = search.toLowerCase();
    const matchSearch = !q
      || e.title.toLowerCase().includes(q)
      || (e.source || '').toLowerCase().includes(q)
      || (e.linked_controls || []).some(c => c.toLowerCase().includes(q));
    const matchType = filterType === 'all' || e.type === filterType;
    const matchFresh = filterFreshness === 'all'
      || (e.freshness_status || '').toLowerCase() === filterFreshness;
    return matchSearch && matchType && matchFresh;
  }), [evidence, search, filterType, filterFreshness, modelParam, modelFilter]);

  const freshCount = evidence.filter(e => (e.freshness_status || '').toLowerCase() === 'fresh').length;
  const staleCount = evidence.filter(e => ['stale', 'expired'].includes((e.freshness_status || '').toLowerCase())).length;
  const autoCount = evidence.filter(e => e.auto_collected).length;

  // Collection-source coverage, derived from real records (Sync tab).
  const sources = useMemo(() => {
    const bySource = new Map<string, { count: number; auto: number; latest: string | null }>();
    for (const e of evidence) {
      const key = e.source || 'Unspecified';
      const cur = bySource.get(key) ?? { count: 0, auto: 0, latest: null };
      cur.count += 1;
      if (e.auto_collected) cur.auto += 1;
      const d = e.collection_date || e.created_at || null;
      if (d && (!cur.latest || d > cur.latest)) cur.latest = d;
      bySource.set(key, cur);
    }
    return Array.from(bySource.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [evidence]);

  // Resolve a stored model ref (ai_models.id uuid, or a legacy slug) to a
  // real model. Unresolvable refs render as "Unavailable" — never a raw id.
  const resolveModel = (ref: string) =>
    models.find(m => m.id === ref || m.slug === ref);

  // Resolved display label for a linked incident — never a raw uuid.
  const incidentLabel = (id: string) => {
    const inc = incidents.find(i => i.id === id);
    return inc ? (inc.incidentId ? `${inc.incidentId} — ${inc.title}` : inc.title) : 'Unavailable';
  };

  const handleUpload = async () => {
    try {
      await save({
        title: form.title.trim(),
        type: form.type,
        source: form.source.trim() || null,
        collection_date: form.collection_date || null,
        description: form.description.trim() || null,
        url: form.url.trim() || null,
        linked_incident_id: form.linked_incident_id || null,
        linked_assessment_id: form.linked_assessment_id.trim() || null,
        freshness_status: deriveFreshness(form.collection_date),
        auto_collected: false,
      } as Partial<EvidenceRecord>);
      toast.success(`Evidence "${form.title.trim()}" saved`);
      setUploadOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(`Failed to save evidence: ${e?.message ?? 'unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await remove(deleteItem.id);
      toast.success(`Evidence "${deleteItem.title}" removed`);
      setViewItem(v => (v?.id === deleteItem.id ? null : v));
    } catch (e: any) {
      toast.error(`Failed to remove evidence: ${e?.message ?? 'unknown error'}`);
    }
    setDeleteItem(null);
  };

  const kpis: StatCardRowItem[] = [
    { label: 'Evidence Records', value: String(evidence.length), icon: <Vault size={18} style={{ color: 'hsl(var(--brand))' }} /> },
    { label: 'Fresh', value: String(freshCount), icon: <ShieldCheck size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />, delta: `${staleCount} stale/expired` },
    { label: 'Auto-collected', value: String(autoCount), icon: <Robot size={18} style={{ color: 'hsl(var(--s-in-tx))' }} />, delta: `${evidence.length - autoCount} manual` },
    { label: 'Custody Chain Entries', value: String(chain.length), icon: <LinkIcon size={18} style={{ color: 'hsl(var(--brand))' }} /> },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence"
        subtitle="Org evidence vault, chain of custody, and collection sources"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Evidence' }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline" style={{ borderRadius: 0 }}
              disabled={evidence.length === 0}
              onClick={() => {
                exportCsv(
                  evidence.map(e => ({
                    id: e.id, title: e.title, type: e.type, source: e.source,
                    collection_date: e.collection_date, freshness: e.freshness_status,
                    linked_controls: (e.linked_controls || []).join('; '),
                  })),
                  'evidence.csv',
                );
                toast.success('Evidence CSV downloaded');
              }}
            >
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => { setForm(EMPTY_FORM); setUploadOpen(true); }}>
              <UploadSimple size={14} /> Add Evidence
            </Button>
          </div>
        }
      />

      <StatCardRow cards={kpis} />

      {error && (
        <div className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load evidence: {(error as Error).message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <TabsTrigger value="vault" style={{ borderRadius: 0 }}>
            <Vault size={14} className="mr-1.5" /> Vault
          </TabsTrigger>
          <TabsTrigger value="chain" style={{ borderRadius: 0 }}>
            <LinkIcon size={14} className="mr-1.5" /> Chain of Custody
          </TabsTrigger>
          <TabsTrigger value="sync" style={{ borderRadius: 0 }}>
            <Plugs size={14} className="mr-1.5" /> Sync
          </TabsTrigger>
        </TabsList>

        {/* ── Vault ── */}
        <TabsContent value="vault" className="mt-4 space-y-4">
          {modelParam && (
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--border))' }}>
              <Cube size={14} style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                Showing evidence linked to{' '}
                <strong style={{ color: 'hsl(var(--brand))' }}>{modelFilter ? modelFilter.name : 'Unavailable'}</strong>
              </span>
              <button
                className="ml-auto text-xs hover:underline"
                style={{ color: 'hsl(var(--brand))', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('model'); return next; }, { replace: true })}
              >
                Clear filter
              </button>
            </div>
          )}
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by title, source, or control ref…"
            filters={[
              {
                key: 'type', label: 'Type',
                value: filterType === 'all' ? '' : filterType,
                onChange: (v: string) => setFilterType(v || 'all'),
                options: types.map(t => ({ label: t, value: t })),
              },
              {
                key: 'freshness', label: 'Freshness',
                value: filterFreshness === 'all' ? '' : filterFreshness,
                onChange: (v: string) => setFilterFreshness(v || 'all'),
                options: ['fresh', 'aging', 'stale', 'expired'].map(f => ({ label: f[0].toUpperCase() + f.slice(1), value: f })),
              },
            ]}
            activeFilterCount={(filterType !== 'all' ? 1 : 0) + (filterFreshness !== 'all' ? 1 : 0)}
            onClearAll={() => { setSearch(''); setFilterType('all'); setFilterFreshness('all'); }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                {filtered.length} of {evidence.length} records
              </span>
            }
          />

          {evidence.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              <Vault size={40} />
              <p className="mt-3 text-sm font-medium">No evidence collected yet</p>
              <p className="text-xs mt-1">Add your first record — policy documents, test results, certificates, or attestations.</p>
              <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => { setForm(EMPTY_FORM); setUploadOpen(true); }}>
                <UploadSimple size={14} /> Add Evidence
              </Button>
            </div>
          ) : (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr>
                        {['Title', 'Type', 'Source', 'Linked Controls', 'Linked Models', 'Freshness', 'Collected', ''].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(e => {
                        const fs = freshnessStyle(e.freshness_status);
                        const linkedModels = (e.linked_models || []).filter(m => m && m !== 'n/a');
                        return (
                          <tr
                            key={e.id}
                            className="cursor-pointer"
                            style={{ borderTop: '1px solid hsl(var(--border))' }}
                            onMouseEnter={ev => (ev.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                            onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                            onClick={() => setViewItem(e)}
                          >
                            <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 280 }}>
                              <span className="line-clamp-2">{e.title}</span>
                            </td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.type || '—'}</td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.source || '—'}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {(e.linked_controls || []).slice(0, 3).map(c => (
                                  <span key={c} className="font-mono text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{c}</span>
                                ))}
                                {(e.linked_controls || []).length > 3 && (
                                  <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>+{(e.linked_controls || []).length - 3}</span>
                                )}
                                {(e.linked_controls || []).length === 0 && (
                                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3" onClick={ev => ev.stopPropagation()}>
                              <div className="flex flex-wrap gap-1">
                                {linkedModels.length === 0 && <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>}
                                {linkedModels.map(ref => {
                                  const m = resolveModel(ref);
                                  return m ? (
                                    <Link
                                      key={ref}
                                      to={`/models/inventory/${m.id}`}
                                      className="text-[10px] px-1.5 py-0.5 hover:underline"
                                      style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}
                                    >
                                      <Cube size={9} className="inline mr-0.5" />{m.name}
                                    </Link>
                                  ) : (
                                    <span key={ref} className="text-[10px] px-1.5 py-0.5" title="Model reference could not be resolved" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                                      Unavailable
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge style={{ background: fs.bg, color: fs.color, borderRadius: 0, fontSize: 10 }}>{fs.label}</Badge>
                            </td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(e.collection_date)}</td>
                            <td className="p-3" onClick={ev => ev.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(e)}>
                                  <Eye size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(e)}>
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
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-3))' }}>
                    <FileText size={32} />
                    <p className="mt-2 text-sm">No records match the current filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Chain of Custody ── */}
        <TabsContent value="chain" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Chain of Custody</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                Append-only, org-scoped ledger — each entry stores the hash of the previous entry
              </p>
            </div>
            {chain.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', color: 'hsl(var(--s-ok-tx))' }}>
                <Lock size={12} /> Append-only — inserts and reads only
              </div>
            )}
          </div>

          {chainError && (
            <div className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
              Failed to load custody chain: {(chainError as Error).message}
            </div>
          )}

          {!chainLoading && !chainError && chain.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              <Lock size={40} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No custody entries yet</p>
              <p className="text-xs mt-1 max-w-md">
                Hash-chain verification ships with the Workers audit pipeline. Once the pipeline
                starts sealing governance actions into the <span className="font-mono">evidence_chain</span> ledger,
                entries will appear here with their linked hashes.
              </p>
            </div>
          )}

          {chain.length > 0 && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr>
                        {['Timestamp', 'Action', 'Entity', 'Actor', 'Prev Hash', 'Hash'].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chain.map(entry => (
                        <tr key={entry.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{new Date(entry.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{entry.action}</Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                            {/* Deep link back into the source module when the
                                entity type is routable — never a raw uuid. */}
                            {(() => {
                              const route = CHAIN_ENTITY_ROUTES[(entry.entity_type || '').toLowerCase()] as
                                ((id: string) => string) | undefined;
                              return route && entry.entity_id ? (
                                <InterlinkChip label={entry.entity_type.replace(/_/g, ' ')} to={route(entry.entity_id)} />
                              ) : (
                                <span>{entry.entity_type}</span>
                              );
                            })()}
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{entry.actor || '—'}</td>
                          <td className="p-3 text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{truncateHash(entry.prev_hash)}</td>
                          <td className="p-3 text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{truncateHash(entry.hash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sync ── */}
        <TabsContent value="sync" className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Collection Sources</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              Where the vault's records came from — derived from the evidence records themselves
            </p>
          </div>

          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              <Plugs size={32} />
              <p className="mt-2 text-sm">No evidence sources yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map(([source, s]) => (
                <Card key={source} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{source}</p>
                      {s.auto > 0 ? (
                        <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                          <Robot size={10} className="mr-1 inline" />auto
                        </Badge>
                      ) : (
                        <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>{s.count} record{s.count !== 1 ? 's' : ''} · {s.auto} auto-collected</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      <Clock size={11} /> Last collected {formatDate(s.latest)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
            <Plugs size={20} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Automated evidence sync is not connected yet</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                Scheduled collection from external systems (compliance platforms, cloud providers,
                MLOps tooling) will land here once an integration is connected. Until then, records
                are added manually or by the audit pipeline.
              </p>
            </div>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => navigate('/integrations')}>
              <ArrowSquareOut size={12} /> Integrations
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0, overflowY: 'auto' }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => { const fs = freshnessStyle(viewItem.freshness_status); return (
                    <Badge style={{ background: fs.bg, color: fs.color, borderRadius: 0 }}>{fs.label}</Badge>
                  ); })()}
                  {viewItem.type && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>}
                  {viewItem.auto_collected && (
                    <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                      <Robot size={10} className="mr-1 inline" />Auto-collected
                    </Badge>
                  )}
                </div>
              </SheetHeader>
              <div className="space-y-3">
                {[
                  { label: 'Source', value: viewItem.source || '—' },
                  { label: 'Collected', value: formatDate(viewItem.collection_date) },
                  { label: 'Created', value: formatDate(viewItem.created_at) },
                  { label: 'Last Updated', value: formatDate(viewItem.updated_at) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}

                {viewItem.description && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  </div>
                )}

                <div className="pt-1">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-2))' }}>Linked Controls</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(viewItem.linked_controls || []).length === 0 && (
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No controls linked</span>
                    )}
                    {(viewItem.linked_controls || []).map(c => (
                      <span key={c} className="font-mono text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{c}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-1">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-2))' }}>Linked Models</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(viewItem.linked_models || []).filter(m => m && m !== 'n/a').length === 0 && (
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models linked</span>
                    )}
                    {(viewItem.linked_models || []).filter(m => m && m !== 'n/a').map(ref => {
                      const m = resolveModel(ref);
                      return m ? (
                        <Link key={ref} to={`/models/inventory/${m.id}`} className="text-xs px-2 py-0.5 hover:underline" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                          <Cube size={10} className="inline mr-1" />{m.name}
                        </Link>
                      ) : (
                        <span key={ref} className="text-xs px-2 py-0.5" title="Model reference could not be resolved" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                          Unavailable
                        </span>
                      );
                    })}
                  </div>
                </div>

                {(viewItem.linked_incident_id || viewItem.linked_assessment_id) && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-2))' }}>Source Records</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewItem.linked_incident_id && (
                        <InterlinkChip
                          label={incidentLabel(viewItem.linked_incident_id)}
                          to={`/risk/incidents?open=${viewItem.linked_incident_id}`}
                        />
                      )}
                      {viewItem.linked_assessment_id && (
                        <InterlinkChip
                          label={`Assessment ${viewItem.linked_assessment_id}`}
                          to={`/conformity?open=${viewItem.linked_assessment_id}`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {(viewItem.url || viewItem.file_url) && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Artifact</p>
                    <a
                      href={viewItem.url || viewItem.file_url || '#'}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs hover:underline inline-flex items-center gap-1"
                      style={{ color: 'hsl(var(--brand))' }}
                    >
                      <ArrowSquareOut size={12} /> {viewItem.file_name || viewItem.url || viewItem.file_url}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(viewItem)}>
                  <Trash size={14} /> Remove
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Evidence Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Evidence Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Title *</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Collection Date</label>
                <Input type="date" value={form.collection_date} onChange={e => setForm(p => ({ ...p, collection_date: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Source</label>
              <Input value={form.source} placeholder="e.g. Internal Audit, Vendor Trust Portal" onChange={e => setForm(p => ({ ...p, source: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Artifact URL</label>
              <Input value={form.url} placeholder="https://…" onChange={e => setForm(p => ({ ...p, url: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Source Incident (optional)</label>
                <Select
                  value={form.linked_incident_id || 'none'}
                  onValueChange={v => setForm(p => ({ ...p, linked_incident_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="none">Not linked</SelectItem>
                    {incidents.filter(i => i.id).map(i => (
                      <SelectItem key={i.id} value={i.id!}>
                        {i.incidentId ? `${i.incidentId} — ${i.title}` : i.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Assessment Ref (optional)</label>
                <Input
                  value={form.linked_assessment_id}
                  placeholder="Conformity assessment id"
                  onChange={e => setForm(p => ({ ...p, linked_assessment_id: e.target.value }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!form.title.trim() || isSaving} style={{ borderRadius: 0 }}>
              <UploadSimple size={14} /> {isSaving ? 'Saving…' : 'Save Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Remove Evidence Record</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteItem?.title}</strong> from the vault? The record is soft-deleted
              so custody history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
