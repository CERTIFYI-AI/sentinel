/**
 * AgentRegistryPanel — live view of agent_registry with SLO health,
 * error rate, and priority. Admin-only UI for Fortune 500 SRE teams.
 */
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface Agent {
  id: string
  agent_name: string
  agent_type: string
  trigger_events: string[]
  target_modules: string[]
  is_enabled: boolean
  priority: number
  sla_ms: number
  avg_execution_ms: number
  p95_execution_ms: number
  error_rate: number
  total_executions: number
  last_execution_at: string | null
  description: string | null
  owner_team: string | null
  status: string
}

export function AgentRegistryPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [sortBy, setSortBy] = useState<'priority'|'errors'|'slowest'>('priority')

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void supabase.from('agent_registry')
      .select('*')
      .order('priority').order('agent_name')
      .then(({ data }) => setAgents(data as Agent[] ?? []))
  }, [])

  const sorted = [...agents].sort((a,b) => {
    if (sortBy === 'errors')  return b.error_rate - a.error_rate
    if (sortBy === 'slowest') return b.p95_execution_ms - a.p95_execution_ms
    return a.priority - b.priority
  })

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 600 }}>Agent Registry — {agents.length} agents</h3>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority'|'errors'|'slowest')}>
          <option value="priority">Sort by Priority</option>
          <option value="errors">Sort by Error Rate</option>
          <option value="slowest">Sort by p95 Latency</option>
        </select>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.7 }}>
            <th>Agent</th><th>Type</th><th>Triggers</th><th>Prio</th>
            <th>SLO</th><th>p95</th><th>Error %</th><th>Runs</th><th>Owner</th><th>On</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => {
            const slo = a.p95_execution_ms > a.sla_ms ? '❌' : '✅'
            return (
              <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td><strong>{a.agent_name}</strong><div style={{ opacity: 0.5, fontSize: 11 }}>{a.description}</div></td>
                <td>{a.agent_type}</td>
                <td><code style={{ fontSize: 10 }}>{(a.trigger_events ?? []).join(',')}</code></td>
                <td>{a.priority}</td>
                <td>{slo} {a.sla_ms}ms</td>
                <td>{a.p95_execution_ms}ms</td>
                <td style={{ color: a.error_rate > 0.05 ? 'hsl(var(--s-er-tx))' : 'inherit' }}>{(a.error_rate * 100).toFixed(2)}%</td>
                <td>{a.total_executions}</td>
                <td>{a.owner_team}</td>
                <td>{a.is_enabled ? '🟢' : '⚪'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
