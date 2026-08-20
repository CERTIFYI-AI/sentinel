// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrappers for framework adoption (the org's compliance scope).
// Mutations invalidate both the adoption list and the frameworks list, since
// frameworks.is_active is derived from adoption state.

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchAdoptions, adoptFramework, setAdoptionStatus,
  type FrameworkAdoption,
} from '../../services/frameworkAdoptionService'

const KEY = ['framework-adoptions']

export function useFrameworkAdoptions() {
  return useQuery({ queryKey: KEY, queryFn: fetchAdoptions, staleTime: 30_000 })
}

/** Set of framework ids currently in scope (status = adopted). */
export function useAdoptedFrameworkIds(): { ids: Set<string>; isLoading: boolean } {
  const q = useFrameworkAdoptions()
  const ids = useMemo(
    () => new Set((q.data ?? []).filter((a) => a.status === 'adopted').map((a) => a.frameworkId)),
    [q.data],
  )
  return { ids, isLoading: q.isLoading }
}

export function useAdoptFramework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adoptFramework,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['frameworks'] })
      toast.success('Framework adopted into your compliance scope')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSetAdoptionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setAdoptionStatus,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['frameworks'] })
      toast.success(vars.status === 'adopted' ? 'Framework re-adopted' : `Framework ${vars.status}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export type { FrameworkAdoption }
