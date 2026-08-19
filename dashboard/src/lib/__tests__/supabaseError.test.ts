// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
import { describe, it, expect } from 'vitest'
import { isMissingRelationError, missingRelationName, humanizeError } from '../supabaseError'

// The exact string the user saw.
const PGRST = {
  code: 'PGRST205',
  message: "Could not find the table 'public.vendor_assessments' in the schema cache",
}
const PG42 = new Error('relation "public.vendor_slas" does not exist')

describe('isMissingRelationError', () => {
  it('recognises the PostgREST schema-cache error', () => {
    expect(isMissingRelationError(PGRST)).toBe(true)
    // …by message alone, when no code field is present
    expect(isMissingRelationError({ message: PGRST.message })).toBe(true)
  })

  it('recognises the raw Postgres undefined_table error', () => {
    expect(isMissingRelationError(PG42)).toBe(true)
    expect(isMissingRelationError({ code: '42P01' })).toBe(true)
  })

  it('does not misclassify an ordinary error', () => {
    expect(isMissingRelationError(new Error('permission denied'))).toBe(false)
    expect(isMissingRelationError(null)).toBe(false)
    expect(isMissingRelationError(undefined)).toBe(false)
  })
})

describe('missingRelationName', () => {
  it('extracts the table name from both phrasings', () => {
    expect(missingRelationName(PGRST)).toBe('public.vendor_assessments')
    expect(missingRelationName(PG42)).toBe('public.vendor_slas')
  })
  it('returns null when there is no relation to name', () => {
    expect(missingRelationName(new Error('boom'))).toBeNull()
  })
})

describe('humanizeError', () => {
  it('turns the schema-cache error into a calm setup state — never the raw string', () => {
    const f = humanizeError(PGRST, 'vendor assessments')
    expect(f.tone).toBe('setup')
    expect(f.title).not.toMatch(/schema cache/i)
    expect(f.detail).not.toMatch(/schema cache/i)
    expect(f.detail).not.toMatch(/public\.vendor_assessments/)
    // It reads naturally and reassures nothing is lost.
    expect(f.detail).toContain('vendor assessments')
    expect(f.detail.toLowerCase()).toContain('no data has been lost')
  })

  it('passes a genuine error through as an error, with its message', () => {
    const f = humanizeError(new Error('permission denied for table vendors'))
    expect(f.tone).toBe('error')
    expect(f.detail).toContain('permission denied')
  })
})
