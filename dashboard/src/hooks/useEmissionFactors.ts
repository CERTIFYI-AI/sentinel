// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Emission factor catalog — shared by Carbon Ledger and Energy Efficiency so a
// derived figure can always cite the factor, source, region and year it came
// from. Read-only reference data; long stale time.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEmissionFactors, factorIndex, type EmissionFactor } from '@/services/emissionFactorService'

export function useEmissionFactors() {
  const q = useQuery<EmissionFactor[]>({
    queryKey: ['emission-factors'],
    queryFn: fetchEmissionFactors,
    staleTime: 10 * 60_000,
  })
  const factors = q.data ?? []
  const byId = useMemo(() => factorIndex(factors), [factors])
  return { factors, byId, isLoading: q.isLoading, error: q.error as Error | null }
}
