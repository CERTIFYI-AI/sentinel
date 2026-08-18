// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Tests for the User guide derivation layer.
//
// The guarantee under test is structural: the guide IS the menu. If someone
// adds a module to `navigation.ts` and regenerates, it must appear here; if
// route resolution regresses, opening the guide would silently document the
// wrong module, which is worse than showing nothing.

import { describe, it, expect } from 'vitest'

import { NAV, flattenNav, sectionId } from '../navigation'
import {
  GUIDE_COLLECTIONS,
  GUIDE_TOTAL_ENTRIES,
  GUIDE_DOCUMENTED_ENTRIES,
  allEntries,
  entryForRoute,
  collectionForRoute,
  collectionById,
  entryByRoute,
  searchGuide,
  guideCoverage,
} from '../userGuide'

describe('navigation', () => {
  it('slugifies section titles predictably', () => {
    expect(sectionId('RISK & INCIDENTS')).toBe('risk-incidents')
    expect(sectionId('HOME')).toBe('home')
    expect(sectionId('VENDORS & SUPPLY CHAIN')).toBe('vendors-supply-chain')
  })

  it('flattens parents and children into menu-ordered destinations', () => {
    const flat = flattenNav()
    expect(flat.length).toBeGreaterThan(NAV.length)
    // Children carry their parent; top-level items do not.
    expect(flat.some(d => d.parentLabel !== null)).toBe(true)
    expect(flat[0].parentLabel).toBeNull()
    // Every destination knows its section.
    expect(flat.every(d => d.sectionTitle && d.sectionId)).toBe(true)
  })
})

describe('guide mirrors the menu', () => {
  it('has one collection per menu section, in menu order', () => {
    expect(GUIDE_COLLECTIONS.map(c => c.title)).toEqual(NAV.map(s => s.title))
  })

  it('covers every menu destination exactly once', () => {
    const menu = flattenNav().map(d => `${d.sectionId}::${d.to}::${d.label}`)
    const guide = GUIDE_COLLECTIONS.flatMap(c =>
      c.entries.map(e => `${c.id}::${e.route}::${e.label}`),
    )
    expect(guide.sort()).toEqual(menu.sort())
  })

  it('reports totals that match the collections', () => {
    const counted = GUIDE_COLLECTIONS.reduce((n, c) => n + c.entries.length, 0)
    expect(GUIDE_TOTAL_ENTRIES).toBe(counted)
    const documented = GUIDE_COLLECTIONS.reduce(
      (n, c) => n + c.entries.filter(e => e.hasDoc).length,
      0,
    )
    expect(GUIDE_DOCUMENTED_ENTRIES).toBe(documented)
  })

  it('never ships a body for an undocumented entry', () => {
    for (const { entry } of allEntries()) {
      if (entry.hasDoc) continue
      expect(entry.purpose).toBeNull()
      expect(entry.why).toBeNull()
      expect(entry.how).toEqual([])
      expect(entry.dataProcess).toEqual([])
      expect(entry.fields).toEqual([])
      expect(entry.docPath).toBeNull()
    }
  })

  it('gives every documented entry a source doc path', () => {
    for (const { entry } of allEntries()) {
      if (!entry.hasDoc) continue
      expect(entry.docPath).toMatch(/^docs\/modules\/.+\.md$/)
    }
  })
})

describe('entryForRoute', () => {
  it('resolves an exact menu route', () => {
    const hit = entryForRoute('/policies')
    expect(hit?.entry.route).toBe('/policies')
  })

  it('resolves a detail route to its parent module', () => {
    const hit = entryForRoute('/models/inventory/8f1c2b3d-0000-4000-8000-000000000000')
    expect(hit?.entry.route).toBe('/models/inventory')
  })

  it('prefers the longest matching prefix', () => {
    const hit = entryForRoute('/access-control/users')
    expect(hit?.entry.route).toBe('/access-control/users')
  })

  it('does not match a route that merely shares a string prefix', () => {
    // `/risk-intelligence` must not resolve via `/risk`.
    const hit = entryForRoute('/risk-intelligence')
    expect(hit?.entry.route).toBe('/risk-intelligence')
  })

  it('returns null rather than a plausible wrong module', () => {
    expect(entryForRoute('/definitely-not-a-route')).toBeNull()
    expect(collectionForRoute('/definitely-not-a-route')).toBeNull()
  })

  it('resolves a route to the section that contains it', () => {
    const collection = collectionForRoute('/policies')
    expect(collection?.id).toBe('compliance-regulatory')
  })
})

describe('lookups', () => {
  it('finds a collection by id and null otherwise', () => {
    expect(collectionById('home')?.title).toBe('HOME')
    expect(collectionById('nope')).toBeNull()
  })

  it('finds an entry by exact route', () => {
    expect(entryByRoute('/policies')?.entry.label).toBe('Policies')
    expect(entryByRoute('/nope')).toBeNull()
  })
})

describe('searchGuide', () => {
  it('returns nothing for an empty query', () => {
    expect(searchGuide('')).toEqual([])
    expect(searchGuide('   ')).toEqual([])
  })

  it('ranks an exact label match first', () => {
    const results = searchGuide('Policies')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].entry.label).toBe('Policies')
  })

  it('is case-insensitive', () => {
    expect(searchGuide('policies').length).toBe(searchGuide('POLICIES').length)
  })

  it('honours the result limit', () => {
    expect(searchGuide('a', 5).length).toBeLessThanOrEqual(5)
  })

  it('finds nothing for a term absent from the guide', () => {
    expect(searchGuide('zzzzz-not-a-module')).toEqual([])
  })
})

describe('guideCoverage', () => {
  it('reports a consistent, in-range summary', () => {
    const c = guideCoverage()
    expect(c.documented + c.undocumented).toBe(c.total)
    expect(c.percent).toBeGreaterThanOrEqual(0)
    expect(c.percent).toBeLessThanOrEqual(100)
    expect(c.docsAvailable).toBeGreaterThan(0)
  })
})
