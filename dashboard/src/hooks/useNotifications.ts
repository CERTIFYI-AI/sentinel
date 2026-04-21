// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-14 fix: single Realtime source of truth for notifications.
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notificationsService } from '../services/notifications.service'
import { useRequiredOrgId } from './useTenant'

export function useNotifications() {
  const orgId = useRequiredOrgId()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', orgId],
    queryFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? ''
      const result = await notificationsService.list({ orgId, filters: { user_id: uid }, order: { column: 'created_at', ascending: false }, limit: 50 })
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!orgId,
    staleTime: 10_000,
  })

  // Real-time subscription — N-14: single source updates both bell + page
  useEffect(() => {
    if (!orgId) return
    const channel = supabase.channel(`notifications-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `org_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ['notifications', orgId] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId, qc])

  const unreadCount = (query.data ?? []).filter(n => !n.is_read).length

  return { ...query, unreadCount }
}
