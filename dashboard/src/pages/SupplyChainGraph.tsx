// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AI Supply Chain Graph — the interactive canvas, now drawn from real data.
//
// Kept from the previous version (they were genuinely good): the downstream
// impact BFS, and the SVG pan/zoom canvas.
//
// Replaced:
//   * the frozen NODES/EDGES literals — nodes are built from provenance_nodes
//     joined to ai_models / datasets / use_cases / vendors, plus the inventory
//     that has no lineage recorded yet (shown honestly, behind a toggle);
//     edges come from provenance_edges;
//   * `mean(riskLevel label) × 25` presented as a "Supply Chain Risk Score
//     /100" — deleted. Risk is now read from each register's own
//     classification, and a node whose register records none says so;
//   * the invented volumetrics ('890K/day', '50K decisions/mo') — deleted;
//   * two export buttons that only fired toasts — both now download real files;
//   * "SCCs required" asserted from a hardcoded boolean — the canvas now
//     reports the jurisdictions and the transfer mechanism actually recorded on
//     the edge, and says so plainly when none is;
//   * hardcoded x/y — the layout is computed from the graph's longest-path
//     ranks;
//   * the imported-but-never-called useNavigate — every node now deep-links to
//     its record.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  TreeStructure, Eye, X, Export, Globe, ShieldWarning,
  Database, Brain, Cpu, ChartLine, Buildings, Stack, ArrowSquareOut,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { Button } from '@/components/ui/button'
import { useOrgName } from '../hooks/useOrganization'
import { useProvenanceGraph } from '@/hooks/useProvenanceData'
import { useSupplyChainEntities, type EntityKind } from '@/hooks/useSupplyChainEntities'
import { isCrossBorder, transferMechanismLabel, type ProvenanceEdge } from '@/services/provenanceService'

// ── Presentation ───────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  data_source: 'hsl(var(--s-in-tx))',
  dataset: 'hsl(var(--s-wn-tx))',
  model: 'hsl(var(--tag-purple))',
  pipeline: 'hsl(var(--r-hi-tx))',
  use_case: 'hsl(var(--s-ok-tx))',
  vendor: 'hsl(var(--brand))',
  component: 'hsl(var(--text-3))',
  output: 'hsl(var(--s-in-tx))',
}
const colorFor = (t: string) => NODE_COLORS[t] ?? 'hsl(var(--text-3))'

/** Only the classifications the registers actually use. No default tier. */
const RISK_RING: Record<string, string> = {
  critical: 'hsl(var(--s-er-tx))',
  high: 'hsl(var(--r-hi-tx))',
  unacceptable: 'hsl(var(--s-er-tx))',
  medium: 'hsl(var(--s-wn-tx))',
  limited: 'hsl(var(--s-wn-tx))',
  low: 'hsl(var(--s-ok-tx))',
  minimal: 'hsl(var(--s-ok-tx))',
}
/** A node whose register records no classification gets a neutral ring, not a guess. */
const RISK_UNRECORDED = 'hsl(var(--border))'
const ringFor = (risk: string | null) => (risk ? RISK_RING[risk.toLowerCase()] ?? RISK_UNRECORDED : RISK_UNRECORDED)

const NODE_ICON: Record<string, React.ElementType> = {
  data_source: Database,
  dataset: ChartLine,
  model: Brain,
  pipeline: Stack,
  use_case: Cpu,
  vendor: Buildings,
  component: Stack,
  output: Eye,
}

const NODE_W = 140
const NODE_H = 54
const COL_GAP = 230
const ROW_GAP = 86

const humanise = (v: string) => v.replace(/_/g, ' ')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')

interface CanvasNode {
  /** Provenance node id, or `inventory:<kind>:<uuid>` for an unmapped record. */
  id: string
  provenanceId: string | null
  kind: string
  label: string
  entityKind: EntityKind | null
  entityId: string | null
  /** From the owning register. null = the register records no classification. */
  risk: string | null
  verificationStatus: string | null
  version: string | null
  artifactUri: string | null
  x: number
  y: number
  /** True for inventory records with no provenance node — no lineage recorded. */
  unmapped: boolean
}

