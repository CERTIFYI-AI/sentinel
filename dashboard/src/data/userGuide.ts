// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// userGuide — the lookup layer over the generated guide content.
//
// `moduleGuides.generated.ts` is produced from the menu (`navigation.ts`) and
// the authored module docs (`docs/modules/*.md`). This module adds the pure
// functions the User guide panel needs on top of it: resolving the current
// route to its section/entry, and searching. No I/O, no React — so it is unit
// tested directly.
//
// Route resolution is LONGEST-PREFIX, not exact: `/models/inventory/<uuid>`
// resolves to the Model Registry entry, and `/security/scans` beats `/security`
// because it is the more specific match. The previous hand-maintained
// route→collection table is gone; nothing here can drift from the menu.

import {
  GUIDE_COLLECTIONS,
  GUIDE_TOTAL_ENTRIES,
  GUIDE_DOCUMENTED_ENTRIES,
  MODULE_DOCS_AVAILABLE,
  type GuideCollection,
  type GuideEntry,
} from './moduleGuides.generated'

export type { GuideCollection, GuideEntry }
export {
  GUIDE_COLLECTIONS,
  GUIDE_TOTAL_ENTRIES,
  GUIDE_DOCUMENTED_ENTRIES,
  MODULE_DOCS_AVAILABLE,
}

/** An entry together with the collection it belongs to. */
export interface GuideHit {
  collection: GuideCollection
  entry: GuideEntry
}

const ALL_HITS: GuideHit[] = GUIDE_COLLECTIONS.flatMap(collection =>
  collection.entries.map(entry => ({ collection, entry })),
)

/** Every entry in menu order, each carrying its section. */
export function allEntries(): GuideHit[] {
  return ALL_HITS
}

/**
 * The guide entry whose route is the longest prefix of `pathname`.
 *
 * Returns null rather than a wrong-but-plausible entry when nothing matches —
 * the panel then shows its browse view instead of documentation for an
 * unrelated module.
 */
export function entryForRoute(pathname: string): GuideHit | null {
  let best: GuideHit | null = null
  let bestLength = -1

  for (const hit of ALL_HITS) {
    const route = hit.entry.route
    if (pathname !== route && !pathname.startsWith(route.endsWith('/') ? route : `${route}/`)) {
      continue
    }
    if (route.length > bestLength) {
      best = hit
      bestLength = route.length
    }
  }
  return best
}

/** The section a route belongs to, for opening the guide in context. */
export function collectionForRoute(pathname: string): GuideCollection | null {
  return entryForRoute(pathname)?.collection ?? null
}

/** Look a section up by its slug. */
export function collectionById(id: string): GuideCollection | null {
  return GUIDE_COLLECTIONS.find(c => c.id === id) ?? null
}

/** Look an entry up by its route. */
export function entryByRoute(route: string): GuideHit | null {
  return ALL_HITS.find(h => h.entry.route === route) ?? null
}

const haystack = (entry: GuideEntry): string =>
  [
    entry.label,
    entry.title,
    entry.purpose ?? '',
    entry.why ?? '',
    entry.route,
    ...entry.how,
    ...entry.interlinks,
    ...entry.compliance,
  ]
    .join(' ')
    .toLowerCase()

/**
 * Search entries by label, title and body text.
 *
 * Ranking is deliberately simple and explainable: a label match outranks a
 * title match, which outranks a body match. Ties keep menu order, so results
 * read in the same sequence as the sidebar.
 */
export function searchGuide(query: string, limit = 40): GuideHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: { hit: GuideHit; score: number; index: number }[] = []
  ALL_HITS.forEach((hit, index) => {
    const label = hit.entry.label.toLowerCase()
    const title = hit.entry.title.toLowerCase()
    let score = 0
    if (label === q) score = 5
    else if (label.startsWith(q)) score = 4
    else if (label.includes(q)) score = 3
    else if (title.includes(q)) score = 2
    else if (haystack(hit.entry).includes(q)) score = 1
    if (score > 0) scored.push({ hit, score, index })
  })

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index))
  return scored.slice(0, limit).map(s => s.hit)
}

/** Coverage of the menu by authored documentation, for the Help panel. */
export function guideCoverage(): {
  total: number
  documented: number
  undocumented: number
  percent: number
  docsAvailable: number
} {
  const total = GUIDE_TOTAL_ENTRIES
  const documented = GUIDE_DOCUMENTED_ENTRIES
  return {
    total,
    documented,
    undocumented: total - documented,
    percent: total > 0 ? Math.round((documented / total) * 100) : 0,
    docsAvailable: MODULE_DOCS_AVAILABLE,
  }
}
