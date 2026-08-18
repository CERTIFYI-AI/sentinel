// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchNotificationPrefs,
  fetchObservedEventTypes,
  createNotificationPref,
  setNotificationPrefEnabled,
  deleteNotificationPref,
  type NotificationChannel,
  type NotificationPref,
} from '@/services/notificationPrefsService'

const KEY = ['notification_prefs'] as const

export function useNotificationPrefs() {
  const q = useQuery({ queryKey: KEY, queryFn: fetchNotificationPrefs })
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
  }
}

/** Event types this org has actually emitted — the honest choice list. */
export function useObservedEventTypes() {
  const q = useQuery({
    queryKey: ['governance_event_types'],
    queryFn: fetchObservedEventTypes,
    staleTime: 5 * 60_000,
  })
  return { data: q.data ?? [], isLoading: q.isLoading }
}

export function useNotificationPrefMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  return {
    create: useMutation({
      mutationFn: (input: { channel: NotificationChannel; eventType: string }) =>
        createNotificationPref(input),
      onSuccess: invalidate,
    }),
    toggle: useMutation({
      mutationFn: ({ pref, isEnabled }: { pref: NotificationPref; isEnabled: boolean }) =>
        setNotificationPrefEnabled(pref, isEnabled),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (pref: NotificationPref) => deleteNotificationPref(pref),
      onSuccess: invalidate,
    }),
  }
}
