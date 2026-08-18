// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// RightSidebar — the four always-available side panels:
//
//   Get started  live setup checklist, derived from the real tables
//   User guide   the menu, documented — organised by the same sections the
//                left nav shows, with each module's own reviewed docs
//   What's new   the real release history parsed from CHANGELOG.md
//   Help         support routes plus honest build/coverage diagnostics
//
// Every number on these panels is derived from a real source:
//   · setup progress   -> live queries against the org's tables (SetupChecklist)
//   · guide content    -> docs/modules/*.md via moduleGuides.generated.ts
//   · versions/history -> CHANGELOG.md via releases.generated.ts
//
// Nothing here is hand-typed. The previous version hard-coded "Sentinel
// v1.43.0 · 2 hours ago · Release 57" and linked to a tag that was never cut;
// a module with no documentation is now shown as undocumented rather than
// given invented prose.

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Sparkle, Question, CaretLeft, House, MagnifyingGlass,
  ArrowSquareOut, ArrowRight, Rocket, FileText, Info, WarningCircle,
  Tag, Clock, LinkSimple, ShieldCheck, Gear, X,
} from '@phosphor-icons/react'

import { SetupChecklist } from '../setup/SetupChecklist'
import { groupForRoute } from '../../data/setupChecklists'
import {
  GUIDE_COLLECTIONS,
  collectionById,
  entryForRoute,
  entryByRoute,
  searchGuide,
  guideCoverage,
  type GuideCollection,
  type GuideEntry,
} from '../../data/userGuide'
import {
  TERMS_URL, PRIVACY_URL, WEBSITE_URL, CONTACT_EMAIL, CONTACT_PHONE, COMPANY,
  EXTERNAL_LINK_PROPS,
} from '../../lib/legal'
import {
  RELEASES,
  UNRELEASED,
  LATEST_VERSION,
  TOTAL_RELEASE_COUNT,
  DETAILED_RELEASE_COUNT,
  type Release,
  type ReleaseEntry,
} from '../../data/releases.generated'

type Tab = 'getStarted' | 'userGuide' | 'whatsNew' | 'help' | null

type NavState =
  | { type: 'home' }
  | { type: 'collection'; collectionId: string }
  | { type: 'entry'; collectionId: string; route: string }

// ── Small shared pieces ──────────────────────────────────────────────────────

/** Section heading inside a panel. */
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))] mb-2">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Neutral card used across all four panels so they read as one product. */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-surface border border-[hsl(var(--border))] rounded-md p-4 shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </div>
  )
}

/** Honest empty state — used wherever there is genuinely nothing to show. */
function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="text-[hsl(var(--text-4))] mb-3">{icon}</div>
      <p className="text-[13px] font-medium text-[hsl(var(--text-1))]">{title}</p>
      <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">{body}</p>
    </div>
  )
}

const TYPE_LABEL: Record<string, string> = {
  feat: 'Feature',
  fix: 'Fix',
  docs: 'Docs',
  chore: 'Chore',
  refactor: 'Refactor',
  perf: 'Performance',
  test: 'Tests',
  ci: 'CI',
  build: 'Build',
  style: 'Style',
}

