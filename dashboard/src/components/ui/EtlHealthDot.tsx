// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-10 — ETL health indicator: green/amber/red based on last run age.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useRequiredOrgId } from '../../hooks/useTenant'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function EtlHealthDot() {
  const orgId = useRequiredOrgId()
  const [refreshing, setRefreshing] = useState(false)

  const { data: lastRun, refetch } = useQuery({
    queryKey: ['etl-health', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('governance_events')
        .select('created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1).single()
      return data?.created_at ?? null
    },
    enabled: !!orgId,
    refetchInterval: 60_000,
  })

  const ageMinutes = lastRun ? Math.floor((Date.now() - new Date(lastRun).getTime()) / 60000) : null
  const health = ageMinutes === null ? 'unknown' : ageMinutes < 60 ? 'ok' : ageMinutes < 1440 ? 'warn' : 'critical'
  const dotColor = { ok: 'bg-green-500', warn: 'bg-amber-500', critical: 'bg-red-500', unknown: 'bg-zinc-300' }[health]
  const label = ageMinutes === null ? 'No data' : ageMinutes < 60 ? `${ageMinutes}m ago` : ageMinutes < 1440 ? `${Math.floor(ageMinutes/60)}h ago` : `${Math.floor(ageMinutes/1440)}d ago`

  async function handleRefresh() {
    setRefreshing(true)
    const before = Date.now()
    await refetch()
    const elapsed = Date.now() - before
    setRefreshing(false)
    toast.success(`Data refreshed — ${label} last updated (${elapsed}ms)`)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#368F4D]"
      aria-label={`Refresh data — last updated ${label}`}
      title={`ETL health: ${health} — last event ${label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor} ${health === 'ok' ? 'animate-pulse' : ''}`} />
      <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  )
}
