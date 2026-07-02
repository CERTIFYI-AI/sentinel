// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for the Validation & Evals governance state machine + SoD.

import { describe, it, expect } from 'vitest'
import { canTransition, canApprove, verdictClass, stateClass } from '@/lib/evalsWorkflow'

describe('canTransition', () => {
  it('allows Draft → InReview but not Draft → Approved', () => {
    expect(canTransition('Draft', 'InReview')).toBe(true)
    expect(canTransition('Draft', 'Approved')).toBe(false)
  })
  it('treats Approved as terminal', () => {
    expect(canTransition('Approved', 'InReview')).toBe(false)
  })
  it('lets a rejected run be reopened as Draft', () => {
    expect(canTransition('Rejected', 'Draft')).toBe(true)
  })
})

describe('canApprove — segregation of duties (4-eyes)', () => {
  it('permits an approver role who is not the last editor', () => {
    expect(canApprove('validation_run', 'approver', 'user-A', 'user-B')).toBe(true)
  })
  it('blocks self-approval even for an approver role', () => {
    expect(canApprove('validation_run', 'approver', 'user-A', 'user-A')).toBe(false)
  })
  it('blocks a non-approving role', () => {
    expect(canApprove('validation_run', 'contributor', 'user-A', 'user-B')).toBe(false)
  })
  it('admin still cannot self-approve', () => {
    expect(canApprove('validation_run', 'admin', 'user-A', 'user-A')).toBe(false)
    expect(canApprove('validation_run', 'admin', 'user-A', 'user-B')).toBe(true)
  })
})

describe('badge class helpers — readable contrast (bg ≠ tx)', () => {
  it('verdict pass uses distinct bg and text tokens', () => {
    const { cls } = verdictClass('pass')
    expect(cls).toContain('--s-ok-bg')
    expect(cls).toContain('--s-ok-tx')
  })
  it('state maps CondApproved to a warn tone', () => {
    expect(stateClass('CondApproved').label).toBe('Conditional')
  })
})
