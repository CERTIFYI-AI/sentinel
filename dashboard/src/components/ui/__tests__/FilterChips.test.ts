// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
import { describe, it, expect } from 'vitest'
import { deriveFacets } from '../FilterChips'

const labels = { status: 'Status', severity: 'Severity', owner: 'Owner' }

describe('deriveFacets', () => {
  it('lists only the facets that are actually filtering', () => {
    const out = deriveFacets({ status: 'active', severity: '', owner: 'all' }, labels)
    expect(out).toEqual([{ key: 'status', label: 'Status', value: 'active' }])
  })

  it('treats the configured all-value as "no filter"', () => {
    expect(deriveFacets({ status: 'all' }, labels)).toEqual([])
    expect(deriveFacets({ status: 'any' }, labels, 'any')).toEqual([])
  })

  it('ignores empty and whitespace-only values', () => {
    expect(deriveFacets({ status: '   ', severity: null, owner: undefined }, labels)).toEqual([])
  })

  it('falls back to the raw key when no label is provided', () => {
    expect(deriveFacets({ region: 'eu-west-1' }, labels)).toEqual([
      { key: 'region', label: 'region', value: 'eu-west-1' },
    ])
  })

  it('preserves insertion order so the chip row does not jitter', () => {
    const out = deriveFacets({ severity: 'high', status: 'active' }, labels)
    expect(out.map(f => f.key)).toEqual(['severity', 'status'])
  })
})
