// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// IntegrationCatalog — browse the published catalogue of evidence sources and
// enable/disable the ones that actually ship an adapter.
//
// The honesty rule this component exists to enforce: the catalogue lists many
// products, but only a few can collect anything today. A "Connect" button on
// all of them would promise evidence collection that cannot happen. So:
//
//   * every card states its adapter status plainly (Available / Beta /
//     Catalogued), using semantic colour, not decoration;
//   * Connect is rendered ONLY for a product with a shipped or beta adapter;
//   * a catalogued-only product says why it cannot be connected, and still
//     shows the operator prose (what evidence it would carry, how it is
//     pulled, what it maps to) because that is genuinely useful for planning.
//
// Counts come from the data, never from a constant, so the header cannot drift
// from what the catalogue actually contains.

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MagnifyingGlass, Plugs, CheckCircle, Info, LinkSimple, Prohibit,
} from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import {
  useCatalogWithConnections,
  useCatalogConnection,
  useIntegrationFindings,
  type CatalogEntryWithState,
} from '@/hooks/useIntegrationCatalog'
import { countByStatus, rankFindings } from '@/services/integrationFindingsService'
import { ConnectForm } from './ConnectForm'
import { resyncIntegration } from '@/services/integrationConnectService'
import {
  adapterStatusLabel,
  isConnectable,
  countByCategory,
  filterCatalog,
  connectableCount,
  type AdapterStatus,
  type CatalogEntry,
} from '@/services/integrationCatalogService'

/** Status pill. Colour carries meaning: only 'available' reads as ready. */
function AdapterBadge({ status }: { status: AdapterStatus }) {
  if (status === 'available') {
    return (
      <Badge className="bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-transparent">
        {adapterStatusLabel(status)}
      </Badge>
    )
  }
  if (status === 'beta') {
    return (
      <Badge className="bg-[hsl(var(--s-wa-bg))] text-[hsl(var(--s-wa-tx))] border-transparent">
        {adapterStatusLabel(status)}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[hsl(var(--text-3))]">
      {adapterStatusLabel(status)}
    </Badge>
  )
}

function CatalogCard({
  row,
  onOpen,
}: {
  row: CatalogEntryWithState
  onOpen: (row: CatalogEntryWithState) => void
}) {
  const { entry, connected } = row
  return (
    <button
      onClick={() => onOpen(row)}
      className="text-left w-full border rounded-md p-3 transition-all hover:border-[hsl(var(--brand))] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
      style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-[hsl(var(--text-1))] truncate">
          {entry.name}
        </span>
        <AdapterBadge status={entry.adapterStatus} />
      </div>
      <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1.5">
        {entry.category}
      </p>
      {entry.whyNeeded && (
        <p className="text-[12px] text-[hsl(var(--text-3))] leading-snug line-clamp-2">
          {entry.whyNeeded}
        </p>
      )}
      {connected && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--s-ok-tx))]">
          <CheckCircle size={12} weight="fill" /> Connected
        </p>
      )}
    </button>
  )
}


/**
 * What this connected source has actually collected. The reverse of the
 * control's "Automated Evidence" tab: from the source, to the findings it
 * produced. Nothing collected yet renders as an honest empty line, never as a
 * clean bill of health.
 */
