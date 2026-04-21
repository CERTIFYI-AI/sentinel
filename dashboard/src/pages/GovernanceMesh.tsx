/**
 * GovernanceMesh — Fortune 500 command center for the autonomous
 * governance mesh. Surfaces:
 *   1. Live cascade activity feed (GovernanceActivityFeed)
 *   2. Cascade tree visualizer for the most recent event (CascadeVisualizer)
 *   3. Agent SLO dashboard (AgentRegistryPanel)
 *
 * This is the single operator-facing pane that answers:
 *   "Is the governance mesh healthy right now, and what did it just do?"
 */
import { useEffect, useState } from 'react'
import { GovernanceActivityFeed } from '../components/governance/GovernanceActivityFeed'
import { CascadeVisualizer } from '../components/governance/CascadeVisualizer'
import { AgentRegistryPanel } from '../components/governance/AgentRegistryPanel'
import { governanceBus } from '../lib/governance/eventBus'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function GovernanceMesh() {
  const orgId = governanceBus.resolveOrgId()
  const [latestEventId, setLatestEventId] = useState<string | null>(null)

  // Pull most-recent root event so the cascade visualizer has something to show.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!isSupabaseConfigured() || !supabase) return
      const { data } = await supabase
        .from('governance_events')
        .select('id, created_at')
        .eq('org_id', orgId)
        .eq('cascade_depth', 0)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (mounted && data?.id) setLatestEventId(data.id as string)
    })()
    return () => { mounted = false }
  }, [orgId])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'auto auto',
        gap: 16,
        padding: 16,
      }}
    >
      {/* Header spans full width */}
      <div style={{ gridColumn: '1 / span 2' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>
          Autonomous Governance Mesh
        </h1>
        <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 4 }}>
          27 governance agents · real-time cascade orchestration · idempotent · circuit-breaker protected
        </p>
      </div>

      {/* Live activity feed */}
      <div style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', minHeight: 520 }}>
        <GovernanceActivityFeed orgId={orgId} limit={30} />
      </div>

      {/* Cascade tree for latest root event */}
      <div style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', minHeight: 520 }}>
        {latestEventId ? (
          <CascadeVisualizer rootEventId={latestEventId} />
        ) : (
          <div style={{ padding: 16, fontSize: 12, color: 'hsl(var(--text-2))' }}>
            No cascades yet. Register a model, detect a risk, or create an incident to see the mesh in action.
          </div>
        )}
      </div>

      {/* Agent SLO dashboard spans full width */}
      <div style={{ gridColumn: '1 / span 2', border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
        <AgentRegistryPanel />
      </div>
    </div>
  )
}
