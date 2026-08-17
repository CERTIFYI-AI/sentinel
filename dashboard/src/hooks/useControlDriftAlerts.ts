// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Control-drift + regulatory-change alerts over the real org-scoped
// `realtime_alerts` table (columns: id, tenant_id, org_id, alert_type, title,
// message, payload, created_at — RLS scopes rows to the caller's org).
// Two surfaces:
//   1. a Supabase Realtime subscription that toasts new inserts live, and
//   2. a React Query read of recent rows so the page can SHOW the alerts —
//      before this the hook only toasted, so anything inserted while the page
//      was closed was never surfaced.
// Gated by isSupabaseConfigured() so it is inert in demo mode.

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { toast } from 'sonner'

const DRIFT_ALERT_TYPES = ['control_drift_critical', 'control_drift_warning', 'reg_text_changed'] as const

export interface RealtimeAlert {
  id: string
  alert_type: string
  title: string
  message: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

async function fetchRecentAlerts(): Promise<RealtimeAlert[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('realtime_alerts')
    .select('id, alert_type, title, message, payload, created_at')
    .in('alert_type', [...DRIFT_ALERT_TYPES])
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(`Could not load alerts: ${error.message}`)
  return (data ?? []) as RealtimeAlert[]
}

/**
 * @param onCritical optional callback (e.g. refetch the controls list) fired on a
 *                   critical drift alert.
 */
export function useControlDriftAlerts(onCritical?: () => void) {
  const qc = useQueryClient()

  const alertsQuery = useQuery({
    queryKey: ['realtime-alerts', 'control-drift'],
    queryFn: fetchRecentAlerts,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return

    const channel = supabase
      .channel('control_drift_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_alerts',
          filter: `alert_type=in.(${DRIFT_ALERT_TYPES.join(',')})`,
        },
        (payload: { new: RealtimeAlert }) => {
          const a = payload.new
          const description = a.message ?? undefined
          if (a.alert_type === 'control_drift_critical') {
            toast.error(a.title, { description })
            onCritical?.()
          } else if (a.alert_type === 'control_drift_warning') {
            toast.warning(a.title, { description })
          } else {
            toast(a.title, { description })
          }
          qc.invalidateQueries({ queryKey: ['realtime-alerts', 'control-drift'] })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
  }
}
