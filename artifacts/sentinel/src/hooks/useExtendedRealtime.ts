// === ADDED BY PHASE_COMPLETE: Additional realtime channels ===
// To enable: import and call useExtendedRealtime() in your app root
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const REALTIME_TABLES = [
  { table: 'risks', key: 'risks' },
  { table: 'controls', key: 'controls' },
  { table: 'vendors', key: 'vendors' },
  { table: 'incidents', key: 'incidents' },
  { table: 'security_scans', key: 'securityScans' },
  { table: 'agents', key: 'agents' },
  { table: 'compliance_calendar', key: 'complianceCalendar' },
  { table: 'bias_audits', key: 'biasAudits' },
  { table: 'red_team_campaigns', key: 'redTeam' },
  { table: 'exceptions', key: 'exceptions' },
  { table: 'training_courses', key: 'training' },
  { table: 'bcp_plans', key: 'bcpPlans' },
]

export function useExtendedRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const channels = REALTIME_TABLES.map(({ table, key }) =>
      supabase.channel(`${table}-rt`)
        .on('postgres_changes', { event: '*', schema: 'public', table },
          () => qc.invalidateQueries({ queryKey: [key] }))
        .subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, [qc])
}
