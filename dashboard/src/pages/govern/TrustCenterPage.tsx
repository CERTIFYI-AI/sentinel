// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Trust Center — the org's AI transparency page: editor (left) and live
// preview (right). Sections carry independent visibility toggles; badges are
// curated claims; subprocessors resolve from the vendor registry; the
// governance stats strip is computed from the real model inventory, never
// typed in. Publishing stores the page config org-scoped.

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
import { EmptyState, ErrorState } from '@/components/evals/states'
import { useTrustCenter, useVendorOptions } from '@/hooks/useGovernAddons'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import { EMPTY_TRUST_DOC, type TrustCenterDoc } from '@/services/trustCenterService'

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

export default function TrustCenterPage() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, error, refetch, save } = useTrustCenter()
  const { vendors } = useVendorOptions()
  const { models } = useModelOptions()

  const [doc, setDoc] = useState<TrustCenterDoc>(EMPTY_TRUST_DOC)
  const [published, setPublished] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)

  // Hydrate editor state once per fetched config version.
  useEffect(() => {
    if (data && data.updatedAt !== loadedAt) {
      setDoc(data.doc)
      setPublished(data.published)
      setDirty(false)
      setLoadedAt(data.updatedAt ?? 'initial')
    }
  }, [data, loadedAt])

  const patch = (p: Partial<TrustCenterDoc>) => { setDoc((d) => ({ ...d, ...p })); setDirty(true) }

  const stats = useMemo(() => ({
    models: models.length,
    highRisk: models.filter((m: any) => m.riskTier === 'high' || m.riskTier === 'critical').length,
  }), [models])

  const subVendors = doc.subprocessors.vendorIds
    .map((id) => ({ id, name: vendors.find((v) => v.id === id)?.name }))

  function persist(nextPublished: boolean) {
    save.mutate({ doc, published: nextPublished }, {
      onSuccess: () => {
        setPublished(nextPublished)
        setDirty(false)
        setLoadedAt(null) // re-hydrate from the refetched row
        toast.success(nextPublished ? 'Trust center published' : 'Draft saved')
      },
      onError: (e: any) => toast.error(e?.message ?? 'Failed to save'),
    })
  }

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading trust center…</div>
  if (isError) return <div className="p-6"><ErrorState message={error?.message} onRetry={() => refetch()} /></div>

  return (
    <div>
      <PageHeader
        title="Trust Center"
        subtitle="Your organization's AI transparency page — what customers, partners and supervisors see"
        icon={SealCheck}
        badge={published
          ? <span className="bg-[hsl(var(--s-ok-bg))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--s-ok-tx))]">Published</span>
          : <span className="bg-[hsl(var(--bg-muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--text-3))]">Draft</span>}
        actions={can('update') ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<FloppyDisk />} loading={save.isPending} disabled={!dirty && published === (data?.published ?? false)} onClick={() => persist(published)}>Save</Button>
            {published
              ? <Button size="sm" variant="ghost" onClick={() => persist(false)}>Unpublish</Button>
              : <Button size="sm" onClick={() => persist(true)}>Publish</Button>}
          </div>
        ) : undefined}
      />

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
              {doc.badges.items.map((b, i) => (
                <label key={b.key} className="flex items-center justify-between text-sm">
                  <span>{b.label}</span>
                  <Switch checked={b.enabled} onCheckedChange={(v) => {
                    const items = doc.badges.items.map((x, j) => (j === i ? { ...x, enabled: v } : x))
                    patch({ badges: { ...doc.badges, items } })
                  }} />
                </label>
              ))}
              {doc.badges.items.length === 0 && (
                <p className="text-xs text-[hsl(var(--text-4))]">No badges configured.</p>
              )}
            </div>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Resources" on={doc.resources.visible}
              onChange={(v) => patch({ resources: { ...doc.resources, visible: v } })} />
            {doc.resources.items.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                <Input className="flex-1" value={r.title} onChange={(e) => {
                  const items = doc.resources.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                  patch({ resources: { ...doc.resources, items } })
                }} />
                <Button size="sm" variant="ghost" icon={<Trash />} aria-label="Remove resource" onClick={() => {
                  patch({ resources: { ...doc.resources, items: doc.resources.items.filter((_, j) => j !== i) } })
                }} />
              </div>
            ))}
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => {
              patch({ resources: { ...doc.resources, items: [...doc.resources.items, { id: `R${Date.now()}`, title: 'New resource', kind: 'page', uri: '' }] } })
            }}>Add resource</Button>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <SectionToggle label="Subprocessors" on={doc.subprocessors.visible}
              onChange={(v) => patch({ subprocessors: { ...doc.subprocessors, visible: v } })} />
            <p className="text-xs text-[hsl(var(--text-4))]">Pick from the vendor registry — names stay in sync with vendor governance.</p>
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
              {!doc.info.orgName ? (
                <EmptyState title="Nothing to preview" message="Give the page an organization name to start." />
              ) : (
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
                      <p className="text-[11px] text-[hsl(var(--text-4))]">high-risk systems with human oversight</p>
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
                        {doc.badges.items.filter((b) => b.enabled).map((b) => (
                          <span key={b.key} className="inline-flex items-center gap-1 border border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-bg))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--s-ok-tx))]">
                            <SealCheck size={12} /> {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {doc.resources.visible && doc.resources.items.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Resources</p>
                      <ul className="space-y-1">
                        {doc.resources.items.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 text-sm text-[hsl(var(--brand))]">
                            <ArrowSquareOut size={13} /> {r.title}
                            <span className="text-[10px] uppercase text-[hsl(var(--text-4))]">{r.kind}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {doc.subprocessors.visible && subVendors.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">AI subprocessors</p>
                      <div className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))]">
                        {subVendors.map((v) => (
                          <div key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span>{v.name ?? 'Unavailable'}</span>
                            <button className="text-[11px] text-[hsl(var(--brand))] hover:underline" onClick={() => nav('/vendors')}>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
