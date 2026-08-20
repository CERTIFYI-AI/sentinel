// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Frameworks — the single frameworks surface for the platform.
// Tabs: Portfolio (real org-scoped `frameworks` rows with their real
// `controls`) · Catalog (authoritative reference library bundled with
// Sentinel, from /frameworks/*.yaml) · Mapping (static reference crosswalk;
// org-specific cross-framework mappings are not wired to a backend yet).
// Consolidates the former Framework Catalog and Framework Mapping pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useFrameworkCatalog } from '@/hooks/useFrameworkCatalog';
import { useFrameworkAdoptions, useAdoptFramework, useSetAdoptionStatus } from '@/hooks/queries/useFrameworkAdoptions';
import { useAllControlLinks, useRemoveLinkGlobal } from '@/hooks/queries/useControlCollab';
import { useAuthStore } from '@/store/authStore';
import { InterlinkChip } from '../components/ui/InterlinkChip';
import type { FrameworkRecord } from '@/services/frameworkService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { listFrameworks, FRAMEWORK_COUNT, TOTAL_CONTROL_COUNT, type FrameworkSummary } from '@/lib/frameworks';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { safeExternalUrl } from '@/lib/url';

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Null = unscored → neutral, never the red "<65%" treatment.
function scoreColor(score: number | null): string {
  if (score == null) return 'hsl(var(--text-4))';
  if (score >= 85) return 'hsl(var(--s-ok-tx))';
  if (score >= 65) return 'hsl(var(--r-hi-tx))';
  return 'hsl(var(--s-er-tx))';
}

/** The framework's recorded score, or null when nothing has been recorded. */
function frameworkScore(fw: FrameworkRecord): number | null {
  const raw = fw.score ?? fw.compliance_score ?? null;
  return raw == null ? null : Number(raw);
}

// ── Live org controls, matched to frameworks ─────────────────────────────────
// The `controls` table carries a free-text `framework` (e.g. "EU AI Act",
// "ISO/IEC 42001") and an optional framework_id. We derive implemented/total
// per framework from these REAL rows only — never from the catalog's
// control_count, which is reference material, not org implementation state.

interface OrgControlRow {
  id: string;
  control_id: string | null;
  control_ref: string | null;
  name: string;
  framework: string | null;
  framework_id: string | null;
  clause_ref: string | null;
  status: string | null;
}

async function fetchOrgControls(): Promise<OrgControlRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  // >1,000 controls org-wide; PostgREST caps one response at 1,000 and
  // truncates silently, so page until a short page returns.
  const PAGE = 1000;
  const all: OrgControlRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('controls')
      .select('id, control_id, control_ref, name, framework, framework_id, clause_ref, status')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as OrgControlRow[]));
    if ((data ?? []).length < PAGE) break;
  }
  return all;
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();

/**
 * A control belongs to a framework when its framework_id matches, or its
 * free-text framework label equals the framework's name/code — allowing a
 * versioned name suffix ("ISO/IEC 42001" ↔ "ISO/IEC 42001:2023"). Anything
 * that doesn't match cleanly simply doesn't count — no guessing.
 */
function controlMatchesFramework(c: OrgControlRow, fw: FrameworkRecord): boolean {
  if (c.framework_id && c.framework_id === fw.id) return true;
  const cf = norm(c.framework);
  if (!cf) return false;
  const fn = norm(fw.name);
  const fc = norm(fw.code);
  return cf === fn || (!!fc && cf === fc) || fn.startsWith(`${cf}:`) || fn.startsWith(`${cf} `);
}

const IMPLEMENTED_STATUSES = new Set(['implemented', 'effective']);

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
  if (s === 'effective') return { color: 'hsl(var(--s-ok-tx))', label: 'Effective' };
  if (s === 'partial' || s === 'in_progress') return { color: 'hsl(var(--r-hi-tx))', label: s === 'in_progress' ? 'In progress' : 'Partial' };
  if (s === 'not_implemented' || s === 'planned') return { color: 'hsl(var(--text-3))', label: s === 'planned' ? 'Planned' : 'Not implemented' };
  if (s === 'not_applicable') return { color: 'hsl(var(--text-4))', label: 'Not applicable' };
  return { color: 'hsl(var(--text-3))', label: status || 'Unknown' };
}

