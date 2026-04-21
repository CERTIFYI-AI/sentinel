/**
 * GovernanceActivityFeed — live stream of every governance event + agent
 * execution, groups by correlation_id so an entire cascade shows as a card.
 *
 * Real-time via Supabase Realtime. Falls back to empty state if Supabase
 * is not configured.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  subscribeToGovernanceEvents,
  subscribeToAgentExecutions,
} from '../../lib/governance/eventBus'
import type { GovernanceEvent } from '../../lib/governance/types/events'

type Execution = {
  id: string; event_id: string; agent_name: string; status: string
  duration_ms: number | null; started_at: string; error: string | null
}

interface Props {
  orgId: string
  limit?: number
}

export function GovernanceActivityFeed({ orgId, limit = 30 }: Props) {
  const [events, setEvents]         = useState<GovernanceEvent[]>([])
  const [executions, setExecutions] = useState<Record<string, Execution[]>>({})
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  // initial load
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void supabase.from('governance_events')
      .select('*').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(limit)
      .then(({ data }) => setEvents((data as GovernanceEvent[] | null) ?? []))
  }, [orgId, limit])

  // realtime subscriptions
  useEffect(() => {
    const unsubE = subscribeToGovernanceEvents(orgId, (e) => {
      setEvents(prev => [e, ...prev].slice(0, limit))
    })
    const unsubX = subscribeToAgentExecutions(orgId, (rawExec) => {
      const exec = rawExec as unknown as Execution
      setExecutions(prev => ({
        ...prev,
        [exec.event_id]: [...(prev[exec.event_id] ?? []), exec],
      }))
    })
    return () => { unsubE(); unsubX() }
  }, [orgId, limit])

  const grouped = useMemo(() => events, [events])

  return (
    <div className="sentinel-governance-feed" role="feed" aria-label="Governance Activity Feed">
      <h3 style={{ fontWeight: 600, marginBottom: 12 }}>
        Governance Activity — Autonomous Mesh
      </h3>
      {grouped.length === 0 && (
        <p style={{ opacity: 0.6 }}>No governance events yet. Register a model to see the cascade.</p>
      )}
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
        {grouped.map((e) => {
          const isExpanded = expanded.has(e.id!)
          const exs = executions[e.id!] ?? []
          return (
            <li key={e.id} style={{
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12,
              background: 'rgba(255,255,255,0.02)'
            }}>
              <button
                onClick={() => setExpanded(prev => {
                  const n = new Set(prev); n.has(e.id!) ? n.delete(e.id!) : n.add(e.id!); return n
                })}
                style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}
                aria-expanded={isExpanded}
              >
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusDot status={e.status ?? 'pending'} />
                  <strong>{e.event_type}</strong>
                  <span style={{ opacity: 0.6, fontSize: 12 }}>from {e.source_module}</span>
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {e.triggered_agents?.length ?? 0} agents · {timeAgo(e.created_at)}
                </span>
              </button>
              {isExpanded && (
                <div style={{ marginTop: 10, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                  <pre style={{ fontSize: 11, opacity: 0.8, overflowX: 'auto' }}>
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                  {exs.map(x => (
                    <div key={x.id} style={{ display: 'flex', gap: 8, fontSize: 12, paddingTop: 4 }}>
                      <StatusDot status={x.status} />
                      <span style={{ minWidth: 180 }}>{x.agent_name}</span>
                      <span style={{ opacity: 0.6 }}>{x.duration_ms ?? '-'} ms</span>
                      {x.error && <span style={{ color: '#ff6b6b' }}>{x.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'completed' || status === 'succeeded' ? '#4ade80'
    : status === 'failed' ? '#ff6b6b'
    : status === 'processing' || status === 'started' ? '#fbbf24'
    : status === 'skipped' ? '#94a3b8'
    : '#64748b'
  return <span aria-hidden style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: color
  }} />
}

function timeAgo(iso?: string) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
