// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Trust Center — the org's AI transparency page: editor (left) and live
// preview (right). Sections carry independent visibility toggles; badges come
// from a curated catalog and are labelled "self-declared" unless backed by an
// active framework record; resources bind to real documents / published
// transparency reports (resolved at render — "Unavailable" when the record is
// gone) with plain URLs still allowed; subprocessors resolve from the vendor
// registry; the published-policies section lists real published policies
// live; the governance stats strip is computed from the real model inventory,
// never typed in. "View as visitor" renders the persisted published document
// read-only. Publishing stores the page config org-scoped.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Eye, EyeSlash, FloppyDisk, Plus, SealCheck, Trash } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, ErrorState } from '@/components/evals/states'
import {
  usePublishedPolicies, useTrustCenter, useTrustResourceTargets, useVendorOptions,
  type PublishedPolicyOption, type TrustResourceTarget,
} from '@/hooks/useGovernAddons'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useFrameworksData } from '@/hooks/useFrameworksData'
import { useRBAC } from '@/hooks/useRBAC'
import {
  BADGE_CATALOG, EMPTY_TRUST_DOC,
  type TrustCenterDoc, type TrustResource, type TrustResourceKind,
} from '@/services/trustCenterService'

function SectionToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--text-4))]">{label}</span>
      <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--text-4))]">
        {on ? <Eye size={13} /> : <EyeSlash size={13} />}
        <Switch checked={on} onCheckedChange={onChange} />
      </div>
    </div>
  )
}

const RESOURCE_KINDS: { value: TrustResourceKind; label: string }[] = [
  { value: 'link', label: 'External link' },
  { value: 'page', label: 'Web page' },
  { value: 'pdf', label: 'PDF (URL)' },
  { value: 'document', label: 'Document record' },
  { value: 'transparency_report', label: 'Transparency report' },
]

const isRefKind = (k: TrustResourceKind) => k === 'document' || k === 'transparency_report'

interface ResolvedResource { title: string; uri: string | null; unresolvable: boolean }

