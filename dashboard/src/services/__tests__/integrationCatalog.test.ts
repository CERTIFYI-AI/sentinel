// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Tests for the integration catalogue and evidence helpers.
//
// The load-bearing assertion is `isConnectable`: it is the single gate that
// stops the UI offering a Connect button for a product with no adapter behind
// it. If it ever returns true for a 'catalogued' entry, the product starts
// promising evidence collection that cannot happen.

import { describe, it, expect } from 'vitest'

import {
  isConnectable,
  adapterStatusLabel,
  catalogCategories,
  countByCategory,
  connectableCount,
  filterCatalog,
  type CatalogEntry,
} from '../integrationCatalogService'
import {
  rankFindings,
  evidencePosture,
  countByStatus,
  type IntegrationFinding,
} from '../integrationFindingsService'

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  slug: 'github',
  name: 'GitHub',
  category: 'code',
  whyNeeded: 'Repositories, branch rules, PRs, reviews, commits, membership.',
  evidencePull: 'REST API / OAuth app with read scopes.',
  connectSteps: '1) Admin opens Integrations…',
  evidenceMapping: 'Maps change management and access review evidence.',
  docsHint: 'https://docs.github.com',
  tier: 1,
  adapterStatus: 'available',
  ...over,
})

const finding = (over: Partial<IntegrationFinding> = {}): IntegrationFinding => ({
  id: 'f1',
  integrationId: 'i1',
  checkId: 'github.org.mfa_required',
  title: 'Organization requires MFA',
  description: 'All members must have two-factor authentication enabled.',
  remediation: 'Enable "Require two-factor authentication" in org settings.',
  status: 'PASSED',
  severity: 'HIGH',
  checkCategory: 'mfa_enforcement',
  collectedAt: '2026-08-18T00:00:00Z',
  ...over,
})

describe('isConnectable — the capability gate', () => {
  it('allows a shipped adapter', () => {
    expect(isConnectable(entry({ adapterStatus: 'available' }))).toBe(true)
  })

  it('allows a beta adapter', () => {
    expect(isConnectable(entry({ adapterStatus: 'beta' }))).toBe(true)
  })

  it('NEVER allows a catalogued-only product', () => {
    // The whole point: no adapter means no collection, so no Connect button.
    expect(isConnectable(entry({ adapterStatus: 'catalogued' }))).toBe(false)
  })
})

describe('catalogue helpers', () => {
  it('labels each adapter status', () => {
    expect(adapterStatusLabel('available')).toBe('Available')
    expect(adapterStatusLabel('beta')).toBe('Beta')
    expect(adapterStatusLabel('catalogued')).toBe('Catalogued')
  })

  it('lists distinct categories alphabetically', () => {
    const list = [
      entry({ slug: 'a', category: 'security' }),
      entry({ slug: 'b', category: 'code' }),
      entry({ slug: 'c', category: 'security' }),
    ]
    expect(catalogCategories(list)).toEqual(['code', 'security'])
  })

  it('counts entries per category', () => {
    const list = [
      entry({ slug: 'a', category: 'security' }),
      entry({ slug: 'b', category: 'code' }),
      entry({ slug: 'c', category: 'security' }),
    ]
    expect(countByCategory(list)).toEqual({ security: 2, code: 1 })
  })

  it('counts only what can actually be connected', () => {
    const list = [
      entry({ slug: 'a', adapterStatus: 'available' }),
      entry({ slug: 'b', adapterStatus: 'beta' }),
      entry({ slug: 'c', adapterStatus: 'catalogued' }),
      entry({ slug: 'd', adapterStatus: 'catalogued' }),
    ]
    expect(connectableCount(list)).toBe(2)
    expect(list.length).toBe(4)
  })
})

describe('filterCatalog', () => {
  const list = [
    entry({ slug: 'github', name: 'GitHub', category: 'code' }),
    entry({ slug: 'okta', name: 'Okta', category: 'identity', whyNeeded: 'MFA and SSO posture.' }),
    entry({ slug: 'aws', name: 'AWS', category: 'cloud', evidencePull: 'IAM via role assumption.' }),
  ]

  it('returns everything with no filter', () => {
    expect(filterCatalog(list)).toHaveLength(3)
  })

  it('filters by category', () => {
    expect(filterCatalog(list, { category: 'identity' }).map(e => e.slug)).toEqual(['okta'])
  })

  it('matches on name and slug, case-insensitively', () => {
    expect(filterCatalog(list, { query: 'GITHUB' }).map(e => e.slug)).toEqual(['github'])
    expect(filterCatalog(list, { query: 'okta' }).map(e => e.slug)).toEqual(['okta'])
  })

  it('searches the operator prose, not just the name', () => {
    // "which of these gives me MFA evidence?" is the question this answers.
    expect(filterCatalog(list, { query: 'mfa' }).map(e => e.slug)).toEqual(['okta'])
    expect(filterCatalog(list, { query: 'role assumption' }).map(e => e.slug)).toEqual(['aws'])
  })

  it('combines category and query', () => {
    expect(filterCatalog(list, { category: 'code', query: 'okta' })).toEqual([])
  })

  it('returns nothing for an unmatched term', () => {
    expect(filterCatalog(list, { query: 'zzzz-not-a-product' })).toEqual([])
  })
})

describe('findings helpers', () => {
  it('ranks failures first, then warnings, then by severity', () => {
    const list = [
      finding({ id: 'p', status: 'PASSED', severity: 'CRITICAL' }),
      finding({ id: 'w', status: 'WARNING', severity: 'LOW' }),
      finding({ id: 'f-low', status: 'FAILED', severity: 'LOW' }),
      finding({ id: 'f-crit', status: 'FAILED', severity: 'CRITICAL' }),
    ]
    expect(rankFindings(list).map(f => f.id)).toEqual(['f-crit', 'f-low', 'w', 'p'])
  })

  it('does not mutate its input', () => {
    const list = [finding({ id: 'a', status: 'PASSED' }), finding({ id: 'b', status: 'FAILED' })]
    rankFindings(list)
    expect(list.map(f => f.id)).toEqual(['a', 'b'])
  })

  it('reports null posture when nothing was collected', () => {
    // Must render as "—", never as a passing or failing verdict.
    expect(evidencePosture([])).toBeNull()
  })

  it('reports failing when any check failed', () => {
    expect(evidencePosture([finding({ status: 'PASSED' }), finding({ status: 'FAILED' })])).toBe(
      'failing',
    )
  })

  it('reports attention on a warning with no failure', () => {
    expect(evidencePosture([finding({ status: 'PASSED' }), finding({ status: 'WARNING' })])).toBe(
      'attention',
    )
  })

  it('reports passing only when checks passed and none failed or warned', () => {
    expect(evidencePosture([finding({ status: 'PASSED' })])).toBe('passing')
  })

  it('treats an all-unavailable set as no posture', () => {
    expect(evidencePosture([finding({ status: 'NOT_AVAILABLE' })])).toBeNull()
  })

  it('counts by status with every key present', () => {
    const counts = countByStatus([finding({ status: 'FAILED' }), finding({ status: 'PASSED' })])
    expect(counts).toEqual({ PASSED: 1, FAILED: 1, WARNING: 0, NOT_AVAILABLE: 0 })
  })
})