// The framework's PUBLISHED catalog (`framework_controls`) grouped by domain —
// what the framework requires. Distinct from the org's implemented controls
// (the "Controls" tab, from the `controls` register): this is reference
// material. Each catalog control surfaces the org controls that implement it
// (pill links), or an honest "Not yet implemented" when none resolve. Renders
// all three of skeleton / empty / error.
function FrameworkRequirements({
  fw,
}: {
  fw: FrameworkRecord;
}) {
  const catalog = useFrameworkCatalog({ id: fw.id, name: fw.name, code: fw.code ?? null });

  if (catalog.isLoading) {
    return (
      <div className="space-y-2 animate-pulse" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16" style={{ background: 'hsl(var(--bg-sunken))' }} />
        ))}
      </div>
    );
  }

  if (catalog.error) {
    return (
      <div className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
        Failed to load the published catalog for this framework: {(catalog.error as Error).message}
      </div>
    );
  }

  const data = catalog.data;
  if (!data || data.catalogCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" style={{ border: '1px dashed hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
        <Books size={30} style={{ color: 'hsl(var(--text-4))' }} />
        <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No published catalog for this framework yet</p>
        <p className="text-xs mt-1 max-w-xs" style={{ color: 'hsl(var(--text-3))' }}>
          The authoritative control catalog (framework_controls) has not been seeded for this
          framework in your organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
        <span>
          <span className="font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{data.catalogCount}</span> published control{data.catalogCount !== 1 ? 's' : ''}
        </span>
        <span title="Catalog controls with at least one implementing control in your register">
          {data.orgControlsAvailable
            ? <><span className="font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{data.implementedCatalogCount}</span> implemented in your register</>
            : 'Implementation status unavailable'}
        </span>
      </div>

      {data.groups.map((group) => (
        <section key={group.domain} aria-label={group.domain === '—' ? 'Uncategorised' : group.domain}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center justify-between" style={{ color: 'hsl(var(--text-4))' }}>
            <span>{group.domain === '—' ? 'Uncategorised' : group.domain}</span>
            <span style={{ color: 'hsl(var(--text-4))' }}>{group.controls.length}</span>
          </h3>
          <div className="space-y-2">
            {group.controls.map((cc) => (
              <div key={cc.id} className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-mono text-[11px] font-semibold" style={{ color: 'hsl(var(--brand))' }}>{cc.controlRef || '—'}</span>
                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{cc.title || '—'}</span>
                  </div>
                  {cc.controlType && (
                    <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9, flexShrink: 0 }}>{cc.controlType}</Badge>
                  )}
                </div>
                {cc.description && (
                  <p className="text-[11px] mt-1.5" style={{ color: 'hsl(var(--text-3))' }}>{cc.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {!data.orgControlsAvailable ? (
                    <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Implementation status unavailable</span>
                  ) : cc.implementedBy.length > 0 ? (
                    <>
                      <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>Implemented by</span>
                      {cc.implementedBy.map((impl) => {
                        const st = controlStatusStyle(impl.status);
                        return (
                          <InterlinkChip
                            key={impl.id}
                            label={`${impl.controlRef ?? ''}${impl.controlRef ? ' — ' : ''}${st.label}`}
                            to={`/compliance/controls?open=${impl.id}`}
                          />
                        );
                      })}
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Not yet implemented</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Frameworks() {
  const { frameworks, isLoading, error, save, remove } = useFrameworksData();
  // Compliance scope (ISO/IEC 42001 4.3): adoption records decide which
  // frameworks count toward posture. Adopt/retire is a governed, audit-logged
  // act; frameworks.is_active is derived from it.
  const adoptionsQuery = useFrameworkAdoptions();
  const adoptMutation = useAdoptFramework();
  const setAdoption = useSetAdoptionStatus();
  const authUser = useAuthStore((s) => s.user);
  const adoptionFor = (frameworkId?: string | null) =>
    (adoptionsQuery.data ?? []).find((a) => a.frameworkId === frameworkId);

  // Org-specific crosswalk (control_links), resolved to refs/names via the
  // same orgControls set the portfolio derives from — never a raw uuid.
  const linksQuery = useAllControlLinks();
  const removeLinkGlobal = useRemoveLinkGlobal();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Live org controls, matched client-side to each framework (the seeded
  // rows carry framework names, not framework_id — see matcher above).
  const controlsQuery = useQuery({
    queryKey: ['controls', 'frameworks-page'],
    queryFn: fetchOrgControls,
    staleTime: 60_000,
  });
  const orgControls = controlsQuery.data ?? [];
  const controlsForFramework = (fw: FrameworkRecord) =>
    orgControls.filter(c => controlMatchesFramework(c, fw));
  const controls = viewItem ? controlsForFramework(viewItem) : [];
  const implementedControls = controls.filter(c => IMPLEMENTED_STATUSES.has(norm(c.status))).length;

  // Published catalog for the open framework (`framework_controls`). Shares the
  // cache with the detail's Requirements tab; drives the "Published controls"
  // row in Overview, keeping the catalog count distinct from the implemented
  // count derived from the org register above.
  const openCatalog = useFrameworkCatalog(
    viewItem ? { id: viewItem.id, name: viewItem.name, code: viewItem.code ?? null } : null,
  );

  // ?open=<framework_id> opens that framework's detail (repo `?open=` deep-link
  // convention), so an org control can link back to the catalog entry it
  // satisfies. The param is consumed once the framework resolves.
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (!openParam || isLoading) return; // wait until the portfolio has loaded
    const match = frameworks.find((fw: FrameworkRecord) => fw.id === openParam);
    if (match) setViewItem(match);
    // Consume the param once resolved (or if it matches nothing) so closing the
    // sheet does not immediately reopen it.
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, isLoading, frameworks]);

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
                const score = frameworkScore(fw);
                // Live derivation from the org's controls table — never the
                // catalog's control_count presented as measured coverage.
                const fwControls = controlsForFramework(fw);
                const total = fwControls.length;
                const implemented = fwControls.filter(c => IMPLEMENTED_STATUSES.has(norm(c.status))).length;
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
                          {fw.is_active === false ? (
                            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>In library — not adopted</Badge>
                          ) : (
                            <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>Adopted</Badge>
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
                          <span className="font-bold" style={{ color: scoreColor(score) }} title={score == null ? 'No score recorded yet' : undefined}>
                            {score == null ? '—' : `${score}%`}
                          </span>
                        </div>
                        <div style={{ background: 'hsl(var(--bg-muted))', height: 8 }}>
                          {score != null && (
                            <div style={{ width: `${Math.min(100, Math.max(0, score))}%`, height: '100%', background: scoreColor(score), transition: 'width 0.3s' }} />
                          )}
                        </div>
                        {score == null && (
                          <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>No score recorded yet</p>
                        )}
                      </div>

                      <div className="flex justify-between text-xs mb-3">
                        <span style={{ color: 'hsl(var(--text-3))' }}>Controls</span>
                        {controlsQuery.isLoading ? (
                          <span style={{ color: 'hsl(var(--text-4))' }}>…</span>
                        ) : total > 0 ? (
                          <span style={{ color: 'hsl(var(--text-1))' }} title="Live count from your controls register">
                            {implemented}/{total} implemented
                          </span>
                        ) : (
                          <span style={{ color: 'hsl(var(--text-4))' }} title="No controls in your register reference this framework yet">
                            — no controls linked yet
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                        {fw.code && <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fw.code}</span>}
                        <AuditDateDisplay dateStr={fw.next_audit_at} />
                      </div>

                      {/* Adoption is the card's primary action — full width, never hidden in a corner */}
                      <div className="mt-3" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const adoption = adoptionFor(fw.id);
                          const adopted = adoption?.status === 'adopted';
                          return adopted ? (
                            <Button size="sm" variant="outline" className="w-full" style={{ borderRadius: 0 }}
                              title="Retire this framework from your compliance scope — its controls are kept, just hidden from posture"
                              disabled={setAdoption.isPending}
                              onClick={() => adoption && setAdoption.mutate({ adoptionId: adoption.id, frameworkId: fw.id!, status: 'retired' })}>
                              Retire from scope
                            </Button>
                          ) : (
                            <Button size="sm" className="w-full" style={{ borderRadius: 0 }}
                              title="Adopt this framework into your compliance scope — its controls start counting toward posture"
                              disabled={adoptMutation.isPending}
                              onClick={() => adoptMutation.mutate({ frameworkId: fw.id!, adoptedBy: authUser?.name ?? authUser?.email })}>
                              Adopt into scope
                            </Button>
                          );
                        })()}
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
                      <a href={safeExternalUrl(f.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline" style={{ color: 'hsl(var(--brand))' }}>
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
          {/* ── Org-specific crosswalk — real control_links rows ── */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div>
                  <p className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <ArrowsLeftRight size={15} style={{ color: 'hsl(var(--brand))' }} />
                    Your organization's control mappings
                    {linksQuery.data && (
                      <Badge style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>
                        {linksQuery.data.length}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                    Which of your controls satisfies, supports or overlaps which counterpart in another
                    framework. Add mappings from a control's detail sheet on the Controls page.
                  </p>
                </div>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => nav('/compliance/controls')}>
                  Open Controls
                </Button>
              </div>
              {linksQuery.isLoading ? (
                <p className="px-4 py-6 text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading mappings…</p>
              ) : linksQuery.isError ? (
                <p className="px-4 py-6 text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
                  Mappings failed to load: {(linksQuery.error as Error)?.message}
                </p>
              ) : (linksQuery.data ?? []).length === 0 ? (
                <p className="px-4 py-6 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                  No mappings yet. Open a control on the Controls page and use its
                  &ldquo;Cross-framework mappings&rdquo; panel to map it to counterparts in other frameworks.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '2px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                        {['Control', 'Framework', 'Relation', 'Maps to', 'Framework', 'Note', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(linksQuery.data ?? []).map((l, idx) => {
                        const a = orgControls.find(c => c.id === l.controlId);
                        const b = orgControls.find(c => c.id === l.relatedControlId);
                        const cell = (c?: OrgControlRow) => c
                          ? (
                            <InterlinkChip
                              label={`${c.control_ref || '—'} · ${c.name}`}
                              to={`/compliance/controls?open=${c.id}`}
                            />
                          )
                          : <span style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>;
                        return (
                          <tr key={l.id} style={{ borderBottom: '1px solid hsl(var(--border))', background: idx % 2 === 0 ? 'transparent' : 'hsl(var(--bg-muted))' }}>
                            <td className="px-3 py-2 max-w-56">{cell(a)}</td>
                            <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{a?.framework || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>
                                {l.relation}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-56">{cell(b)}</td>
                            <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{b?.framework || '—'}</td>
                            <td className="px-3 py-2 max-w-64 truncate" title={l.note ?? undefined} style={{ color: 'hsl(var(--text-4))' }}>{l.note || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: 'hsl(var(--destructive))' }}
                                title="Remove this mapping" disabled={removeLinkGlobal.isPending}
                                onClick={() => removeLinkGlobal.mutate({ id: l.id, controlId: l.controlId })}>
                                <Trash size={12} />
                              </Button>
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

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <p className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>Reference crosswalk (static, for orientation)</p>
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
                  <TabsTrigger value="requirements" style={{ borderRadius: 0 }}>
                    Requirements{openCatalog.data && openCatalog.data.catalogCount > 0 ? ` (${openCatalog.data.catalogCount})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="controls" style={{ borderRadius: 0 }}>
                    Implemented{controls.length > 0 ? ` (${controls.length})` : ''}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {viewItem.description && (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  )}
                  {[
                    { label: 'Compliance Score', value: frameworkScore(viewItem) == null ? 'No score recorded yet' : `${frameworkScore(viewItem)}%` },
                    { label: 'Target Score', value: viewItem.target_score != null ? `${Number(viewItem.target_score)}%` : '—' },
                    // Authoritative catalog size (framework_controls) — reference
                    // material, kept distinct from the implemented count below.
                    { label: 'Published Controls (catalog)', value: openCatalog.isLoading ? '…' : openCatalog.error ? 'Unavailable' : openCatalog.data ? String(openCatalog.data.catalogCount) : '—' },
                    // Live derivation from the controls register — see matcher.
                    { label: 'Controls Implemented', value: controls.length > 0 ? `${implementedControls}/${controls.length}` : '— no controls linked yet' },
                    { label: 'Next Audit', value: formatDate(viewItem.next_audit_at) },
                    { label: 'Status', value: viewItem.is_active === false ? 'Inactive' : 'Active' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  {frameworkScore(viewItem) != null ? (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'hsl(var(--text-3))' }}>Compliance Progress</span>
                        <span style={{ color: scoreColor(frameworkScore(viewItem)) }}>{frameworkScore(viewItem)}%</span>
                      </div>
                      <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                        <div style={{ width: `${Math.min(100, frameworkScore(viewItem)!)}%`, height: '100%', background: scoreColor(frameworkScore(viewItem)) }} />
                      </div>
                      <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        <span>&lt;65% Non-Compliant</span>
                        <span>65–84% Partial</span>
                        <span>≥85% Compliant</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs pt-2" style={{ color: 'hsl(var(--text-4))' }}>
                      No compliance score has been recorded for this framework yet — the progress
                      bar appears once one is measured.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="requirements" className="mt-4">
                  <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                    The framework's published control catalog — what it requires. Each entry links to
                    the control(s) in your register that implement it, or shows an honest
                    "Not yet implemented".
                  </p>
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <FrameworkRequirements fw={viewItem} />
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
                    <p className="text-sm py-4" style={{ color: 'hsl(var(--text-3))' }}>
                      No controls in your register reference this framework yet — link controls to
                      it under Compliance Controls.
                    </p>
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
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => nav(`/compliance/controls?open=${c.id}`)}
                              title="Open in Compliance Controls"
                              className="w-full flex items-center justify-between p-2 gap-3 text-left cursor-pointer transition-colors hover:bg-[hsl(var(--bg-raised))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
                              style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                                  <span className="font-mono mr-1.5" style={{ color: 'hsl(var(--text-4))' }}>{c.control_ref ?? c.control_id ?? ''}</span>
                                  {c.name}
                                </p>
                                {c.clause_ref && <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{c.clause_ref}</p>}
                              </div>
                              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: st.color }}>{st.label}</span>
                            </button>
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
