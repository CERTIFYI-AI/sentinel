/**
 * CascadeVisualizer — a lightweight SVG visualization of an event cascade.
 * Given a root governance_event id, recursively queries event_cascade_links
 * to render the full autonomous mesh activation for that event.
 *
 * For Fortune 500 teams: read-only, print-friendly, no external deps.
 */
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface CascadeNode {
  id: string
  event_type: string
  source_module: string
  status: string
  cascade_depth: number
  created_at: string
  children: CascadeNode[]
}

interface Props { rootEventId: string }

export function CascadeVisualizer({ rootEventId }: Props) {
  const [root, setRoot] = useState<CascadeNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return }
      // Fetch the graph top-down
      const visited = new Set<string>()
      async function fetchNode(id: string): Promise<CascadeNode | null> {
        if (visited.has(id)) return null
        visited.add(id)
        const { data: evt } = await supabase.from('governance_events').select('*').eq('id', id).single()
        if (!evt) return null
        const { data: links } = await supabase.from('event_cascade_links')
          .select('child_event_id').eq('parent_event_id', id)
        const children: CascadeNode[] = []
        for (const lk of links ?? []) {
          const child = await fetchNode(lk.child_event_id)
          if (child) children.push(child)
        }
        return {
          id: evt.id,
          event_type: evt.event_type,
          source_module: evt.source_module,
          status: evt.status,
          cascade_depth: evt.cascade_depth ?? 0,
          created_at: evt.created_at,
          children,
        }
      }
      const r = await fetchNode(rootEventId)
      if (!cancelled) { setRoot(r); setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [rootEventId])

  if (loading) return <div>Loading cascade…</div>
  if (!root)   return <div>No cascade found for this event.</div>

  return (
    <div className="sentinel-cascade-viz" role="tree" aria-label="Event cascade">
      <Node node={root} />
    </div>
  )
}

function Node({ node }: { node: CascadeNode }) {
  const color = node.status === 'completed' ? '#4ade80' : node.status === 'failed' ? '#ff6b6b' : '#fbbf24'
  return (
    <div style={{ marginLeft: node.cascade_depth * 16, paddingLeft: 12, borderLeft: `2px solid ${color}`, marginTop: 6 }}>
      <div style={{ fontSize: 13 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: color, marginRight: 8 }} />
        <strong>{node.event_type}</strong>
        <span style={{ opacity: 0.6, marginLeft: 8 }}>{node.source_module} · depth {node.cascade_depth}</span>
      </div>
      {node.children.map(c => <Node key={c.id} node={c} />)}
    </div>
  )
}
