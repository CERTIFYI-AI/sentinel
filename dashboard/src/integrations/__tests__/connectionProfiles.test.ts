// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// The load-bearing assertion here is the one the whole feature turns on: a
// product with no adapter must NEVER be handed a credential field. Asking for
// a secret the platform has nothing to do with is the failure mode that made
// "connect everything" unshippable in the first place.

import { describe, it, expect } from 'vitest'

import {
  buildConnectionProfile,
  authMethodsFromEvidencePull,
  missingRequired,
  REVIEW_CADENCES,
} from '../connectionProfiles'
import { INTEGRATIONS } from '../index'
import type { CatalogEntry } from '@/services/integrationCatalogService'

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  slug: 'example',
  name: 'Example',
  category: 'saas',
  whyNeeded: null,
  evidencePull: null,
  connectSteps: null,
  evidenceMapping: null,
  docsHint: null,
  tier: 3,
  adapterStatus: 'catalogued',
  ...over,
})

const SECRETY = /token|secret|password|key|credential/i

describe('buildConnectionProfile — the honesty gate', () => {
  it('never asks a catalogued product for a credential', () => {
    for (const category of ['cloud', 'identity', 'code', 'hr', 'saas', 'siem', 'ai', 'other']) {
      const p = buildConnectionProfile(entry({ category }))
      expect(p.mode).toBe('monitored')
      expect(p.action).toBe('register')
      for (const f of p.fields) {
        expect(f.type, `${category}/${f.id}`).not.toBe('password')
        expect(f.id, `${category}/${f.id}`).not.toMatch(SECRETY)
      }
    }
  })

  it('gives every catalogued product a usable form, never an empty one', () => {
    const p = buildConnectionProfile(entry({ category: 'nonexistent-category' }))
    expect(p.fields.length).toBeGreaterThan(2)
    // An unrecognised category still gets a scope field — falling through to
    // no identifier would register a source nobody can locate.
    expect(p.fields[0].required).toBe(true)
  })

  it('uses the adapter’s own credential contract when one ships', () => {
    for (const config of INTEGRATIONS) {
      const p = buildConnectionProfile(
        entry({ slug: config.id, name: config.name, adapterStatus: 'available' }),
      )
      expect(p.mode).toBe('automated')
      expect(p.action).toBe('connect')
      expect(p.packagingGap).toBe(false)
      expect(p.fields).toEqual(config.credentialFields)
    }
  })

  it('flags a shipped adapter with no registered form rather than rendering nothing', () => {
    const p = buildConnectionProfile(entry({ slug: 'no-such-adapter', adapterStatus: 'beta' }))
    expect(p.mode).toBe('automated')
    expect(p.packagingGap).toBe(true)
    expect(p.fields).toEqual([])
  })

  it('requires an owner and a cadence on a monitored source', () => {
    // A registered source with nobody accountable and no review interval is a
    // list entry pretending to be a control.
    const p = buildConnectionProfile(entry())
    const required = p.fields.filter(f => f.required).map(f => f.id)
    expect(required).toContain('owner_name')
    expect(required).toContain('review_cadence')
    const cadence = p.fields.find(f => f.id === 'review_cadence')
    expect(cadence?.options).toEqual(REVIEW_CADENCES)
  })

  it('scopes by account for cloud and by organisation for code', () => {
    expect(buildConnectionProfile(entry({ category: 'cloud' })).fields[0].id).toBe('account_ref')
    expect(buildConnectionProfile(entry({ category: 'code' })).fields[0].id).toBe('organization')
  })
})

describe('authMethodsFromEvidencePull', () => {
  it('reports only what the catalogue row actually says', () => {
    expect(
      authMethodsFromEvidencePull('REST API / OAuth / API key / SCIM depending on vendor.'),
    ).toEqual(['OAuth', 'API key', 'SCIM', 'REST API'])
  })

  it('invents nothing when the row is silent', () => {
    expect(authMethodsFromEvidencePull(null)).toEqual([])
    expect(authMethodsFromEvidencePull('   ')).toEqual([])
  })

  it('offers a method picker only when the row names more than one', () => {
    const many = buildConnectionProfile(entry({ evidencePull: 'OAuth or API key.' }))
    expect(many.fields.map(f => f.id)).toContain('auth_method')
    const one = buildConnectionProfile(entry({ evidencePull: 'Webhook only.' }))
    expect(one.fields.map(f => f.id)).not.toContain('auth_method')
  })
})

describe('missingRequired', () => {
  it('treats whitespace as blank so a space cannot satisfy a required field', () => {
    const p = buildConnectionProfile(entry({ category: 'cloud' }))
    const missing = missingRequired(p, { account_ref: '   ', owner_name: 'Ops', review_cadence: 'Quarterly' })
    expect(missing.map(f => f.id)).toEqual(['account_ref'])
  })

  it('is empty once every required field carries a value', () => {
    const p = buildConnectionProfile(entry({ category: 'cloud' }))
    expect(
      missingRequired(p, { account_ref: '123', owner_name: 'Ops', review_cadence: 'Quarterly' }),
    ).toEqual([])
  })
})
