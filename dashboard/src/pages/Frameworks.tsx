// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Frameworks — the single frameworks surface for the platform.
// Tabs: Portfolio (real org-scoped `frameworks` rows with their real
// `controls`) · Catalog (authoritative reference library bundled with
// Sentinel, from /frameworks/*.yaml) · Mapping (static reference crosswalk;
// org-specific cross-framework mappings are not wired to a backend yet).
// Consolidates the former Framework Catalog and Framework Mapping pages.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  StackSimple, Plus, PencilSimple, Trash, Info, CalendarCheck,
  ArrowsLeftRight, Books, MagnifyingGlass, ShieldCheck,
} from '@phosphor-icons/react';
import { useFrameworksData } from '@/hooks/useFrameworksData';
import { fetchControlsForFramework, type FrameworkRecord } from '@/services/frameworkService';
import { listFrameworks, FRAMEWORK_COUNT, TOTAL_CONTROL_COUNT, type FrameworkSummary } from '@/lib/frameworks';
import { PageSkeleton } from '../components/ui/PageSkeleton';

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function scoreColor(score: number): string {
  if (score >= 85) return 'hsl(var(--s-ok-tx))';
  if (score >= 65) return 'hsl(var(--r-hi-tx))';
  return 'hsl(var(--s-er-tx))';
}

function AuditDateDisplay({ dateStr }: { dateStr?: string | null }) {
  if (!dateStr) {
    return (
      <div className="flex items-center gap-1">
        <CalendarCheck size={12} style={{ color: 'hsl(var(--text-4))' }} />
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No audit scheduled</span>
      </div>
    );
  }
  const d = new Date(dateStr);
  const now = new Date();
  const overdue = d < now;
  const dueSoon = !overdue && d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const color = overdue ? 'hsl(var(--s-er-tx))' : dueSoon ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))';
  return (
    <div className="flex items-center gap-1">
      <CalendarCheck size={12} style={{ color }} />
      <span className="text-xs" style={{ color, fontWeight: overdue || dueSoon ? 500 : 400 }}>{formatDate(dateStr)}</span>
      {overdue && <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0, fontSize: 9, padding: '0 4px' }}>OVERDUE</Badge>}
      {dueSoon && <Badge style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0, fontSize: 9, padding: '0 4px' }}>Due Soon</Badge>}
    </div>
  );
}

const CATALOG_DOMAIN_LABEL: Record<FrameworkSummary['domain'], string> = {
  attestation: 'Attestation',
  infosec: 'Information Security',
  privacy: 'Privacy',
  cybersecurity: 'Cybersecurity',
  federal: 'Federal / Government',
  payments: 'Payments',
  healthcare: 'Healthcare',
  'ai-governance': 'AI Governance',
  financial: 'Financial Services',
};

// Static reference crosswalk between well-known framework control domains.
// This is published reference material (approximate equivalences), not
// measured org data — labeled as such in the UI.
const REFERENCE_CROSSWALK = [
  { domain: 'Access Control', iso: 'A.9 Access Control', soc: 'CC6.1 Logical Access', nist: 'PR.AC Access Control', eu: 'Art. 9(4)(b) Access Mgmt' },
  { domain: 'Risk Assessment', iso: 'A.8.2 Information Classification', soc: 'CC3.2 Risk Assessment', nist: 'GV.1 Risk Governance', eu: 'Art. 9(1) Risk Mgmt System' },
  { domain: 'Data Governance', iso: 'A.8.1 Asset Management', soc: 'CC6.5 Data Processing', nist: 'MP.1 Data Governance', eu: 'Art. 10 Data Quality' },
  { domain: 'Monitoring & Logging', iso: 'A.12.4 Logging & Monitoring', soc: 'CC7.2 System Monitoring', nist: 'MN.3 Performance Monitoring', eu: 'Art. 12 Record-keeping' },
  { domain: 'Incident Response', iso: 'A.16.1 Incident Management', soc: 'CC7.4 Incident Response', nist: 'GV.5 Incident Governance', eu: 'Art. 62 Incident Reporting' },
  { domain: 'Transparency', iso: 'A.18.1 Compliance Requirements', soc: 'CC1.4 Reporting Obligations', nist: 'MP.5 Explainability', eu: 'Art. 13 Transparency' },
  { domain: 'Human Oversight', iso: 'A.7.2 Competence & Awareness', soc: 'CC1.3 Board Oversight', nist: 'GV.3 Human Oversight', eu: 'Art. 14 Human Oversight' },
  { domain: 'Change Management', iso: 'A.14.2 Change Control', soc: 'CC8.1 Change Management', nist: 'GV.6 Change Governance', eu: 'Art. 9(2)(b) Modification Mgmt' },
];

