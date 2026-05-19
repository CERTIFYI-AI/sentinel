/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * Pure-function test harness (vitest-compatible). Runs without a DOM.
 * Covers happy path + 3 edge + 1 security cases.
 */
import { describe, expect, it } from 'vitest'
import {
  CrossTenantViolationError,
  assertSameTenant,
  assertSameTenantAll,
} from '../assertSameTenant'

describe('assertSameTenant', () => {
  it('passes when expected and actual match (happy path)', () => {
    expect(() =>
      assertSameTenant('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'test'),
    ).not.toThrow()
  })

  it('throws when actual is null (edge: missing org_id)', () => {
    expect(() => assertSameTenant('org-a', null, 'test')).toThrow(
      CrossTenantViolationError,
    )
  })

  it('throws when actual is undefined (edge: omitted field)', () => {
    expect(() => assertSameTenant('org-a', undefined, 'test')).toThrow(
      CrossTenantViolationError,
    )
  })

  it('throws when expected is empty (edge: tenancy not yet ready)', () => {
    expect(() => assertSameTenant('', 'org-a', 'test')).toThrow(
      CrossTenantViolationError,
    )
  })

  it('throws on cross-tenant mismatch (SECURITY: IDOR defense)', () => {
    expect(() => assertSameTenant('org-a', 'org-b', 'test')).toThrow(
      /scope="test" expected=org-a actual=org-b/,
    )
  })
})

describe('assertSameTenantAll', () => {
  it('validates every row and returns the array', () => {
    const rows = [{ org_id: 'a' }, { org_id: 'a' }]
    expect(assertSameTenantAll('a', rows, 'bulk')).toBe(rows)
  })

  it('pinpoints the offending index in the error message', () => {
    const rows = [{ org_id: 'a' }, { org_id: 'b' }]
    expect(() => assertSameTenantAll('a', rows, 'bulk')).toThrow(/\[index=1\]/)
  })
})