export default function SupplyChainGraph() {
  const orgName = useOrgName()
  const nav = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')

  const { graph, isLoading, error, refetch } = useProvenanceGraph()
  const entities = useSupplyChainEntities()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [impactNodes, setImpactNodes] = useState<Set<string>>(new Set())
  const [showTransfers, setShowTransfers] = useState(false)
  const [impactMode, setImpactMode] = useState(false)
  const [showUnmapped, setShowUnmapped] = useState(false)
  const [zoom, setZoom] = useState(0.9)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })

  /**
   * Build the canvas from the real registers.
   *   * one node per provenance_node, labelled from the entity it references;
   *   * plus every model / dataset / use case / vendor with no provenance node,
   *     placed in a trailing "no lineage recorded" column (toggleable) — the
   *     honest statement that we do not know their supply chain, rather than
   *     omitting them.
   * Coordinates are computed from the DAG's longest-path ranks.
   */
  const { nodes, mappedEntityIds } = useMemo(() => {
    const mapped = new Set<string>()
    const byRank = new Map<number, CanvasNode[]>()

    const resolveEntity = (n: typeof graph.nodes[number]): { kind: EntityKind | null; id: string | null } => {
      if (n.modelId) return { kind: 'model', id: n.modelId }
      if (n.datasetId) return { kind: 'dataset', id: n.datasetId }
      if (n.useCaseId) return { kind: 'use_case', id: n.useCaseId }
      if (n.vendorId) return { kind: 'vendor', id: n.vendorId }
      return { kind: null, id: null }
    }

    for (const n of graph.nodes) {
      const { kind, id } = resolveEntity(n)
      if (id) mapped.add(id)
      const resolvedName = kind && id ? entities.resolve(kind, id) : null
      const ref = kind && id ? [...entities.models, ...entities.datasets, ...entities.useCases, ...entities.vendors].find(e => e.id === id) : undefined
      const rank = graph.ranks.get(n.id) ?? 0
      const list = byRank.get(rank) ?? []
      list.push({
        id: n.id,
        provenanceId: n.id,
        kind: n.nodeType,
        // Prefer the canonical register name; fall back to the node's own label.
        label: resolvedName && resolvedName !== 'Unavailable' && resolvedName !== '…' ? resolvedName : n.label,
        entityKind: kind,
        entityId: id,
        risk: ref?.risk ?? null,
        verificationStatus: n.verificationStatus,
        version: n.version,
        artifactUri: n.artifactUri,
        x: 0, y: 0,
        unmapped: false,
      })
      byRank.set(rank, list)
    }

    const maxRank = byRank.size ? Math.max(...byRank.keys()) : -1

    // Inventory with no provenance node at all.
    const inventory: CanvasNode[] = []
    const addInventory = (kind: EntityKind, canvasKind: string) => {
      const list = kind === 'model' ? entities.models
        : kind === 'dataset' ? entities.datasets
        : kind === 'use_case' ? entities.useCases
        : entities.vendors
      for (const e of list) {
        if (mapped.has(e.id)) continue
        inventory.push({
          id: `inventory:${kind}:${e.id}`,
          provenanceId: null,
          kind: canvasKind,
          label: e.name,
          entityKind: kind,
          entityId: e.id,
          risk: e.risk,
          verificationStatus: null,
          version: null,
          artifactUri: null,
          x: 0, y: 0,
          unmapped: true,
        })
      }
    }
    addInventory('model', 'model')
    addInventory('dataset', 'dataset')
    addInventory('use_case', 'use_case')
    addInventory('vendor', 'vendor')

    const all: CanvasNode[] = []
    for (const rank of [...byRank.keys()].sort((a, b) => a - b)) {
      byRank.get(rank)!.forEach((n, i) => {
        all.push({ ...n, x: 40 + rank * COL_GAP, y: 30 + i * ROW_GAP })
      })
    }
    inventory.forEach((n, i) => {
      all.push({ ...n, x: 40 + (maxRank + 1) * COL_GAP, y: 30 + i * ROW_GAP })
    })

    return { nodes: all, mappedEntityIds: mapped }
  }, [graph, entities])

  const visibleNodes = useMemo(
    () => nodes.filter(n => showUnmapped || !n.unmapped),
    [nodes, showUnmapped],
  )
  const visibleIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes])
  const edges = useMemo(
    () => graph.edges.filter(e => visibleIds.has(e.sourceNodeId) && visibleIds.has(e.targetNodeId)),
    [graph.edges, visibleIds],
  )

  const selected = visibleNodes.find(n => n.id === selectedId) ?? null

  // ?model=<uuid> selects and centres that model's node.
  useEffect(() => {
    if (!modelParam || selectedId) return
    const hit = nodes.find(n => n.entityKind === 'model' && n.entityId === modelParam)
    if (hit) {
      if (hit.unmapped) setShowUnmapped(true)
      setSelectedId(hit.id)
      setPan({ x: 240 - hit.x * 0.9, y: 160 - hit.y * 0.9 })
    }
  }, [modelParam, nodes, selectedId])

  // Downstream impact — unchanged BFS, now over the real edges.
  const computeImpact = useCallback((nodeId: string): Set<string> => {
    const visited = new Set<string>()
    const queue = [nodeId]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      edges.filter(e => e.sourceNodeId === current).forEach(e => queue.push(e.targetNodeId))
    }
    return visited
  }, [edges])

  function handleNodeClick(node: CanvasNode) {
    setSelectedId(node.id)
    setImpactNodes(impactMode ? computeImpact(node.id) : new Set())
  }

  function handleSvgMouseDown(e: React.MouseEvent) {
    if (e.target === svgRef.current) {
      setDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y })
    }
  }
  function handleSvgMouseMove(e: React.MouseEvent) {
    if (dragging) setPan({ x: dragStart.panX + (e.clientX - dragStart.x), y: dragStart.panY + (e.clientY - dragStart.y) })
  }
  function handleSvgMouseUp() { setDragging(false) }
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)))
  }

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
    setSelectedId(null)
  }

  /** Real download of the graph as data — not a toast. */
  function exportGraphJson() {
    if (!visibleNodes.length) { toast.info('There is no graph to export yet'); return }
    const payload = {
      _format: 'sentinel-supply-chain-graph/1',
      _note: 'Nodes marked unmapped have no provenance record — their lineage is unknown, not absent. Cross-border facts are as recorded on the edge; Sentinel draws no legal conclusion from them.',
      exportedAt: new Date().toISOString(),
      nodes: visibleNodes.map(n => ({
        id: n.id, kind: n.kind, label: n.label,
        entityKind: n.entityKind, entityId: n.entityId,
        risk: n.risk, verificationStatus: n.verificationStatus, unmapped: n.unmapped,
      })),
      edges: edges.map(e => ({
        id: e.id, source: e.sourceNodeId, target: e.targetNodeId, type: e.edgeType,
        sourceJurisdiction: e.sourceJurisdiction, targetJurisdiction: e.targetJurisdiction,
        transferMechanism: e.transferMechanism, legalBasis: e.legalBasis,
        validFrom: e.validFrom, validTo: e.validTo,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supply-chain-graph.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`Exported ${visibleNodes.length} nodes and ${edges.length} edges`)
  }

  /** Serialises the live canvas — the file really is the graph on screen. */
  function exportGraphSvg() {
    const svg = svgRef.current
    if (!svg) { toast.error('The canvas is not ready yet'); return }
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supply-chain-graph.svg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Exported the canvas as SVG')
  }

  function openRecord(node: CanvasNode) {
    const to = node.entityKind && node.entityId ? entities.routeFor(node.entityKind, node.entityId) : null
    if (!to) { toast.info('This node does not reference a record that can be opened'); return }
    nav(to)
  }

  const crossBorderEdges = edges.filter(isCrossBorder)
  const unmappedCount = nodes.filter(n => n.unmapped).length
  const unverifiedCount = visibleNodes.filter(n => n.verificationStatus && n.verificationStatus !== 'verified').length

  const nodeColor = (n: CanvasNode) => {
    if (impactNodes.size > 0 && !impactNodes.has(n.id)) return 'hsl(var(--text-4))'
    return colorFor(n.kind)
  }
  const nodeOpacity = (n: CanvasNode) => (impactNodes.size > 0 ? (impactNodes.has(n.id) ? 1 : 0.3) : 1)

  const edgeLabel = (e: ProvenanceEdge) => {
    const mechanism = transferMechanismLabel(e)
    return mechanism
      ? `${e.sourceJurisdiction}→${e.targetJurisdiction}: ${mechanism}`
      : `${e.sourceJurisdiction}→${e.targetJurisdiction}: no transfer mechanism recorded`
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Supply Chain Graph"
        subtitle={`${orgName} · Lineage recorded in the provenance register, joined to the model, dataset, use-case and vendor registers`}
        icon={TreeStructure}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportGraphJson}>Export data</Button>
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportGraphSvg}>Export SVG</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Centred on <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model focus" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {isLoading ? <TableSkeleton cols={6} />
        : error ? <ErrorState message={error.message} onRetry={refetch} />
        : nodes.length === 0 ? (
          <EmptyState
            title="Nothing to map yet"
            message="Register models, datasets, use cases or vendors, then record the lineage between them in the Provenance Graph. This canvas is drawn from those records."
            actionLabel="Open Provenance Graph"
            onAction={() => nav('/provenance')}
          />
        ) : (
          <>
            <StatCardRow
              cards={[
                { label: 'Nodes in view', value: visibleNodes.length, icon: <TreeStructure size={14} /> },
                { label: 'Lineage edges', value: edges.length, icon: <ChartLine size={14} /> },
                {
                  label: 'Cross-border edges', value: crossBorderEdges.length,
                  variant: crossBorderEdges.length ? 'warning' : 'default', icon: <Globe size={14} />,
                  description: 'Both jurisdictions recorded on the edge and different',
                },
                {
                  label: 'No lineage recorded', value: unmappedCount,
                  variant: unmappedCount ? 'warning' : 'success', icon: <ShieldWarning size={14} />,
                  description: 'Registered records with no provenance node',
                },
              ]}
            />

            {/* ── Controls ── */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => { setImpactMode(!impactMode); setImpactNodes(new Set()); setSelectedId(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                style={{ background: impactMode ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))', color: impactMode ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))', border: `1px solid ${impactMode ? 'hsl(var(--brand))' : 'hsl(var(--border))'}` }}>
                <Eye size={14} /> Impact analysis {impactMode ? '(on)' : '(off)'}
              </button>
              <button onClick={() => setShowTransfers(!showTransfers)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                style={{ background: showTransfers ? 'hsl(var(--r-hi-bg))' : 'hsl(var(--bg-surface))', color: showTransfers ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-2))', border: `1px solid ${showTransfers ? 'hsl(var(--r-hi-br))' : 'hsl(var(--border))'}` }}>
                <Globe size={14} /> Cross-border facts {showTransfers ? '(on)' : '(off)'}
              </button>
              <button onClick={() => setShowUnmapped(!showUnmapped)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                style={{ background: showUnmapped ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--bg-surface))', color: showUnmapped ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-2))', border: `1px solid ${showUnmapped ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--border))'}` }}>
                <ShieldWarning size={14} /> Records without lineage ({unmappedCount})
              </button>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-3 py-1.5 text-sm" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>+ Zoom</button>
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="px-3 py-1.5 text-sm" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>− Zoom</button>
              <button onClick={() => { setZoom(0.9); setPan({ x: 0, y: 0 }) }} className="px-3 py-1.5 text-sm" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>Reset</button>
              <div className="ml-auto flex flex-wrap items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                {['data_source', 'dataset', 'model', 'pipeline', 'use_case', 'vendor'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="h-3 w-3" style={{ background: colorFor(t) }} /> {humanise(t)}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Canvas ── */}
            <div className="relative overflow-hidden" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', height: 600 }}>
              <svg
                ref={svgRef}
                width="100%" height="100%"
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onWheel={handleWheel}
              >
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--text-3))" />
                  </marker>
                  <marker id="arrow-cb" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--r-hi-tx))" />
                  </marker>
                </defs>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {edges.map(edge => {
                    const src = visibleNodes.find(n => n.id === edge.sourceNodeId)
                    const tgt = visibleNodes.find(n => n.id === edge.targetNodeId)
                    if (!src || !tgt) return null
                    const x1 = src.x + NODE_W
                    const y1 = src.y + NODE_H / 2
                    const x2 = tgt.x
                    const y2 = tgt.y + NODE_H / 2
                    const mx = (x1 + x2) / 2
                    const crossB = isCrossBorder(edge) && showTransfers
                    const isSelected = selectedId === edge.sourceNodeId || selectedId === edge.targetNodeId
                    return (
                      <g key={edge.id}>
                        <path
                          d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                          fill="none"
                          stroke={crossB ? 'hsl(var(--r-hi-tx))' : isSelected ? 'hsl(var(--brand))' : 'hsl(var(--border))'}
                          strokeWidth={isSelected ? 2 : 1.5}
                          strokeDasharray={crossB ? '6 3' : 'none'}
                          strokeOpacity={impactNodes.size > 0 && !impactNodes.has(edge.sourceNodeId) ? 0.15 : 0.8}
                          markerEnd={crossB ? 'url(#arrow-cb)' : 'url(#arrow)'}
                        />
                        <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={8} fill="hsl(var(--text-4))">
                          {humanise(edge.edgeType)}
                        </text>
                        {crossB && (
                          <text x={mx} y={(y1 + y2) / 2 + 8} textAnchor="middle" fontSize={8}
                            fill={transferMechanismLabel(edge) ? 'hsl(var(--s-in-tx))' : 'hsl(var(--s-wn-tx))'}>
                            {edgeLabel(edge)}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {visibleNodes.map(node => {
                    const color = nodeColor(node)
                    const isSelected = selectedId === node.id
                    return (
                      <g key={node.id} transform={`translate(${node.x},${node.y})`}
                        style={{ opacity: nodeOpacity(node), cursor: 'pointer' }}
                        onClick={() => handleNodeClick(node)}>
                        <rect x={-4} y={-4} width={NODE_W + 8} height={NODE_H + 8}
                          fill="none" stroke={ringFor(node.risk)} strokeWidth={2}
                          strokeDasharray={node.risk ? 'none' : '3 3'}
                          opacity={isSelected ? 1 : 0.5} />
                        <rect width={NODE_W} height={NODE_H}
                          fill="hsl(var(--bg-surface))" stroke={isSelected ? color : 'hsl(var(--border))'}
                          strokeWidth={isSelected ? 2 : 1}
                          strokeDasharray={node.unmapped ? '4 2' : 'none'} />
                        <rect width={4} height={NODE_H} fill={color} />
                        <text x={14} y={18} fontSize={8} fill={color} fontWeight="bold">
                          {humanise(node.kind).toUpperCase()}
                        </text>
                        <text x={14} y={34} fontSize={11} fill="hsl(var(--text-1))">
                          {node.label.length > 18 ? `${node.label.slice(0, 18)}…` : node.label}
                        </text>
                        <text x={14} y={47} fontSize={8} fill={node.risk ? ringFor(node.risk) : 'hsl(var(--text-4))'}>
                          {node.risk ? `${node.risk} risk` : 'risk not recorded'}
                        </text>
                        {node.unmapped && (
                          <text x={NODE_W - 6} y={14} fontSize={7} textAnchor="end" fill="hsl(var(--s-wn-tx))">no lineage</text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>

              {impactMode && (
                <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                  <Eye size={12} /> Click any node to highlight what it feeds downstream
                </div>
              )}
            </div>

            {/* ── Node detail ── */}
            {selected && (
              <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: 20 }}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ background: 'hsl(var(--bg-raised))', padding: 10, border: `2px solid ${colorFor(selected.kind)}` }}>
                      {(() => { const Icon = NODE_ICON[selected.kind] ?? Stack; return <Icon size={20} style={{ color: colorFor(selected.kind) }} /> })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selected.label}</p>
                        <span className="px-1.5 py-0.5 text-xs"
                          style={{ background: 'hsl(var(--bg-raised))', color: selected.risk ? ringFor(selected.risk) : 'hsl(var(--text-4))', border: `1px solid ${ringFor(selected.risk)}` }}>
                          {selected.risk ? `${selected.risk} risk` : 'risk not recorded'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: colorFor(selected.kind) }}>{humanise(selected.kind).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {impactNodes.size > 1 && (
                      <div className="px-2 py-1 text-xs" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>
                        Removing this node affects {impactNodes.size - 1} downstream nodes
                      </div>
                    )}
                    <button aria-label="Close node detail" onClick={() => { setSelectedId(null); setImpactNodes(new Set()) }}
                      style={{ color: 'hsl(var(--text-3))', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Register record', value: selected.entityKind && selected.entityId ? (entities.resolve(selected.entityKind, selected.entityId) ?? '—') : '—' },
                    { label: 'Version', value: text(selected.version) },
                    { label: 'Artifact URI', value: text(selected.artifactUri) },
                    {
                      label: 'Verification',
                      value: selected.verificationStatus
                        ? (selected.verificationStatus === 'unverified' ? 'Unverified' : selected.verificationStatus)
                        : '—',
                    },
                  ].map(f => (
                    <div key={f.label} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: 10 }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{f.label}</p>
                      <p className="mt-0.5 truncate text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }} title={f.value}>{f.value}</p>
                    </div>
                  ))}
                </div>

                {selected.unmapped && (
                  <p className="mt-3 text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                    No provenance node references this record, so its supply chain is unknown. Record its lineage in the Provenance Graph.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.entityKind && selected.entityId && entities.routeFor(selected.entityKind, selected.entityId) && (
                    <Button size="xs" variant="secondary" icon={<ArrowSquareOut />} onClick={() => openRecord(selected)}>
                      Open {humanise(selected.entityKind)} record
                    </Button>
                  )}
                  {selected.entityKind === 'model' && selected.entityId && (
                    <>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/aibom?model=${selected.entityId}`)}>AIBOM</Button>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain?model=${selected.entityId}`)}>Attestations</Button>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/provenance?model=${selected.entityId}`)}>Provenance</Button>
                    </>
                  )}
                  {selected.provenanceId && (
                    <Button size="xs" variant="secondary" onClick={() => nav(`/provenance?open=${selected.provenanceId}`)}>Open in provenance graph</Button>
                  )}
                </div>

                {impactNodes.size > 1 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                      Downstream impact ({impactNodes.size - 1} affected nodes)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...impactNodes].filter(id => id !== selected.id).map(id => {
                        const n = visibleNodes.find(x => x.id === id)
                        return n ? (
                          <span key={id} className="px-2 py-1 text-xs" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>{n.label}</span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mappedEntityIds.size === 0 && (
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                No provenance node references a registered model, dataset, use case or vendor yet — every node on this canvas is unmapped inventory.
              </p>
            )}
          </>
        )}
    </div>
  )
}
