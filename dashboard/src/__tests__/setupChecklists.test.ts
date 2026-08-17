// SPDX-License-Identifier: Apache-2.0
// Unit tests for the guided-setup registry's pure logic. The critical contract:
// a step whose source is null resolves to 'unknown' — never 'done', never
// 'todo' — so a failed query is never mistaken for either state.

import { describe, it, expect } from 'vitest'
import {
  SETUP_GROUPS,
  stepState,
  groupProgress,
  overallProgress,
  groupForRoute,
  allStepsDeduped,
  type SetupContext,
} from '../data/setupChecklists'

// A context where every source failed — every field null.
const ALL_NULL: SetupContext = {
  demoImported: null,
  modelsTotal: null,
  modelsWithOwner: null,
  modelsWithTier: null,
  useCasesTotal: null,
  useCasesLinkedToModel: null,
  risksTotal: null,
  risksLinkedToModel: null,
  incidentsTotal: null,
  controlsTotal: null,
  conformityTotal: null,
  evidenceTotal: null,
  evidenceLinkedToControl: null,
  vendorsTotal: null,
  vendorsLinkedToModel: null,
  criticalVendorsTotal: null,
  criticalVendorsWithReassessment: null,
  aibomTotal: null,
  attestationsTotal: null,
  provenanceTotal: null,
  carbonTotal: null,
  energyTotal: null,
  esgTotal: null,
  tasksTotal: null,
  tasksLinked: null,
}

// A fresh, empty org — every source succeeded and returned 0.
const EMPTY_ORG: SetupContext = {
  demoImported: false,
  modelsTotal: 0,
  modelsWithOwner: 0,
  modelsWithTier: 0,
  useCasesTotal: 0,
  useCasesLinkedToModel: 0,
  risksTotal: 0,
  risksLinkedToModel: 0,
  incidentsTotal: 0,
  controlsTotal: 0,
  conformityTotal: 0,
  evidenceTotal: 0,
  evidenceLinkedToControl: 0,
  vendorsTotal: 0,
  vendorsLinkedToModel: 0,
  criticalVendorsTotal: 0,
  criticalVendorsWithReassessment: 0,
  aibomTotal: 0,
  attestationsTotal: 0,
  provenanceTotal: 0,
  carbonTotal: 0,
  energyTotal: 0,
  esgTotal: 0,
  tasksTotal: 0,
  tasksLinked: 0,
}

describe('setup checklist step state contract', () => {
  it('resolves every step to "unknown" when its source is null', () => {
    for (const group of SETUP_GROUPS) {
      for (const step of group.steps) {
        expect(stepState(step, ALL_NULL)).toBe('unknown')
      }
    }
  })

  it('never reports "done" for an all-null context', () => {
    for (const group of SETUP_GROUPS) {
      for (const step of group.steps) {
        expect(stepState(step, ALL_NULL)).not.toBe('done')
      }
    }
  })

  it('reports "todo" (not "unknown") for a real empty org', () => {
    for (const group of SETUP_GROUPS) {
      for (const step of group.steps) {
        expect(stepState(step, EMPTY_ORG)).toBe('todo')
      }
    }
  })

  it('marks a step done only when its query proves it', () => {
    const withModel: SetupContext = { ...EMPTY_ORG, modelsTotal: 2, modelsWithOwner: 2, modelsWithTier: 2 }
    const registerStep = SETUP_GROUPS.find((g) => g.id === 'inventory')!.steps.find((s) => s.id === 'register-model')!
    const ownerStep = SETUP_GROUPS.find((g) => g.id === 'inventory')!.steps.find((s) => s.id === 'model-owner')!
    expect(stepState(registerStep, withModel)).toBe('done')
    expect(stepState(ownerStep, withModel)).toBe('done')
    // One model missing an owner → not done.
    expect(stepState(ownerStep, { ...withModel, modelsWithOwner: 1 })).toBe('todo')
  })
})

describe('progress aggregation', () => {
  it('counts an all-null context entirely as unknown', () => {
    const p = overallProgress(ALL_NULL)
    expect(p.done).toBe(0)
    expect(p.todo).toBe(0)
    expect(p.unknown).toBe(p.total)
  })

  it('counts a fresh empty org entirely as todo', () => {
    const p = overallProgress(EMPTY_ORG)
    expect(p.unknown).toBe(0)
    expect(p.todo).toBe(p.total)
  })

  it('overall total de-duplicates the shared register-model step', () => {
    const p = overallProgress(EMPTY_ORG)
    // De-duped flat list length must equal the overall total.
    expect(p.total).toBe(allStepsDeduped().length)
    // register-model appears in both platform and inventory groups.
    const ids = allStepsDeduped().map((s) => s.id)
    expect(ids.filter((id) => id === 'register-model')).toHaveLength(1)
  })

  it('group progress sums to the group step count', () => {
    for (const g of SETUP_GROUPS) {
      const p = groupProgress(g, EMPTY_ORG)
      expect(p.done + p.todo + p.unknown).toBe(p.total)
      expect(p.total).toBe(g.steps.length)
    }
  })
})

describe('route → group mapping', () => {
  it('maps a model route to the inventory group', () => {
    expect(groupForRoute('/models/inventory')?.id).toBe('inventory')
    expect(groupForRoute('/models/inventory/abc-123')?.id).toBe('inventory')
  })

  it('prefers the more specific prefix (evidence over compliance)', () => {
    expect(groupForRoute('/evidence-vault')?.id).toBe('evidence')
    expect(groupForRoute('/vendors')?.id).toBe('vendors')
  })

  it('returns null for an unmapped route so the panel falls back to all groups', () => {
    expect(groupForRoute('/some-unmapped-page')).toBeNull()
  })
})
