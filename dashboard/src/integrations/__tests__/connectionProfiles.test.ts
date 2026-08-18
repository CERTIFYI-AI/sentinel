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
import { PRODUCT_PROFILES } from '../productProfiles'
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

describe('per-product profiles', () => {
  it('asks AWS for an account number, not for "tenant, workspace or account"', () => {
    // AWS ships an adapter, so it gets the credential contract. If the
    // catalogue row is stale (adapter_status still 'catalogued'), it falls to
    // monitored — and even then it must ask AWS-specific questions.
    const monitored = buildConnectionProfile(entry({ slug: 'aws', category: 'cloud' }))
    expect(monitored.productSpecific).toBe(true)
    expect(monitored.fields.map(f => f.id)).toContain('account_id')
    expect(monitored.fields.map(f => f.id)).not.toContain('tenant_ref')
    expect(monitored.authMethods[0]).toMatch(/IAM role/i)
  })

  it('asks Zoom for a Zoom Account ID and names Server-to-Server OAuth', () => {
    const p = buildConnectionProfile(entry({ slug: 'zoom', category: 'collaboration' }))
    expect(p.productSpecific).toBe(true)
    expect(p.fields.map(f => f.id)).toContain('account_id')
    expect(p.authMethods[0]).toMatch(/Server-to-Server OAuth/)
    expect(p.setupHint).toBeTruthy()
  })

  it('gives three different products three different first questions', () => {
    // The defect this closes: every monitored product asked the same thing.
    const ids = ['aws', 'zoom', 'okta', 'datadog', 'servicenow'].map(
      slug => buildConnectionProfile(entry({ slug })).fields[0].id,
    )
    expect(new Set(ids).size).toBeGreaterThan(1)
    expect(ids).toEqual(['account_id', 'account_id', 'org_url', 'site', 'instance_url'])
  })

  it('still asks a product with no verified profile the category question', () => {
    // Honest fallback: no invented product facts for the long tail.
    const p = buildConnectionProfile(entry({ slug: 'some-unknown-vendor', category: 'hr' }))
    expect(p.productSpecific).toBe(false)
    expect(p.fields[0].id).toBe('tenant_ref')
    expect(p.setupHint).toBeUndefined()
  })

  it('never asks a monitored product for a secret, however specific the profile', () => {
    // The honesty guarantee survives the new specificity: these products have
    // no adapter, so a credential would be stored with nothing able to use it.
    for (const slug of Object.keys(PRODUCT_PROFILES)) {
      const p = buildConnectionProfile(entry({ slug }))
      for (const f of p.fields) {
        expect(f.type, `${slug}/${f.id}`).not.toBe('password')
        expect(f.id, `${slug}/${f.id}`).not.toMatch(SECRETY)
      }
    }
  })

  it('keys every profile to a real catalogue slug shape', () => {
    // A profile for a slug that does not exist is dead code that never runs
    // and never fails, so it would rot silently.
    for (const slug of Object.keys(PRODUCT_PROFILES)) {
      expect(slug, slug).toMatch(/^[a-z0-9_]+$/)
      expect(PRODUCT_PROFILES[slug].fields.length).toBeGreaterThan(0)
      expect(PRODUCT_PROFILES[slug].authMethod.length).toBeGreaterThan(5)
    }
  })
})
