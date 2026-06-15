// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS2 — Governance Mesh: real-time agent cascade visualizer.
import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useRequiredOrgId } from '../hooks/useTenant'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

interface GovEvent {
  id: string
  event_type: string
  source_module: string
  status: string
  triggered_agents: string[]
  cascade_depth: number
  created_at: string
  payload: Record<string, unknown>
}

interface AgentExecution {
  id: string
  agent_name: string
  event_type: string
  status: string
  duration_ms: number
  created_at: string
}

export default function GovernanceMesh() {
  const orgId = useRequiredOrgId()
  const [events, setEvents] = useState<GovEvent[]>([])
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      if (!isSupabaseConfigured()) {
        const mockAgents = [
          { id: 'agt-1', agent_name: 'Policy Compliance Agent', description: 'Audits prompt payloads and model outputs against GRC rulesets.', is_enabled: true, total_executions: 1845, error_rate: 0.002, priority: 1, trigger_events: ['Model Output Gen'] },
          { id: 'agt-2', agent_name: 'Resource Allocation Agent', description: 'Manages dynamic scaling and GPU load limits based on ESG targets.', is_enabled: true, total_executions: 4522, error_rate: 0.000, priority: 2, trigger_events: ['Compute Limit Alert'] },
          { id: 'agt-3', agent_name: 'Remediation Router Agent', description: 'Routes detected vulnerabilities to engineering ticket pipelines.', is_enabled: true, total_executions: 982, error_rate: 0.012, priority: 3, trigger_events: ['Scan Center Finding'] },
          { id: 'agt-4', agent_name: 'Alert Notification Agent', description: 'Sends high-severity alerts to Slack and Security Operation Center.', is_enabled: true, total_executions: 1205, error_rate: 0.000, priority: 4, trigger_events: ['High Risk Event'] },
          { id: 'agt-5', agent_name: 'IAM Revocation Agent', description: 'Revokes access credentials automatically on threat detection.', is_enabled: false, total_executions: 145, error_rate: 0.021, priority: 5, trigger_events: ['Credentials Leaked'] }
        ]
        
        const mockEvents = [
          { id: 'evt-1', event_type: 'Model Output Gen', source_module: 'Inference API', status: 'completed', triggered_agents: ['Policy Compliance Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 300000).toISOString(), payload: {} },
          { id: 'evt-2', event_type: 'Compute Limit Alert', source_module: 'Model Efficiency', status: 'completed', triggered_agents: ['Resource Allocation Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 900000).toISOString(), payload: {} },
          { id: 'evt-3', event_type: 'Scan Center Finding', source_module: 'Scan Center', status: 'completed', triggered_agents: ['Remediation Router Agent'], cascade_depth: 2, created_at: new Date(Date.now() - 3600000).toISOString(), payload: {} },
          { id: 'evt-4', event_type: 'High Risk Event', source_module: 'Threat Monitor', status: 'failed', triggered_agents: ['Alert Notification Agent'], cascade_depth: 1, created_at: new Date(Date.now() - 7200000).toISOString(), payload: {} }
        ]

        const mockExecutions = [
          { id: 'exec-1', agent_name: 'Policy Compliance Agent', event_type: 'Model Output Gen', status: 'completed', duration_ms: 84, created_at: new Date(Date.now() - 300000).toISOString() },
          { id: 'exec-2', agent_name: 'Resource Allocation Agent', event_type: 'Compute Limit Alert', status: 'completed', duration_ms: 120, created_at: new Date(Date.now() - 900000).toISOString() },
          { id: 'exec-3', agent_name: 'Remediation Router Agent', event_type: 'Scan Center Finding', status: 'completed', duration_ms: 320, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'exec-4', agent_name: 'Alert Notification Agent', event_type: 'High Risk Event', status: 'failed', duration_ms: 15, created_at: new Date(Date.now() - 7200000).toISOString() }
        ]

        setEvents(mockEvents)
        setExecutions(mockExecutions)
        setAgents(mockAgents)
        setLoading(false)
        return
      }

      const [evts, execs, agts] = await Promise.all([
        supabase.from('governance_events').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
        supabase.from('agent_executions').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100),
        supabase.from('agent_registry').select('*').or(`org_id.eq.${orgId},org_id.is.null`).order('priority'),
      ])
      setEvents(evts.data ?? [])
      setExecutions(execs.data ?? [])
      setAgents(agts.data ?? [])
      setLoading(false)
    }
    load()

    if (!isSupabaseConfigured()) return

    // Real-time subscription
    const channel = supabase.channel('governance-mesh')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'governance_events', filter: `org_id=eq.${orgId}` },
        (payload) => setEvents(prev => [payload.new as GovEvent, ...prev].slice(0, 50)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_executions', filter: `org_id=eq.${orgId}` },
        (payload) => setExecutions(prev => [payload.new as AgentExecution, ...prev].slice(0, 100)))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  const statusColor = (s: string) => ({ completed: 'bg-green-100 text-green-700', processing: 'bg-blue-100 text-blue-700', failed: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700', dead_letter: 'bg-red-200 text-red-800' } as Record<string,string>)[s] ?? 'bg-zinc-100 text-zinc-600'

  const agentsList = agents || []
  const eventsList = events || []
  const executionsList = executions || []

  const enabledCount = agentsList.filter(a => a.is_enabled).length
  const completedToday = eventsList.filter(e => {
    if (!e || !e.created_at) return false;
    const date = new Date(e.created_at);
    return e.status === 'completed' && !isNaN(date.getTime()) && date > new Date(Date.now() - 86400000);
  }).length
  const errorRate = executionsList.length > 0 ? ((executionsList.filter(e => e.status === 'failed').length / executionsList.length) * 100).toFixed(1) : '0.0'

  if (loading) return <div className="p-8 text-zinc-400 animate-pulse">Loading governance mesh...</div>

  return (
    <main id="main-content" className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Autonomous Governance Mesh</h1>
        <p className="text-zinc-500 text-sm mt-1">Real-time event bus monitoring — {agentsList.length} agents across 3 cascade flows.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: enabledCount, sub: `${agentsList.length} total` },
          { label: 'Events Today', value: completedToday, sub: 'completed' },
          { label: 'Total Events', value: eventsList.length, sub: 'in window' },
          { label: 'Error Rate', value: `${errorRate}%`, sub: 'agent executions' },
        ].map((k) => (
          <div key={k.label} className="border border-zinc-200 rounded p-4">
            <p className="text-2xl font-bold text-zinc-900">{k.value}</p>
            <p className="text-sm font-medium text-zinc-600 mt-1">{k.label}</p>
            <p className="text-xs text-zinc-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Stream */}
        <div className="border border-zinc-200 rounded">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Live Event Stream</h2>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live" />
          </div>
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {eventsList.length === 0 && <p className="p-4 text-sm text-zinc-400 text-center">No events yet. Register a model to trigger the cascade.</p>}
            {eventsList.map((e) => (
              <button key={e.id} onClick={() => setSelectedEvent(e.id === selectedEvent ? null : e.id)}
                className={`w-full text-left p-3 hover:bg-zinc-50 transition-colors ${selectedEvent === e.id ? 'bg-zinc-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(e.status)}`}>{e.status}</span>
                  <span className="text-sm font-medium text-zinc-800 truncate">{e.event_type}</span>
                  <span className="ml-auto text-xs text-zinc-400">D{e.cascade_depth}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{e.source_module} · {new Date(e.created_at).toLocaleTimeString()}</p>
                {selectedEvent === e.id && e.triggered_agents && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.triggered_agents.map(a => <span key={a} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{a}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Registry */}
        <div className="border border-zinc-200 rounded">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="font-medium text-zinc-900">Agent Registry</h2>
          </div>
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {agentsList.map((a) => (
              <div key={a.id} className="p-3 flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${a.is_enabled ? 'bg-green-500' : 'bg-zinc-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{a.agent_name}</p>
                  <p className="text-xs text-zinc-400 truncate">{a.description ?? (a.trigger_events ?? []).join(', ')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-500">{a.total_executions ?? 0} runs</p>
                  <p className="text-xs text-zinc-400">{((a.error_rate ?? 0) * 100).toFixed(1)}% err</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