/** Change-type chip. Colour is semantic, never decorative. */
function TypeChip({ type, breaking }: { type: string | null; breaking: boolean }) {
  if (breaking) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[hsl(var(--danger))/0.4] text-[hsl(var(--danger))] bg-[hsl(var(--danger))/0.08]">
        Breaking
      </span>
    )
  }
  if (!type) return null
  const isFeature = type === 'feat'
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
        isFeature
          ? 'border-[hsl(var(--brand))/0.35] text-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]'
          : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))] bg-raised'
      }`}
    >
      {TYPE_LABEL[type] ?? type}
    </span>
  )
}

function ReleaseEntryRow({ entry }: { entry: ReleaseEntry }) {
  return (
    <li className="flex gap-2 py-1.5 border-b border-[hsl(var(--border))] last:border-0">
      <div className="pt-0.5 flex-shrink-0">
        <TypeChip type={entry.type} breaking={entry.breaking} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed break-words">
          {entry.scope && (
            <span className="font-medium text-[hsl(var(--text-1))]">{entry.scope}: </span>
          )}
          {entry.summary}
        </p>
        {entry.section && (
          <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5">{entry.section}</p>
        )}
      </div>
    </li>
  )
}

// ── User guide rendering ─────────────────────────────────────────────────────

function EntryDetail({
  entry,
  onOpenModule,
}: {
  entry: GuideEntry
  onOpenModule: (route: string) => void
}) {
  // A destination with no authored doc says so. It never gets invented prose.
  if (!entry.hasDoc) {
    return (
      <div className="p-5">
        <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">{entry.label}</h2>
        <p className="text-[12px] text-[hsl(var(--text-4))] font-mono mt-1">{entry.route}</p>
        <div className="mt-5">
          <Card>
            <div className="flex gap-2">
              <WarningCircle size={18} className="text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-[hsl(var(--text-1))]">
                  Not documented yet
                </p>
                <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">
                  {entry.noDocReason ??
                    'This module has no entry in docs/modules/ yet, so there is nothing authoritative to show here. Rather than describe it from guesswork, the guide leaves it blank.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
        <button
          onClick={() => onOpenModule(entry.route)}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
        >
          Open the module <ArrowRight size={14} weight="bold" />
        </button>
      </div>
    )
  }

  return (
    <div className="p-5">
      <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))] leading-snug">{entry.title}</h2>
      <p className="text-[12px] text-[hsl(var(--text-4))] font-mono mt-1">{entry.route}</p>

      <button
        onClick={() => onOpenModule(entry.route)}
        className="mt-3 mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
      >
        Open {entry.label} <ArrowRight size={14} weight="bold" />
      </button>

      {entry.purpose && (
        <PanelSection title="Purpose">
          <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed">{entry.purpose}</p>
        </PanelSection>
      )}

      {entry.why && (
        <PanelSection title="Why it exists">
          <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed">{entry.why}</p>
        </PanelSection>
      )}

      {entry.how.length > 0 && (
        <PanelSection title="How it works">
          <ul className="space-y-1.5">
            {entry.how.map((line, i) => (
              <li key={i} className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                <span className="text-[hsl(var(--text-4))] flex-shrink-0">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {/* Where this module's data actually comes from — the tables and services
          behind the screen, so "real data process" is visible to the user. */}
      {entry.dataProcess.length > 0 && (
        <PanelSection title="Where the data comes from">
          <Card className="!p-3">
            <ul className="space-y-1.5">
              {entry.dataProcess.map((line, i) => (
                <li key={i} className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                  <ShieldCheck size={13} className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </PanelSection>
      )}

      {entry.fields.length > 0 && (
        <PanelSection title="Fields">
          <div className="overflow-x-auto border border-[hsl(var(--border))] rounded-md">
            <table className="w-full text-[12px]">
              <tbody>
                {entry.fields.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i === 0
                        ? 'bg-raised font-semibold text-[hsl(var(--text-1))]'
                        : 'border-t border-[hsl(var(--border))] text-[hsl(var(--text-2))]'
                    }
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1.5 align-top">
                        {/* Null renders as an em dash, never as 0 or blank. */}
                        {cell === '' ? '—' : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelSection>
      )}

      {entry.interlinks.length > 0 && (
        <PanelSection title="Connects to">
          <ul className="space-y-1.5">
            {entry.interlinks.map((line, i) => (
              <li key={i} className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                <LinkSimple size={13} className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {entry.compliance.length > 0 && (
        <PanelSection title="Compliance">
          <ul className="space-y-1.5">
            {entry.compliance.map((line, i) => (
              <li key={i} className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                <ShieldCheck size={13} className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {entry.operations.length > 0 && (
        <PanelSection title="Operations">
          <ul className="space-y-1.5">
            {entry.operations.map((line, i) => (
              <li key={i} className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed flex gap-2">
                <Gear size={13} className="text-[hsl(var(--text-4))] flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {entry.docPath && (
        <p className="text-[11px] text-[hsl(var(--text-4))] mt-6 pt-3 border-t border-[hsl(var(--border))]">
          Source: <span className="font-mono">{entry.docPath}</span>
        </p>
      )}
    </div>
  )
}

function CollectionList({
  collection,
  onOpenEntry,
}: {
  collection: GuideCollection
  onOpenEntry: (route: string) => void
}) {
  return (
    <div className="p-5">
      <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">{collection.title}</h2>
      <p className="text-[12px] text-[hsl(var(--text-3))] mt-1">
        {collection.entryCount} {collection.entryCount === 1 ? 'module' : 'modules'} ·{' '}
        {collection.documentedCount} documented
      </p>

      <ul className="mt-4 space-y-1">
        {collection.entries.map(entry => (
          <li key={`${entry.route}-${entry.label}`}>
            <button
              onClick={() => onOpenEntry(entry.route)}
              className={`w-full text-left rounded-md px-3 py-2 transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
                entry.parentLabel ? 'pl-7' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-[hsl(var(--text-1))] truncate">
                  {entry.label}
                </span>
                {!entry.hasDoc && (
                  <span className="text-[10px] text-[hsl(var(--text-4))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5 flex-shrink-0">
                    No doc
                  </span>
                )}
              </div>
              {entry.purpose && (
                <p className="text-[12px] text-[hsl(var(--text-3))] leading-snug mt-0.5 line-clamp-2">
                  {entry.purpose}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>(null)
  const [navState, setNavState] = useState<NavState>({ type: 'home' })
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Opening the guide lands on the module you are looking at, when the route
  // resolves to one; otherwise on the browse view.
  const openGuideInContext = () => {
    const hit = entryForRoute(location.pathname)
    setNavState(
      hit
        ? { type: 'entry', collectionId: hit.collection.id, route: hit.entry.route }
        : { type: 'home' },
    )
  }

  useEffect(() => {
    if (activeTab === 'userGuide' && navState.type === 'home' && !query) {
      openGuideInContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, location.pathname])

  const handleTabClick = (tab: Tab) => {
    if (activeTab === tab) {
      setActiveTab(null)
      return
    }
    setActiveTab(tab)
    setQuery('')
    setSearchOpen(false)
    if (tab === 'userGuide') openGuideInContext()
  }

  const navigateHome = () => {
    setNavState({ type: 'home' })
    setQuery('')
  }

  const navigateBack = () => {
    if (navState.type === 'entry') setNavState({ type: 'collection', collectionId: navState.collectionId })
    else if (navState.type === 'collection') setNavState({ type: 'home' })
  }

  const openEntry = (collectionId: string, route: string) => {
    setNavState({ type: 'entry', collectionId, route })
    setQuery('')
    setSearchOpen(false)
  }

  const openModule = (route: string) => {
    navigate(route)
    setActiveTab(null)
  }

  const results = useMemo(() => (query.trim() ? searchGuide(query) : []), [query])
  const coverage = useMemo(() => guideCoverage(), [])

  const canGoBack = activeTab === 'userGuide' && navState.type !== 'home'

  const breadcrumb = (() => {
    if (activeTab === 'getStarted') return 'Get started'
    if (activeTab === 'whatsNew') return "What's new"
    if (activeTab === 'help') return 'Help'
    if (query.trim()) return `Search · ${results.length}`
    if (navState.type === 'home') return 'Browse by section'
    const collection = collectionById(navState.collectionId)
    if (navState.type === 'collection') return collection?.title ?? 'Section'
    return entryByRoute(navState.route)?.entry.label ?? 'Module'
  })()

  return (
    <div className="flex h-full flex-shrink-0 relative">
      {activeTab && (
        <div className="w-[380px] bg-surface border-l border-[hsl(var(--border))] shadow-[-4px_0_15px_rgba(0,0,0,0.05)] flex flex-col h-full absolute right-[40px] top-0 bottom-0 z-40">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] bg-surface flex-shrink-0">
            <div className="flex items-center gap-1 text-[hsl(var(--text-3))] min-w-0">
              <button
                onClick={navigateBack}
                disabled={!canGoBack}
                aria-label="Back"
                className={`p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
                  canGoBack ? 'hover:bg-raised' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <CaretLeft size={14} />
              </button>
              {activeTab === 'userGuide' && (
                <button
                  onClick={navigateHome}
                  aria-label="All sections"
                  className="hover:bg-raised p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                >
                  <House size={14} />
                </button>
              )}
              <span className="text-[12px] font-medium text-[hsl(var(--text-1))] truncate ml-1">
                {breadcrumb}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[hsl(var(--text-3))] flex-shrink-0">
              {activeTab === 'userGuide' && (
                <button
                  onClick={() => setSearchOpen(o => !o)}
                  aria-label="Search the guide"
                  aria-pressed={searchOpen}
                  className="hover:bg-raised p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                >
                  <MagnifyingGlass size={14} />
                </button>
              )}
              <button
                onClick={() => setActiveTab(null)}
                aria-label="Close panel"
                className="hover:bg-raised p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search field */}
          {activeTab === 'userGuide' && searchOpen && (
            <div className="px-3 py-2 border-b border-[hsl(var(--border))] flex-shrink-0">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search modules…"
                aria-label="Search the user guide"
                className="w-full text-[13px] bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded px-2 py-1.5 text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-[hsl(var(--bg-page))]">
            {/* ── GET STARTED ─────────────────────────────────────────────── */}
            {activeTab === 'getStarted' && (
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">Get started</h2>
                <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">
                  A live setup checklist. Every step is checked against your real data, so it shows
                  what is actually configured — a step you cannot verify reads “Unknown”, never
                  “done”.
                </p>
                <div className="mt-4">
                  <SetupChecklist
                    groupId={groupForRoute(location.pathname)?.id}
                    onNavigate={() => setActiveTab(null)}
                  />
                </div>
                <button
                  onClick={() => handleTabClick('userGuide')}
                  className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
                >
                  Browse the full user guide <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            )}

            {/* ── USER GUIDE ──────────────────────────────────────────────── */}
            {activeTab === 'userGuide' && query.trim() && (
              <div className="p-5">
                {results.length === 0 ? (
                  <Empty
                    icon={<MagnifyingGlass size={28} />}
                    title="No matching module"
                    body={`Nothing in the guide matches “${query.trim()}”. Try a menu label such as “Policies” or “Incidents”.`}
                  />
                ) : (
                  <ul className="space-y-1">
                    {results.map(({ collection, entry }) => (
                      <li key={`${collection.id}-${entry.route}-${entry.label}`}>
                        <button
                          onClick={() => openEntry(collection.id, entry.route)}
                          className="w-full text-left rounded-md px-3 py-2 hover:bg-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                        >
                          <span className="text-[13px] font-medium text-[hsl(var(--text-1))]">
                            {entry.label}
                          </span>
                          <span className="text-[11px] text-[hsl(var(--text-4))] ml-2">
                            {collection.title}
                          </span>
                          {entry.purpose && (
                            <p className="text-[12px] text-[hsl(var(--text-3))] leading-snug mt-0.5 line-clamp-2">
                              {entry.purpose}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'userGuide' && !query.trim() && navState.type === 'home' && (
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">Browse by section</h2>
                <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">
                  The guide follows the left-hand menu exactly — the same {GUIDE_COLLECTIONS.length}{' '}
                  sections, in the same order.
                </p>
                <div className="mt-4 space-y-2">
                  {GUIDE_COLLECTIONS.map(collection => (
                    <button
                      key={collection.id}
                      onClick={() => setNavState({ type: 'collection', collectionId: collection.id })}
                      className="w-full text-left bg-surface border border-[hsl(var(--border))] rounded-md p-3 hover:border-[hsl(var(--brand))] hover:shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[13px] font-bold text-[hsl(var(--text-1))]">
                          {collection.title}
                        </h3>
                        <span className="text-[11px] bg-raised px-2 py-0.5 rounded-full text-[hsl(var(--text-3))] border border-[hsl(var(--border))] flex-shrink-0 tabular-nums">
                          {collection.entryCount}
                        </span>
                      </div>
                      {collection.documentedCount < collection.entryCount && (
                        <p className="text-[11px] text-[hsl(var(--text-4))] mt-1 tabular-nums">
                          {collection.documentedCount} of {collection.entryCount} documented
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'userGuide' && !query.trim() && navState.type === 'collection' && (
              (() => {
                const collection = collectionById(navState.collectionId)
                if (!collection) {
                  return (
                    <Empty
                      icon={<Info size={28} />}
                      title="Section unavailable"
                      body="That section is no longer part of the menu."
                    />
                  )
                }
                return (
                  <CollectionList
                    collection={collection}
                    onOpenEntry={route => openEntry(collection.id, route)}
                  />
                )
              })()
            )}

            {activeTab === 'userGuide' && !query.trim() && navState.type === 'entry' && (
              (() => {
                const hit = entryByRoute(navState.route)
                if (!hit) {
                  return (
                    <Empty
                      icon={<Info size={28} />}
                      title="Module unavailable"
                      body="That module is no longer part of the menu."
                    />
                  )
                }
                return <EntryDetail entry={hit.entry} onOpenModule={openModule} />
              })()
            )}

            {/* ── WHAT'S NEW ──────────────────────────────────────────────── */}
            {activeTab === 'whatsNew' && (
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">What's new</h2>
                <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">
                  Straight from the repository's changelog — {TOTAL_RELEASE_COUNT} releases recorded.
                </p>

                {LATEST_VERSION === null && RELEASES.length === 0 ? (
                  <div className="mt-4">
                    <Empty
                      icon={<Sparkle size={28} />}
                      title="No releases recorded"
                      body="CHANGELOG.md has no released versions yet."
                    />
                  </div>
                ) : (
                  <>
                    {UNRELEASED.entryCount > 0 && (
                      <div className="mt-4">
                        <Card>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={15} className="text-[hsl(var(--text-3))]" />
                            <span className="text-[13px] font-semibold text-[hsl(var(--text-1))]">
                              Unreleased
                            </span>
                            <span className="text-[11px] text-[hsl(var(--text-4))] tabular-nums">
                              {UNRELEASED.entryCount} change
                              {UNRELEASED.entryCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[hsl(var(--text-4))] mb-2 leading-relaxed">
                            Merged, not yet cut into a version.
                          </p>
                          <ul>
                            {UNRELEASED.entries.map((e, i) => (
                              <ReleaseEntryRow key={i} entry={e} />
                            ))}
                          </ul>
                        </Card>
                      </div>
                    )}

                    <div className="mt-4 space-y-3">
                      {RELEASES.map((release: Release) => (
                        <Card key={release.version}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag size={15} className="text-[hsl(var(--brand))] flex-shrink-0" />
                              <span className="text-[13px] font-semibold text-[hsl(var(--text-1))] truncate">
                                v{release.version}
                              </span>
                              {release.version === LATEST_VERSION && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[hsl(var(--brand))/0.35] text-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] flex-shrink-0">
                                  Latest
                                </span>
                              )}
                            </div>
                            {/* Dates come from the changelog; no date renders as
                                an em dash rather than a guessed one. */}
                            <span className="text-[11px] text-[hsl(var(--text-3))] font-mono flex-shrink-0 tabular-nums">
                              {release.date ?? '—'}
                            </span>
                          </div>

                          {release.detailed ? (
                            <ul>
                              {release.entries.map((e, i) => (
                                <ReleaseEntryRow key={i} entry={e} />
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[12px] text-[hsl(var(--text-3))] leading-relaxed tabular-nums">
                              {release.entryCount} change{release.entryCount === 1 ? '' : 's'} — see
                              CHANGELOG.md for the detail.
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>

                    {TOTAL_RELEASE_COUNT > DETAILED_RELEASE_COUNT && (
                      <p className="text-[11px] text-[hsl(var(--text-4))] mt-4 leading-relaxed">
                        Full entry text is carried for the {DETAILED_RELEASE_COUNT} most recent
                        releases; the remaining {TOTAL_RELEASE_COUNT - DETAILED_RELEASE_COUNT} are
                        listed with their change counts to keep the app small.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── HELP ────────────────────────────────────────────────────── */}
            {activeTab === 'help' && (
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))]">Help</h2>
                  <p className="text-[12px] text-[hsl(var(--text-3))] mt-1 leading-relaxed">
                    Support routes, and what this build actually contains.
                  </p>
                </div>

                <Card>
                  <h4 className="text-[13px] font-semibold text-[hsl(var(--text-1))] mb-2">
                    Certifyi AI GRC Platform
                  </h4>
                  <p className="text-[12px] text-[hsl(var(--text-2))] leading-relaxed mb-3">
                    Turn AI and compliance risk into audit-ready trust with done-with-you
                    automation.
                  </p>
                  <a
                    href={WEBSITE_URL}
                    {...EXTERNAL_LINK_PROPS}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
                  >
                    Visit certifyi.ai <ArrowSquareOut size={13} weight="bold" />
                  </a>
                </Card>

                <Card>
                  <h4 className="text-[13px] font-semibold text-[hsl(var(--text-1))] mb-3">
                    Contact us
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wider mb-0.5">
                        Email
                      </span>
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-[13px] text-[hsl(var(--text-1))] hover:text-[hsl(var(--brand))]"
                      >
                        {CONTACT_EMAIL}
                      </a>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wider mb-0.5">
                        Phone
                      </span>
                      <a
                        href={`tel:${CONTACT_PHONE.replace(/[^+\d]/g, '')}`}
                        className="text-[13px] text-[hsl(var(--text-1))] hover:text-[hsl(var(--brand))]"
                      >
                        {CONTACT_PHONE}
                      </a>
                    </div>
                  </div>
                </Card>

                {/* Real build facts, so a support conversation can start from
                    what is actually running rather than from a guess. */}
                <Card>
                  <h4 className="text-[13px] font-semibold text-[hsl(var(--text-1))] mb-3">
                    This build
                  </h4>
                  <dl className="space-y-2 text-[12px]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[hsl(var(--text-3))]">Latest version</dt>
                      <dd className="text-[hsl(var(--text-1))] font-mono tabular-nums">
                        {LATEST_VERSION ? `v${LATEST_VERSION}` : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[hsl(var(--text-3))]">Releases recorded</dt>
                      <dd className="text-[hsl(var(--text-1))] tabular-nums">
                        {TOTAL_RELEASE_COUNT}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[hsl(var(--text-3))]">Unreleased changes</dt>
                      <dd className="text-[hsl(var(--text-1))] tabular-nums">
                        {UNRELEASED.entryCount > 0 ? UNRELEASED.entryCount : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[hsl(var(--text-3))]">Modules in the menu</dt>
                      <dd className="text-[hsl(var(--text-1))] tabular-nums">{coverage.total}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[hsl(var(--text-3))]">Documented</dt>
                      <dd className="text-[hsl(var(--text-1))] tabular-nums">
                        {coverage.documented} ({coverage.percent}%)
                      </dd>
                    </div>
                  </dl>
                  {coverage.undocumented > 0 && (
                    <p className="text-[11px] text-[hsl(var(--text-4))] mt-3 pt-3 border-t border-[hsl(var(--border))] leading-relaxed">
                      {coverage.undocumented} module
                      {coverage.undocumented === 1 ? ' has' : 's have'} no written documentation
                      yet. The guide marks {coverage.undocumented === 1 ? 'it' : 'them'} as
                      undocumented rather than describing {coverage.undocumented === 1 ? 'it' : 'them'} from guesswork.
                    </p>
                  )}
                </Card>

                <button
                  onClick={() => handleTabClick('userGuide')}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
                >
                  <BookOpen size={14} /> Open the user guide
                </button>

                {/* The legal documents, reachable from inside the product —
                    not just at sign-up. */}
                <Card>
                  <h4 className="text-[13px] font-semibold text-[hsl(var(--text-1))] mb-3">
                    Legal
                  </h4>
                  <div className="flex flex-col gap-2">
                    <a
                      href={TERMS_URL}
                      {...EXTERNAL_LINK_PROPS}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
                    >
                      Terms of Service <ArrowSquareOut size={13} weight="bold" />
                    </a>
                    <a
                      href={PRIVACY_URL}
                      {...EXTERNAL_LINK_PROPS}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--brand))] hover:underline"
                    >
                      Privacy Policy <ArrowSquareOut size={13} weight="bold" />
                    </a>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    Certifyi AI is a product of {COMPANY.name}, {COMPANY.address} (reg. no.{' '}
                    {COMPANY.registrationNo}). Our privacy policy follows Nepal's data protection
                    framework; if you are subject to another jurisdiction — GDPR in the EU, for
                    example — additional terms may apply.
                  </p>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The rail */}
      <div className="w-[40px] bg-surface border-l border-[hsl(var(--border))] flex flex-col items-center py-2 z-50 h-full relative">
        <RailTab
          tab="getStarted"
          label="Get started"
          icon={<Rocket size={16} />}
          activeTab={activeTab}
          onClick={handleTabClick}
        />
        <RailDivider />
        <RailTab
          tab="userGuide"
          label="User guide"
          icon={<BookOpen size={16} />}
          activeTab={activeTab}
          onClick={handleTabClick}
        />
        <RailDivider />
        <RailTab
          tab="whatsNew"
          label="What's new"
          icon={<Sparkle size={16} />}
          activeTab={activeTab}
          onClick={handleTabClick}
        />
        <div className="flex-1" />
        <RailDivider />
        <RailTab
          tab="help"
          label="Help"
          icon={<Question size={16} />}
          activeTab={activeTab}
          onClick={handleTabClick}
        />
      </div>
    </div>
  )
}

function RailDivider() {
  return <div className="w-[20px] border-b border-[hsl(var(--border))] my-1" />
}

function RailTab({
  tab,
  label,
  icon,
  activeTab,
  onClick,
}: {
  tab: Exclude<Tab, null>
  label: string
  icon: React.ReactNode
  activeTab: Tab
  onClick: (tab: Tab) => void
}) {
  const active = activeTab === tab
  return (
    <button
      onClick={() => onClick(tab)}
      aria-pressed={active}
      aria-label={label}
      className={`w-full py-4 flex flex-col items-center justify-center gap-3 transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--brand))] ${
        active
          ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))] bg-raised'
          : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-raised'
      }`}
    >
      {icon}
      <span
        className="text-[11px] font-medium tracking-wide whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
    </button>
  )
}
