// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for useUserOptions — the central Users directory adapter that
// backs UserSelect. Verifies seed fallback and role filtering.

/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUserOptions } from '@/hooks/useUserOptions'

describe('useUserOptions', () => {
  it('falls back to the seed directory when no tenant users exist', () => {
    const { result } = renderHook(() => useUserOptions())
    expect(result.current.options.length).toBeGreaterThan(0)
    expect(result.current.options[0]).toHaveProperty('name')
    expect(result.current.options[0]).toHaveProperty('role')
  })

  it('filters by role substring (case-insensitive)', () => {
    const { result } = renderHook(() => useUserOptions(['risk']))
    expect(result.current.options.length).toBeGreaterThan(0)
    expect(result.current.options.every((u) => u.role.toLowerCase().includes('risk'))).toBe(true)
  })

  it('never strands the caller with an empty list for an unknown role', () => {
    const { result } = renderHook(() => useUserOptions(['no-such-role']))
    expect(result.current.options.length).toBeGreaterThan(0)
  })
})