function CollectedEvidence({ integrationId }: { integrationId: string }) {
  const { data, isLoading, isError, error } = useIntegrationFindings(integrationId)

  if (isLoading) {
    return (
      <div className="space-y-1.5 animate-pulse" aria-busy="true">
        {[0, 1].map(i => (
          <div key={i} className="h-9" style={{ background: 'hsl(var(--bg-sunken))' }} />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <p className="text-[12px] text-[hsl(var(--s-er-tx))]">
        Could not load collected evidence: {error?.message}
      </p>
    )
  }
  if (data.length === 0) {
    return (
      <p className="text-[12px] text-[hsl(var(--text-4))] leading-relaxed">
        Nothing collected yet. Findings appear here after the first successful sync.
      </p>
    )
  }

  const counts = countByStatus(data)
  return (
    <>
      <p className="text-[12px] text-[hsl(var(--text-3))] mb-2 tabular-nums">
        {data.length} checks · {counts.PASSED} passed · {counts.FAILED} failed ·{' '}
        {counts.WARNING} warning
      </p>
      <ul className="space-y-1.5">
        {rankFindings(data).slice(0, 8).map(f => (
          <li key={f.id} className="flex items-start justify-between gap-2">
            <span className="text-[12px] text-[hsl(var(--text-2))]">{f.title}</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
              style={{
                color:
                  f.status === 'FAILED'
                    ? 'hsl(var(--s-er-tx))'
                    : f.status === 'WARNING'
                      ? 'hsl(var(--s-wa-tx))'
                      : f.status === 'PASSED'
                        ? 'hsl(var(--s-ok-tx))'
                        : 'hsl(var(--text-4))',
              }}
            >
              {f.status}
            </span>
          </li>
        ))}
      </ul>
      {data.length > 8 && (
        <p className="text-[11px] text-[hsl(var(--text-4))] mt-2 tabular-nums">
          Showing the 8 most significant of {data.length}.
        </p>
      )}
    </>
  )
}

export function IntegrationCatalog({ canManage }: { canManage: boolean }) {
  const { rows, isLoading, isError, error } = useCatalogWithConnections()
  // `connect` is intentionally unused here: connecting now goes through the
  // backend (credentials must be encrypted server-side), so the hook's direct
  // row-create path is reserved for callers that do not collect credentials.
  const { disconnect } = useCatalogConnection()
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['integrations'] })
    qc.invalidateQueries({ queryKey: ['integration_catalog'] })
  }

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [open, setOpen] = useState<CatalogEntryWithState | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<CatalogEntryWithState | null>(null)
  // Shown only after the operator chooses to connect, so the sheet stays
  // readable for the far more common case of just browsing the catalogue.
  const [showForm, setShowForm] = useState(false)

  const entries = useMemo<CatalogEntry[]>(() => rows.map(r => r.entry), [rows])
  const counts = useMemo(() => countByCategory(entries), [entries])
  const categories = useMemo(
    () => Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)),
    [counts],
  )

  const visible = useMemo(() => {
    const filtered = filterCatalog(entries, { category, query })
    const allowed = new Set(filtered.map(e => e.slug))
    return rows.filter(r => allowed.has(r.entry.slug))
  }, [rows, entries, category, query])

  const connectedCount = rows.filter(r => r.connected).length
  const ready = connectableCount(entries)

  if (isLoading) return <TableSkeleton cols={4} />
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load the integration catalogue.'}
      />
    )
  }
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Catalogue not available"
        message="No integration catalogue rows are present. The catalogue is seeded by database migration — if this is a fresh environment, apply migrations first."
      />
    )
  }

  return (
    <div>
      {/* Header counts, derived from the data. */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3">
        <span className="text-[13px] text-[hsl(var(--text-2))]">
          <strong className="font-mono tabular-nums">{entries.length}</strong> evidence sources
          catalogued
        </span>
        <span className="text-[13px] text-[hsl(var(--text-2))]">
          <strong className="font-mono tabular-nums">{ready}</strong> connectable today
        </span>
        <span className="text-[13px] text-[hsl(var(--text-2))]">
          <strong className="font-mono tabular-nums">{connectedCount || '—'}</strong> connected
        </span>
      </div>
      <p className="text-[12px] text-[hsl(var(--text-3))] leading-relaxed mb-4 max-w-3xl">
        This is the published catalogue of what each product can evidence. Only a product with a
        shipped adapter can be connected and actually collect — the rest are listed for planning,
        and say so.
      </p>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative max-w-sm">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]"
          />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by product or evidence…"
            aria-label="Search the integration catalogue"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(null)}
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
              category === null
                ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-[hsl(var(--brand))/0.3]'
                : 'text-[hsl(var(--text-3))] border-[hsl(var(--border))] hover:bg-raised'
            }`}
          >
            All {entries.length}
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
                category === c
                  ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-[hsl(var(--brand))/0.3]'
                  : 'text-[hsl(var(--text-3))] border-[hsl(var(--border))] hover:bg-raised'
              }`}
            >
              {c} {counts[c]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No matching evidence source"
          message={`Nothing in the catalogue matches ${query ? `“${query.trim()}”` : 'this filter'}.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {visible.map(row => (
            <CatalogCard key={row.entry.slug} row={row} onOpen={setOpen} />
          ))}
        </div>
      )}

      {/* Detail + connect/disconnect */}
      <Sheet
        open={Boolean(open)}
        onOpenChange={o => {
          if (!o) {
            setOpen(null)
            setShowForm(false) // never leave a credential form mounted
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {open.entry.name}
                  <AdapterBadge status={open.entry.adapterStatus} />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
                  {open.entry.category} · tier {open.entry.tier} ·{' '}
                  <span className="font-mono">{open.entry.slug}</span>
                </p>

                {open.connected && (
                  <div className="flex items-center gap-2 text-[13px] text-[hsl(var(--s-ok-tx))]">
                    <CheckCircle size={15} weight="fill" />
                    Connected
                    {open.connected.lastRunStatus && (
                      <span className="text-[hsl(var(--text-3))]">
                        · last run {open.connected.lastRunStatus}
                      </span>
                    )}
                  </div>
                )}
                {open.connected?.lastRunError && (
                  <p className="text-[12px] text-[hsl(var(--s-er-tx))] leading-relaxed">
                    Last error: {open.connected.lastRunError}
                  </p>
                )}

                {open.connected && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-1">
                      Collected evidence
                    </h4>
                    <CollectedEvidence integrationId={open.connected.id} />
                  </section>
                )}

                {open.entry.whyNeeded && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-1">
                      What it evidences
                    </h4>
                    <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed">
                      {open.entry.whyNeeded}
                    </p>
                  </section>
                )}

                {open.entry.evidencePull && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-1">
                      How evidence is pulled
                    </h4>
                    <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed">
                      {open.entry.evidencePull}
                    </p>
                  </section>
                )}

                {open.entry.evidenceMapping && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-1">
                      What it maps to
                    </h4>
                    <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                      <LinkSimple
                        size={14}
                        className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5"
                      />
                      <span>{open.entry.evidenceMapping}</span>
                    </p>
                  </section>
                )}

                {open.entry.connectSteps && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-1">
                      Connection steps
                    </h4>
                    <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed whitespace-pre-line">
                      {open.entry.connectSteps}
                    </p>
                  </section>
                )}

                {open.entry.docsHint && (
                  <p className="text-[12px] text-[hsl(var(--text-3))] leading-relaxed">
                    Provider docs: {open.entry.docsHint}
                  </p>
                )}

                {/* The affordance, gated on real capability. */}
                <div className="pt-3 border-t border-[hsl(var(--border))]">
                  {!isConnectable(open.entry) ? (
                    <div className="flex gap-2 text-[12px] text-[hsl(var(--text-3))] leading-relaxed">
                      <Prohibit
                        size={15}
                        className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5"
                      />
                      <span>
                        Catalogued for reference only — no adapter ships for this product yet, so
                        it cannot be connected and would collect nothing. The detail above is here
                        to help you plan which sources to prioritise.
                      </span>
                    </div>
                  ) : open.connected ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          resyncIntegration(open.connected!.id)
                            .then(r => toast.success(r.message))
                            .catch((e: any) => toast.error(e?.message ?? 'Could not queue a sync'))
                        }
                      >
                        Sync now
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!canManage || disconnect.isPending}
                        onClick={() => setConfirmDisconnect(open)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : showForm ? (
                    <ConnectForm
                      slug={open.entry.slug}
                      displayName={open.entry.name}
                      onConnected={() => {
                        setShowForm(false)
                        setOpen(null)
                        refresh()
                      }}
                      onCancel={() => setShowForm(false)}
                    />
                  ) : (
                    <Button disabled={!canManage} onClick={() => setShowForm(true)}>
                      <Plugs size={14} className="mr-1.5" />
                      Connect
                    </Button>
                  )}
                  {open.entry.adapterStatus === 'beta' && (
                    <p className="text-[11px] text-[hsl(var(--warning))] mt-2 flex gap-1.5">
                      <Info size={13} className="flex-shrink-0 mt-0.5" />
                      Beta adapter: every check is implemented and unit-tested, but this
                      connector has not yet been validated against a production tenant. Read its
                      first findings before relying on them as audit evidence.
                    </p>
                  )}
                  {!canManage && isConnectable(open.entry) && (
                    <p className="text-[11px] text-[hsl(var(--text-4))] mt-2">
                      You do not have permission to change integrations.
                    </p>
                  )}
                  {isConnectable(open.entry) && !open.connected && (
                    <p className="text-[11px] text-[hsl(var(--text-4))] mt-2 flex gap-1.5">
                      <Info size={13} className="flex-shrink-0 mt-0.5" />
                      Connecting links the source to this workspace. Credentials are entered
                      separately and stored encrypted server-side — the browser never holds them.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirmDisconnect)}
        onOpenChange={o => !o && setConfirmDisconnect(null)}
        title={`Disconnect ${confirmDisconnect?.entry.name ?? ''}?`}
        description="It will stop collecting new evidence. Findings it has already produced are kept, so the audit trail stays intact."
        confirmLabel="Disconnect"
        onConfirm={() => {
          const row = confirmDisconnect
          if (!row?.connected) return
          disconnect.mutate(row.connected, {
            onSuccess: () => {
              toast.success(`${row.entry.name} disconnected`)
              setConfirmDisconnect(null)
              setOpen(null)
            },
            onError: (e: any) => toast.error(e?.message ?? 'Could not disconnect'),
          })
        }}
      />
    </div>
  )
}

export default IntegrationCatalog
