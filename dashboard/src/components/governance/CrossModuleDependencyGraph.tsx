// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-05 — Replace ASCII dependency map with SVG-based dependency graph.
// Note: Uses a lightweight SVG-only implementation to avoid reactflow bundle impact.
import { useRef, useState } from 'react'

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  color: string
}

interface GraphEdge {
  from: string
  to: string
}

const NODES: GraphNode[] = [
  { id: 'model-inventory',   label: 'Model Inventory',    x: 400, y: 50,  color: 'hsl(var(--s-ok-tx))' },
  { id: 'risk-register',     label: 'Risk Register',      x: 150, y: 200, color: 'hsl(var(--s-er-tx))' },
  { id: 'compliance',        label: 'Compliance',         x: 400, y: 200, color: 'hsl(var(--s-in-tx))' },
  { id: 'vendors',           label: 'Vendor Registry',    x: 650, y: 200, color: 'hsl(var(--s-wn-tx))' },
  { id: 'incidents',         label: 'Incidents',          x: 150, y: 350, color: 'hsl(var(--tag-purple))' },
  { id: 'evidence',          label: 'Evidence Vault',     x: 400, y: 350, color: 'hsl(var(--s-in-tx))' },
  { id: 'audit-log',         label: 'Audit Log',          x: 650, y: 350, color: 'hsl(var(--text-3))' },
  { id: 'knowledge-graph',   label: 'Knowledge Graph',    x: 400, y: 500, color: 'hsl(var(--s-wn-tx))' },
]

const EDGES: GraphEdge[] = [
  { from: 'model-inventory', to: 'risk-register' },
  { from: 'model-inventory', to: 'compliance' },
  { from: 'model-inventory', to: 'vendors' },
  { from: 'risk-register',   to: 'incidents' },
  { from: 'compliance',      to: 'evidence' },
  { from: 'vendors',         to: 'risk-register' },
  { from: 'incidents',       to: 'audit-log' },
  { from: 'evidence',        to: 'audit-log' },
  { from: 'risk-register',   to: 'knowledge-graph' },
  { from: 'compliance',      to: 'knowledge-graph' },
  { from: 'incidents',       to: 'knowledge-graph' },
]

function findNode(id: string) { return NODES.find(n => n.id === id) }

export function CrossModuleDependencyGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const highlightedEdges = EDGES.filter(e => hoveredNode ? e.from === hoveredNode || e.to === hoveredNode : true)

  return (
    <div className="border border-zinc-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-zinc-900">Module Dependency Graph</h3>
        <p className="text-xs text-zinc-400">Hover a node to highlight dependencies</p>
      </div>
      <svg ref={svgRef} viewBox="0 0 800 580" className="w-full" role="img" aria-label="Cross-module dependency graph">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {EDGES.map((e, i) => {
          const from = findNode(e.from)
          const to = findNode(e.to)
          if (!from || !to) return null
          const isHighlighted = !hoveredNode || highlightedEdges.includes(e)
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={isHighlighted ? 'hsl(var(--text-3))' : 'hsl(var(--border))'}
              strokeWidth={isHighlighted ? 1.5 : 1}
              strokeOpacity={isHighlighted ? 0.8 : 0.3}
              markerEnd="url(#arrowhead)"
            />
          )
        })}

        {/* Nodes */}
        {NODES.map(node => {
          const isHovered = hoveredNode === node.id
          const isDimmed = hoveredNode && !isHovered && !EDGES.some(e =>
            (e.from === hoveredNode && e.to === node.id) ||
            (e.to === hoveredNode && e.from === node.id)
          )
          return (
            <g key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
              opacity={isDimmed ? 0.35 : 1}
              role="button"
              aria-label={`Module: ${node.label}`}
              tabIndex={0}
            >
              <circle cx={node.x} cy={node.y} r={isHovered ? 32 : 28}
                fill={isHovered ? node.color : `${node.color}22`}
                stroke={node.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
              <text x={node.x} y={node.y + 48} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">
                {node.label.split(' ').map((word, wi) => (
                  <tspan key={wi} x={node.x} dy={wi === 0 ? 0 : 14}>{word}</tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