interface FrameworkForm {
  name: string;
  version: string;
  category: string;
  jurisdiction: string;
  description: string;
  next_audit_at: string;
}

const EMPTY_FORM: FrameworkForm = { name: '', version: '', category: '', jurisdiction: '', description: '', next_audit_at: '' };

function controlStatusStyle(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'implemented') return { color: 'hsl(var(--s-ok-tx))', label: 'Implemented' };
  if (s === 'partial' || s === 'in_progress') return { color: 'hsl(var(--r-hi-tx))', label: 'Partial' };
  if (s === 'not_implemented' || s === 'planned') return { color: 'hsl(var(--text-3))', label: s === 'planned' ? 'Planned' : 'Not implemented' };
  return { color: 'hsl(var(--text-3))', label: status || 'Unknown' };
}

export default function Frameworks() {
  const { frameworks, isLoading, error, save, remove } = useFrameworksData();
  const [searchParams] = useSearchParams();

  // ?tab=portfolio|catalog|mapping selects the initial tab (used by legacy-route redirects).
  const initialTab = ['portfolio', 'catalog', 'mapping'].includes(searchParams.get('tab') || '')
    ? (searchParams.get('tab') as string)
    : 'portfolio';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewItem, setViewItem] = useState<FrameworkRecord | null>(null);
  const [editItem, setEditItem] = useState<FrameworkRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<FrameworkRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FrameworkForm>(EMPTY_FORM);
  const [catalogQuery, setCatalogQuery] = useState('');

  // Real controls for the framework opened in the detail sheet.
  const controlsQuery = useQuery({
    queryKey: ['framework-controls', viewItem?.id],
    queryFn: () => fetchControlsForFramework(viewItem!.id),
    enabled: !!viewItem?.id,
    staleTime: 60_000,
  });
  const controls = controlsQuery.data ?? [];
  const implementedControls = controls.filter(c => (c.status || '').toLowerCase() === 'implemented').length;

  const catalog = useMemo(() => listFrameworks(), []);
  const catalogGrouped = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    const filteredCat = q
      ? catalog.filter(f => f.name.toLowerCase().includes(q) || f.authority.toLowerCase().includes(q) || f.id.toLowerCase().includes(q))
      : catalog;
    const byDomain = new Map<FrameworkSummary['domain'], FrameworkSummary[]>();
    for (const f of filteredCat) {
      const list = byDomain.get(f.domain) ?? [];
      list.push(f);
      byDomain.set(f.domain, list);
    }
    return Array.from(byDomain.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog, catalogQuery]);

  async function handleCreate() {
    try {
      await save({
        name: form.name.trim(),
        version: form.version.trim() || null,
        category: form.category.trim() || null,
        jurisdiction: form.jurisdiction.trim() || null,
        description: form.description.trim() || null,
        next_audit_at: form.next_audit_at || null,
        is_active: true,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch { /* error toast raised by the hook */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try {
      await save({
        id: editItem.id,
        name: editItem.name,
        version: editItem.version,
        category: editItem.category,
        jurisdiction: editItem.jurisdiction,
        description: editItem.description,
        next_audit_at: editItem.next_audit_at || null,
        is_active: editItem.is_active,
      });
      setEditItem(null);
    } catch { /* error toast raised by the hook */ }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await remove(deleteItem.id);
      setViewItem(v => (v?.id === deleteItem.id ? null : v));
    } catch { /* error toast raised by the hook */ }
    setDeleteItem(null);
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frameworks"
        subtitle={`${frameworks.length} framework${frameworks.length !== 1 ? 's' : ''} adopted by your organization`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Frameworks' }]}
        actions={
          <Button size="sm" style={{ borderRadius: 0 }} onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
            <Plus size={14} /> Add Framework
          </Button>
        }
      />

      {error && (
        <div className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load frameworks: {(error as Error).message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <TabsTrigger value="portfolio" style={{ borderRadius: 0 }}>
            <StackSimple size={14} className="mr-1.5" /> Portfolio
          </TabsTrigger>
          <TabsTrigger value="catalog" style={{ borderRadius: 0 }}>
            <Books size={14} className="mr-1.5" /> Catalog
          </TabsTrigger>
          <TabsTrigger value="mapping" style={{ borderRadius: 0 }}>
            <ArrowsLeftRight size={14} className="mr-1.5" /> Mapping
          </TabsTrigger>
        </TabsList>

        {/* ── Portfolio (real org data) ── */}
        <TabsContent value="portfolio" className="mt-4 space-y-4">
          {frameworks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              <StackSimple size={40} />
              <p className="mt-3 text-sm font-medium">No frameworks adopted yet</p>
              <p className="text-xs mt-1">Add a framework to start tracking control implementation against it.</p>
              <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
                <Plus size={14} /> Add Framework
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworks.map((fw: FrameworkRecord) => {
                const score = Number(fw.score ?? 0);
                const total = fw.controls_total ?? fw.control_count ?? 0;
                const implemented = fw.controls_implemented ?? 0;
                return (
                  <Card
                    key={fw.id}
                    className="cursor-pointer transition-all"
                    style={{
                      background: 'hsl(var(--bg-surface))',
                      border: '1px solid hsl(var(--border))',
                      borderLeft: `4px solid ${scoreColor(score)}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                    onClick={() => setViewItem(fw)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {fw.category && (
                            <Badge style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>
                              {fw.category}
                            </Badge>
                          )}
                          {fw.jurisdiction && (
                            <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{fw.jurisdiction}</Badge>
                          )}
                          {fw.is_active === false && (
                            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>Inactive</Badge>
                          )}
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => setEditItem({ ...fw })}>
                            <PencilSimple size={12} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteItem(fw)}>
                            <Trash size={12} />
                          </Button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {fw.name}{fw.version ? <span className="text-xs font-normal ml-1.5" style={{ color: 'hsl(var(--text-4))' }}>v{fw.version}</span> : null}
                      </h3>
                      {fw.description && (
                        <p className="text-xs mb-4 line-clamp-2" style={{ color: 'hsl(var(--text-3))' }}>{fw.description}</p>
                      )}

                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span style={{ color: 'hsl(var(--text-3))' }}>Compliance Score</span>
                          <span className="font-bold" style={{ color: scoreColor(score) }}>{score}%</span>
                        </div>
                        <div style={{ background: 'hsl(var(--bg-muted))', height: 8 }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, score))}%`, height: '100%', background: scoreColor(score), transition: 'width 0.3s' }} />
                        </div>
                      </div>

                      <div className="flex justify-between text-xs mb-3">
                        <span style={{ color: 'hsl(var(--text-3))' }}>Controls</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>{implemented}/{total} implemented</span>
                      </div>

                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                        {fw.code && <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fw.code}</span>}
                        <AuditDateDisplay dateStr={fw.next_audit_at} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Catalog (authoritative reference library) ── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Framework Catalog</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                {FRAMEWORK_COUNT} authoritative GRC frameworks bundled with Sentinel ({TOTAL_CONTROL_COUNT} seed controls) — each entry links to its issuing authority
              </p>
            </div>
            <div className="relative max-w-xs w-full">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
              <Input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder="e.g. SOC 2, NIST, GDPR" className="pl-8" style={{ borderRadius: 0 }} />
            </div>
          </div>

          {catalogGrouped.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'hsl(var(--text-4))' }}>No frameworks match that search.</p>
          ) : (
            catalogGrouped.map(([domain, list]) => (
              <section key={domain} aria-label={CATALOG_DOMAIN_LABEL[domain]}>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-4))' }}>
                  {CATALOG_DOMAIN_LABEL[domain]}
                </h2>
                <ul role="list" className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {list.map(f => (
                    <li key={f.id} className="px-4 py-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                      <div className="flex justify-between gap-3">
                        <strong className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</strong>
                        <span className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>{f.control_count} controls</span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{f.authority} · {f.version}</p>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline" style={{ color: 'hsl(var(--brand))' }}>
                        View source →
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </TabsContent>

        {/* ── Mapping ── */}
        <TabsContent value="mapping" className="mt-4 space-y-4">
          <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
            <ArrowsLeftRight size={20} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Org-specific control mappings are not wired up yet</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                Cross-framework mappings of your organization's controls (which control satisfies
                which clause, with coverage and gaps) require the control-mapping backend, which has
                not shipped. Until then, the static reference crosswalk below shows commonly cited
                equivalences between major frameworks.
              </p>
            </div>
          </div>

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <p className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>Reference Crosswalk (static)</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                  Control-domain equivalences across ISO 27001, SOC 2, NIST AI RMF, and the EU AI Act
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '2px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      {['Control Domain', 'ISO 27001', 'SOC 2', 'NIST AI RMF', 'EU AI Act'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REFERENCE_CROSSWALK.map((row, idx) => (
                      <tr key={row.domain} style={{ borderBottom: '1px solid hsl(var(--border))', background: idx % 2 === 0 ? 'transparent' : 'hsl(var(--bg-muted))' }}>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{row.domain}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.iso}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.soc}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.nist}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.eu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                <Info size={14} style={{ color: 'hsl(var(--text-4))' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                  Reference material only — approximate equivalences, not your organization's measured coverage.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0, overflowY: 'auto' }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {viewItem.category && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.category}</Badge>}
                  {viewItem.jurisdiction && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.jurisdiction}</Badge>}
                  {viewItem.version && <Badge variant="outline" style={{ borderRadius: 0 }}>v{viewItem.version}</Badge>}
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="controls" style={{ borderRadius: 0 }}>
                    Controls{controls.length > 0 ? ` (${controls.length})` : ''}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {viewItem.description && (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  )}
                  {[
                    { label: 'Compliance Score', value: `${Number(viewItem.score ?? 0)}%` },
                    { label: 'Target Score', value: viewItem.target_score != null ? `${Number(viewItem.target_score)}%` : '—' },
                    { label: 'Controls Implemented', value: `${viewItem.controls_implemented ?? 0}/${viewItem.controls_total ?? viewItem.control_count ?? 0}` },
                    { label: 'Next Audit', value: formatDate(viewItem.next_audit_at) },
                    { label: 'Status', value: viewItem.is_active === false ? 'Inactive' : 'Active' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'hsl(var(--text-3))' }}>Compliance Progress</span>
                      <span style={{ color: scoreColor(Number(viewItem.score ?? 0)) }}>{Number(viewItem.score ?? 0)}%</span>
                    </div>
                    <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                      <div style={{ width: `${Math.min(100, Number(viewItem.score ?? 0))}%`, height: '100%', background: scoreColor(Number(viewItem.score ?? 0)) }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      <span>&lt;65% Non-Compliant</span>
                      <span>65–84% Partial</span>
                      <span>≥85% Compliant</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="controls" className="mt-4">
                  {controlsQuery.isLoading && (
                    <p className="text-sm py-4" style={{ color: 'hsl(var(--text-3))' }}>Loading controls…</p>
                  )}
                  {controlsQuery.error && (
                    <p className="text-sm py-4" style={{ color: 'hsl(var(--s-er-tx))' }}>
                      Failed to load controls: {(controlsQuery.error as Error).message}
                    </p>
                  )}
                  {!controlsQuery.isLoading && !controlsQuery.error && controls.length === 0 && (
                    <p className="text-sm py-4" style={{ color: 'hsl(var(--text-3))' }}>No controls loaded for this framework yet.</p>
                  )}
                  {controls.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        <ShieldCheck size={13} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                        {implementedControls} of {controls.length} implemented
                      </div>
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {controls.map(c => {
                          const st = controlStatusStyle(c.status);
                          return (
                            <div key={c.id} className="flex items-center justify-between p-2 gap-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                                  <span className="font-mono mr-1.5" style={{ color: 'hsl(var(--text-4))' }}>{c.control_ref}</span>
                                  {c.name}
                                </p>
                                {c.clause_ref && <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{c.clause_ref}</p>}
                              </div>
                              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: st.color }}>{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6">
                <Button size="sm" style={{ borderRadius: 0 }} onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Framework</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {([
                { label: 'Name', key: 'name' },
                { label: 'Version', key: 'version' },
                { label: 'Category', key: 'category' },
                { label: 'Jurisdiction', key: 'jurisdiction' },
              ] as { label: string; key: keyof FrameworkRecord }[]).map(f => (
                <div key={f.key as string}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input
                    value={(editItem[f.key] as string) || ''}
                    onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Next Audit Date</label>
                <Input
                  type="date"
                  value={editItem.next_audit_at || ''}
                  onChange={e => setEditItem(prev => prev ? { ...prev, next_audit_at: e.target.value } : null)}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
                <Textarea
                  rows={3}
                  value={editItem.description || ''}
                  onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Framework</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {([
              { label: 'Name *', key: 'name' },
              { label: 'Version', key: 'version' },
              { label: 'Category', key: 'category' },
              { label: 'Jurisdiction', key: 'jurisdiction' },
            ] as { label: string; key: keyof FrameworkForm }[]).map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Next Audit Date</label>
              <Input type="date" value={form.next_audit_at} onChange={e => setForm(prev => ({ ...prev, next_audit_at: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()} style={{ borderRadius: 0 }}>Add Framework</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Framework</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? Controls attached
              to it will lose their framework reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--destructive))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
