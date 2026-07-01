// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Subscribes to control-drift + regulatory-change alerts pushed by the backend
// into the `realtime_alerts` table, and surfaces them as toasts. No polling.
// Gated by isSupabaseConfigured() so it is inert in demo mode.

import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { toast } from 'sonner'

interface RealtimeAlert {
  alert_type: string
  title: string
  message: string
  payload?: Record<string, unknown>
}

/**
 * @param onCritical optional callback (e.g. refetch the controls list) fired on a
 *                   critical drift alert.
 */
export function useControlDriftAlerts(onCritical?: () => void) {
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
          filter: 'alert_type=in.(control_drift_critical,control_drift_warning,reg_text_changed)',
        },
        (payload: { new: RealtimeAlert }) => {
          const a = payload.new
          if (a.alert_type === 'control_drift_critical') {
            toast.error(a.title, { description: a.message })
            onCritical?.()
          } else if (a.alert_type === 'control_drift_warning') {
            toast.warning(a.title, { description: a.message })
          } else {
            toast(a.title, { description: a.message })
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
