// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query access to the organisation record.
//
// `useOrgName()` is the one every page uses. It is deliberately a hook over a
// shared query key rather than a prop threaded down: the name appears in 28
// page subtitles, and a rename must show everywhere at once rather than on
// whichever screens happen to remount.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchOrganization,
  updateOrganization,
  organizationDisplayName,
  type Organization,
  type OrganizationPatch,
} from '@/services/organizationService'

export const ORGANIZATION_QUERY_KEY = ['organization'] as const

/** The caller's organisation. */
export function useOrganization() {
  const q = useQuery({
    queryKey: ORGANIZATION_QUERY_KEY,
    queryFn: fetchOrganization,
    // Org identity changes about once a year. Refetching it on every screen
    // would be pure waste; the mutation below invalidates it when it does.
    staleTime: 10 * 60_000,
  })
  return {
    data: (q.data ?? null) as Organization | null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
  }
}

/**
 * The organisation's display name, resolved for rendering.
 *
 * Never returns an empty string: an unset name shows as "Your organisation",
 * because a page subtitle reading " · Enterprise AI risk inventory" is a
 * rendering bug, and a placeholder company name would be invented data.
 */
export function useOrgName(): string {
  const { data } = useOrganization()
  return organizationDisplayName(data)
}

/** Save organisation settings. Throws on failure, including an RLS refusal. */
export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch, previous }: {
      id: string; patch: OrganizationPatch; previous?: Organization
    }) => updateOrganization(id, patch, previous),
    onSuccess: (updated) => {
      // Seed the cache with what the database actually returned, so the 28
      // pages showing the name update from the stored value rather than from
      // what the form happened to hold.
      qc.setQueryData(ORGANIZATION_QUERY_KEY, updated)
      qc.invalidateQueries({ queryKey: ORGANIZATION_QUERY_KEY })
    },
  })
}
