// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for the Metric Studio list posture rollup (worst threshold
// verdict across configured metrics, respecting metric direction).

import { describe, it, expect } from 'vitest'
import { posture } from '@/pages/evals/MetricProfileList'
import type { MetricProfile } from '@/types/evals'

function profile(current: Record<string, number>, thresholds: MetricProfile['thresholds']): MetricProfile {
  return {
    id: 'MP-t', modelId: 'MDL-t', modelName: 't', modelVersion: 'v1', owner: 'o', state: 'Draft',
    current, thresholds, benchmarks: [], timeseries: [],
    objectives: { accuracy: 0, fairness: 0, robustness: 0, explainability: 0 }, auditTrail: [],
  }
}

describe('posture', () => {
  it('passes when higher_better metric clears warn', () => {
    const p = profile({ auc: 0.95 }, [{ id: 't1', metric: 'auc', warn: 0.9, fail: 0.87, direction: 'higher_better' }])
    expect(posture(p)).toBe('pass')
  })
  it('warns between warn and fail', () => {
    const p = profile({ auc: 0.89 }, [{ id: 't1', metric: 'auc', warn: 0.9, fail: 0.87, direction: 'higher_better' }])
    expect(posture(p)).toBe('warn')
  })
  it('fails below fail threshold and dominates other passes', () => {
    const p = profile({ auc: 0.80, dp: 0.95 }, [
      { id: 't1', metric: 'auc', warn: 0.9, fail: 0.87, direction: 'higher_better' },
      { id: 't2', metric: 'dp', warn: 0.9, fail: 0.85, direction: 'higher_better' },
    ])
    expect(posture(p)).toBe('fail')
  })
  it('respects lower_better direction (e.g. PSI drift)', () => {
    const p = profile({ psi: 0.3 }, [{ id: 't1', metric: 'psi', warn: 0.15, fail: 0.25, direction: 'lower_better' }])
    expect(posture(p)).toBe('fail')
  })
  it('is na when no configured metric has a current value', () => {
    const p = profile({}, [{ id: 't1', metric: 'auc', warn: 0.9, fail: 0.87, direction: 'higher_better' }])
    expect(posture(p)).toBe('na')
  })
})