/** The public rendering of the page — shared by the editor preview and the read-only visitor view. */
function TrustPreview({ doc, stats, vendorNameById, resolveResource, publishedPolicies, badgeBacked }: {
  doc: TrustCenterDoc
  stats: { models: number; highRisk: number }
  vendorNameById: (id: string) => string | undefined
  resolveResource: (r: TrustResource) => ResolvedResource
  publishedPolicies: { items: PublishedPolicyOption[]; loading: boolean; error: Error | null }
  badgeBacked: (key: string) => boolean
}) {
  const nav = useNavigate()
  if (!doc.info.orgName) {
    return <EmptyState title="Nothing to preview" message="Give the page an organization name to start." />
  }
  const subVendors = doc.subprocessors.vendorIds.map((id) => ({ id, name: vendorNameById(id) }))
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--text-1))]">{doc.info.orgName}</h2>
        {doc.info.tagline && <p className="text-sm text-[hsl(var(--brand))]">{doc.info.tagline}</p>}
        {doc.info.heroStatement && <p className="mt-2 text-sm text-[hsl(var(--text-2))]">{doc.info.heroStatement}</p>}
      </div>

      {/* Live governance stats — computed, not typed in */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[hsl(var(--border))] p-3">
          <p className="font-mono text-lg font-bold">{stats.models}</p>
          <p className="text-[11px] text-[hsl(var(--text-4))]">AI systems under governance</p>
        </div>
        <div className="border border-[hsl(var(--border))] p-3">
          <p className="font-mono text-lg font-bold">{stats.highRisk}</p>
          <p className="text-[11px] text-[hsl(var(--text-4))]">high-risk systems under governance</p>
        </div>
      </div>

      {doc.intro.visible && doc.intro.body && (
        <p className="text-sm text-[hsl(var(--text-2))]">{doc.intro.body}</p>
      )}
      {doc.company.visible && doc.company.body && (
        <p className="text-sm text-[hsl(var(--text-2))]">{doc.company.body}</p>
      )}

      {doc.badges.visible && doc.badges.items.some((b) => b.enabled) && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Compliance & alignment</p>
          <div className="flex flex-wrap gap-2">
            {doc.badges.items.filter((b) => b.enabled).map((b) => {
              const backed = badgeBacked(b.key)
              return backed ? (
                <span key={b.key} className="inline-flex items-center gap-1 border border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-bg))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--s-ok-tx))]">
                  <SealCheck size={12} /> {b.label}
                </span>
              ) : (
                // Honest labelling: no seal, no green — the claim is
                // aspirational until a framework/conformity record backs it.
                <span key={b.key} className="inline-flex items-center gap-1 border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--text-3))]">
                  {b.label} <span className="text-[9px] uppercase text-[hsl(var(--text-4))]">self-declared</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {doc.resources.visible && doc.resources.items.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Resources</p>
          <ul className="space-y-1">
            {doc.resources.items.map((r) => {
              const res = resolveResource(r)
              return (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <ArrowSquareOut size={13} className="shrink-0 text-[hsl(var(--brand))]" />
                  {res.unresolvable ? (
                    <span className="text-[hsl(var(--text-4))]">Unavailable</span>
                  ) : res.uri ? (
                    <a href={res.uri} target="_blank" rel="noreferrer" className="text-[hsl(var(--brand))] hover:underline">{res.title}</a>
                  ) : (
                    <span className="text-[hsl(var(--brand))]">{res.title}</span>
                  )}
                  <span className="text-[10px] uppercase text-[hsl(var(--text-4))]">{r.kind.replace('_', ' ')}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {doc.policies.visible && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Published AI policies</p>
          {publishedPolicies.error ? (
            <p className="text-xs text-[hsl(var(--destructive))]">Could not load published policies: {publishedPolicies.error.message}</p>
          ) : publishedPolicies.loading ? (
            <p className="text-xs text-[hsl(var(--text-4))]">Loading policies…</p>
          ) : publishedPolicies.items.length === 0 ? (
            <p className="text-xs italic text-[hsl(var(--text-4))]">No published policies yet — this section stays empty until a policy reaches the published state.</p>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))]">
              {publishedPolicies.items.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[hsl(var(--text-1))]">{p.title}</p>
                    <p className="text-[11px] text-[hsl(var(--text-4))]">
                      {[p.category, p.version ? `v${p.version}` : null, p.effectiveDate ? `effective ${p.effectiveDate}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {doc.subprocessors.visible && subVendors.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">AI subprocessors</p>
          <div className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))]">
            {subVendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{v.name ?? 'Unavailable'}</span>
                <button className="text-[11px] text-[hsl(var(--brand))] hover:underline" onClick={() => nav(`/vendors/${v.id}`)}>
                  vendor record
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.contact.visible && (doc.contact.email || doc.contact.termsNote) && (
        <div className="border-t border-[hsl(var(--border))] pt-4 text-sm">
          {doc.contact.email && <p className="font-medium text-[hsl(var(--text-1))]">{doc.contact.email}</p>}
          {doc.contact.termsNote && <p className="mt-1 text-xs text-[hsl(var(--text-3))]">{doc.contact.termsNote}</p>}
        </div>
      )}
    </>
  )
}

export default function TrustCenterPage() {
  const { can } = useRBAC()
  const { data, isLoading, isError, error, refetch, save } = useTrustCenter()
  const { vendors, error: vendorsError } = useVendorOptions()
  const { models } = useModelOptions()
  const { frameworks } = useFrameworksData()
  const targets = useTrustResourceTargets()
  const published = usePublishedPolicies()

  const [doc, setDoc] = useState<TrustCenterDoc>(EMPTY_TRUST_DOC)
  const [isPublished, setIsPublished] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [visitorView, setVisitorView] = useState(false)

  // Hydrate editor state once per fetched config version.
  useEffect(() => {
    if (data && data.updatedAt !== loadedAt) {
      setDoc(data.doc)
      setIsPublished(data.published)
      setDirty(false)
      setLoadedAt(data.updatedAt ?? 'initial')
    }
  }, [data, loadedAt])

  const patch = (p: Partial<TrustCenterDoc>) => { setDoc((d) => ({ ...d, ...p })); setDirty(true) }

  const stats = useMemo(() => ({
    models: models.length,
    highRisk: models.filter((m: any) => m.riskTier === 'high' || m.riskTier === 'critical').length,
  }), [models])

  const vendorNameById = (id: string) => vendors.find((v) => v.id === id)?.name

  // A badge claim is "backed" only when an ACTIVE framework record matches
  // its catalog pattern — computed at render time, never stored as truth.
  const badgeBacked = useMemo(() => {
    const active = (frameworks as any[]).filter((f) => (f.status ?? '').toLowerCase() === 'active')
    return (key: string) => {
      const cat = BADGE_CATALOG.find((c) => c.key === key)
      if (!cat) return false
      return active.some((f) => cat.frameworkMatch.test(f.name ?? ''))
    }
  }, [frameworks])

  // Resolve a resource to its display title/link. Bound resources resolve
  // from the real record; a missing record renders "Unavailable".
  const resolveResource = (r: TrustResource): ResolvedResource => {
    if (!isRefKind(r.kind)) return { title: r.title || 'Untitled resource', uri: r.uri || null, unresolvable: false }
    const pool: TrustResourceTarget[] = r.kind === 'document' ? targets.documents : targets.transparencyReports
    const hit = r.refId ? pool.find((t) => t.id === r.refId) : undefined
    // While the option lists are loading we cannot distinguish "gone" from
    // "not loaded yet" — don't flash "Unavailable" prematurely.
    if (!hit && targets.loading) return { title: 'Loading…', uri: null, unresolvable: false }
    if (!hit) return { title: 'Unavailable', uri: null, unresolvable: true }
    return { title: hit.title, uri: hit.uri, unresolvable: false }
  }

  const publishedPolicies = { items: published.policies, loading: published.loading, error: published.error }

  function persist(nextPublished: boolean) {
    save.mutate({ doc, published: nextPublished }, {
      onSuccess: () => {
        setIsPublished(nextPublished)
        setDirty(false)
        setLoadedAt(null) // re-hydrate from the refetched row
        toast.success(nextPublished ? 'Trust center published' : 'Draft saved')
      },
      onError: (e: any) => toast.error(e?.message ?? 'Failed to save'),
    })
  }

  const patchResource = (i: number, p: Partial<TrustResource>) => {
    patch({ resources: { ...doc.resources, items: doc.resources.items.map((x, j) => (j === i ? { ...x, ...p } : x)) } })
  }

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading trust center…</div>
  if (isError) return <div className="p-6"><ErrorState message={error?.message} onRetry={() => refetch()} /></div>

  const availableBadges = BADGE_CATALOG.filter((c) => !doc.badges.items.some((b) => b.key === c.key))

  return (
    <div>
      <PageHeader
        title="Trust Center"
        subtitle="Your organization's AI transparency page — what customers, partners and supervisors see"
        icon={SealCheck}
        badge={isPublished
          ? <span className="bg-[hsl(var(--s-ok-bg))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--s-ok-tx))]">Published</span>
          : <span className="bg-[hsl(var(--bg-muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--text-3))]">Draft</span>}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={<Eye />} onClick={() => setVisitorView((v) => !v)}>
              {visitorView ? 'Back to editor' : 'View as visitor'}
            </Button>
            {can('update') && !visitorView && (
              <>
                <Button size="sm" variant="secondary" icon={<FloppyDisk />} loading={save.isPending} disabled={!dirty && isPublished === (data?.published ?? false)} onClick={() => persist(isPublished)}>Save</Button>
                {isPublished
                  ? <Button size="sm" variant="ghost" onClick={() => persist(false)}>Unpublish</Button>
                  : <Button size="sm" onClick={() => persist(true)}>Publish</Button>}
              </>
            )}
          </div>
        }
      />

      {visitorView ? (
        /* ── Read-only visitor view: the persisted PUBLISHED document only ── */
        <div className="mx-auto max-w-2xl">
          <Card className="overflow-hidden">
            <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-4 py-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
              Visitor view — published page{data?.publishedAt ? ` · first published ${data.publishedAt.slice(0, 10)}` : ''}
            </div>
            <CardContent className="space-y-6 p-6">
              {data?.published && data.doc ? (
                <TrustPreview
                  doc={data.doc}
                  stats={stats}
                  vendorNameById={vendorNameById}
                  resolveResource={resolveResource}
                  publishedPolicies={publishedPolicies}
                  badgeBacked={badgeBacked}
                />
              ) : (
                <EmptyState title="Not published" message="Visitors see nothing until the trust center is published. Unsaved editor changes are not shown here." />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card><CardContent className="space-y-3 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--text-4))]">Identity</p>
            <Input placeholder="Organization name" value={doc.info.orgName}
              onChange={(e) => patch({ info: { ...doc.info, orgName: e.target.value } })} />
            <Input placeholder="Tagline" value={doc.info.tagline ?? ''}
              onChange={(e) => patch({ info: { ...doc.info, tagline: e.target.value } })} />
            <Textarea rows={2} placeholder="Hero statement" value={doc.info.heroStatement ?? ''}
              onChange={(e) => patch({ info: { ...doc.info, heroStatement: e.target.value } })} />
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Introduction" on={doc.intro.visible}
              onChange={(v) => patch({ intro: { ...doc.intro, visible: v } })} />
            <Textarea rows={3} placeholder="How you govern AI…" value={doc.intro.body ?? ''}
              onChange={(e) => patch({ intro: { ...doc.intro, body: e.target.value } })} />
            <SectionToggle label="Company & oversight" on={doc.company.visible}
              onChange={(v) => patch({ company: { ...doc.company, visible: v } })} />
            <Textarea rows={3} placeholder="Human oversight, jurisdictions…" value={doc.company.body ?? ''}
              onChange={(e) => patch({ company: { ...doc.company, body: e.target.value } })} />
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Compliance badges" on={doc.badges.visible}
              onChange={(v) => patch({ badges: { ...doc.badges, visible: v } })} />
            <div className="space-y-2">
              {doc.badges.items.map((b, i) => {
                const backed = badgeBacked(b.key)
                return (
                  <div key={b.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      {b.label}
                      {backed
                        ? <span className="text-[10px] uppercase text-[hsl(var(--s-ok-tx))]">framework-backed</span>
                        : <span className="text-[10px] uppercase text-[hsl(var(--text-4))]">self-declared</span>}
                    </span>
                    <span className="flex items-center gap-1">
                      <Switch checked={b.enabled} onCheckedChange={(v) => {
                        const items = doc.badges.items.map((x, j) => (j === i ? { ...x, enabled: v } : x))
                        patch({ badges: { ...doc.badges, items } })
                      }} />
                      <Button size="sm" variant="ghost" icon={<Trash />} aria-label={`Remove badge ${b.label}`} onClick={() => {
                        patch({ badges: { ...doc.badges, items: doc.badges.items.filter((_, j) => j !== i) } })
                      }} />
                    </span>
                  </div>
                )
              })}
              {doc.badges.items.length === 0 && (
                <p className="text-xs text-[hsl(var(--text-4))]">No badges configured.</p>
              )}
              {availableBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase text-[hsl(var(--text-4))]">Add:</span>
                  {availableBadges.map((c) => (
                    <button key={c.key} type="button"
                      className="border border-[hsl(var(--border))] px-2 py-1 text-[12px] text-[hsl(var(--text-3))] hover:border-[hsl(var(--brand))]"
                      onClick={() => patch({ badges: { ...doc.badges, items: [...doc.badges.items, { key: c.key, label: c.label, enabled: true, verified: false }] } })}>
                      <Plus size={11} className="mr-1 inline" />{c.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[hsl(var(--text-4))]">
                Badges render as verified only when an active framework record backs the claim — otherwise the public page labels them self-declared.
              </p>
            </div>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Resources" on={doc.resources.visible}
              onChange={(v) => patch({ resources: { ...doc.resources, visible: v } })} />
            {targets.error && (
              <p role="alert" className="text-xs text-[hsl(var(--destructive))]">Could not load bindable records: {targets.error.message}</p>
            )}
            {doc.resources.items.map((r, i) => (
              <div key={r.id} className="space-y-2 border border-[hsl(var(--border))] p-2">
                <div className="flex items-center gap-2">
                  <Select value={r.kind} onValueChange={(v) => patchResource(i, { kind: v as TrustResourceKind, refId: undefined })}>
                    <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOURCE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" icon={<Trash />} aria-label="Remove resource" onClick={() => {
                    patch({ resources: { ...doc.resources, items: doc.resources.items.filter((_, j) => j !== i) } })
                  }} />
                </div>
                {isRefKind(r.kind) ? (
                  <Select value={r.refId ?? '__none__'} onValueChange={(v) => patchResource(i, { refId: v === '__none__' ? undefined : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={r.kind === 'document' ? 'Pick a document' : 'Pick a published report'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not bound</SelectItem>
                      {(r.kind === 'document' ? targets.documents : targets.transparencyReports).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input placeholder="Resource title" value={r.title} onChange={(e) => patchResource(i, { title: e.target.value })} />
                    <Input placeholder="https://…" value={r.uri} onChange={(e) => patchResource(i, { uri: e.target.value })} />
                  </>
                )}
                {isRefKind(r.kind) && r.kind === 'transparency_report' && (
                  <p className="text-[10px] text-[hsl(var(--text-4))]">Only published transparency reports are offered — drafts never reach the public page.</p>
                )}
              </div>
            ))}
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => {
              patch({ resources: { ...doc.resources, items: [...doc.resources.items, { id: `R${Date.now()}`, title: 'New resource', kind: 'page', uri: '' }] } })
            }}>Add resource</Button>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Published policies" on={doc.policies.visible}
              onChange={(v) => patch({ policies: { visible: v } })} />
            <p className="text-xs text-[hsl(var(--text-4))]">
              Lists your published AI policies (title, category, version, effective date) live from the policy register — the public leg of the policy lifecycle. Draft, in-review and archived policies never appear.
            </p>
            {published.error && (
              <p role="alert" className="text-xs text-[hsl(var(--destructive))]">Could not load published policies: {published.error.message}</p>
            )}
            {!published.loading && !published.error && (
              <p className="text-xs text-[hsl(var(--text-3))]">{published.policies.length} published {published.policies.length === 1 ? 'policy' : 'policies'} will be shown.</p>
            )}
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Subprocessors" on={doc.subprocessors.visible}
              onChange={(v) => patch({ subprocessors: { ...doc.subprocessors, visible: v } })} />
            <p className="text-xs text-[hsl(var(--text-4))]">Pick from the vendor registry — names stay in sync with vendor governance.</p>
            {vendorsError ? (
              <p role="alert" className="text-xs text-[hsl(var(--destructive))]">
                Could not load the vendor registry: {vendorsError.message}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {vendors.map((v) => {
                  const on = doc.subprocessors.vendorIds.includes(v.id)
                  return (
                    <button key={v.id} type="button"
                      onClick={() => patch({ subprocessors: { ...doc.subprocessors, vendorIds: on
                        ? doc.subprocessors.vendorIds.filter((x) => x !== v.id)
                        : [...doc.subprocessors.vendorIds, v.id] } })}
                      className={`border px-2 py-1 text-[12px] ${on
                        ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                        : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]'}`}>
                      {v.name}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Contact" on={doc.contact.visible}
              onChange={(v) => patch({ contact: { ...doc.contact, visible: v } })} />
            <Input placeholder="Contact email" value={doc.contact.email ?? ''}
              onChange={(e) => patch({ contact: { ...doc.contact, email: e.target.value } })} />
            <Textarea rows={2} placeholder="How customers raise questions about automated decisions…" value={doc.contact.termsNote ?? ''}
              onChange={(e) => patch({ contact: { ...doc.contact, termsNote: e.target.value } })} />
          </CardContent></Card>
        </div>

        {/* ── Preview ────────────────────────────────────────────────────── */}
        <div>
          <Card className="sticky top-4 overflow-hidden">
            <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-4 py-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
              Public page preview
            </div>
            <CardContent className="space-y-6 p-6">
              <TrustPreview
                doc={doc}
                stats={stats}
                vendorNameById={vendorNameById}
                resolveResource={resolveResource}
                publishedPolicies={publishedPolicies}
                badgeBacked={badgeBacked}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  )
}
