// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Provenance Graph — the AI supply-chain lineage DAG, rewritten onto the real
// org-scoped tables `provenance_nodes` / `provenance_edges`.
//
// What this rebuild deliberately does NOT do any more:
//   * it does not keep two in-file literals keyed by the business code
//     'MDL-001' — nodes join the one id-space via ai_models.id and friends;
//   * it does not discard the adjacency and draw a flat root+children list.
//     The renderer below FOLLOWS THE REAL EDGES recursively, so depth >= 3
//     renders correctly and a cycle in the data terminates at a marked node
//     instead of hanging the page;
//   * it does not render a literal `verified: true` as "Provenance Verified" —
//     verification comes from each node's verification_status, which only a
//     real verifier ever writes;
//   * its export button downloads a real file instead of firing a toast.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  TreeStructure, Export, Plus, X, ArrowSquareOut, ArrowsClockwise, Trash,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProvenanceGraph } from '@/hooks/useProvenanceData'
import { useSupplyChainEntities } from '@/hooks/useSupplyChainEntities'
import {
  descendantIds, ancestorIds, isCrossBorder, transferMechanismLabel,
  type ProvenanceNode, type ProvenanceEdge, type Adjacency,
} from '@/services/provenanceService'

const NODE_TYPES = ['model', 'dataset', 'component', 'vendor', 'data_source', 'pipeline', 'output'] as const
const EDGE_TYPES = ['derived_from', 'trained_on', 'built_by', 'deployed_as', 'feeds', 'uses', 'produces'] as const

const NODE_COLOR: Record<string, string> = {
  model: 'hsl(var(--brand))',
  dataset: 'hsl(var(--s-ok-tx))',
  component: 'hsl(var(--s-wn-tx))',
  vendor: 'hsl(var(--tag-purple))',
  data_source: 'hsl(var(--s-in-tx))',
  pipeline: 'hsl(var(--s-in-tx))',
  output: 'hsl(var(--text-3))',
}
const colorFor = (t: string) => NODE_COLOR[t] ?? 'hsl(var(--text-3))'

const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—')
const humanise = (v: string) => v.replace(/_/g, ' ')

/** Depth ceiling — a second guard beyond the cycle check. */
const MAX_DEPTH = 24

type Direction = 'upstream' | 'downstream'

interface BranchProps {
  nodeId: string
  nodes: Map<string, ProvenanceNode>
  adjacency: Adjacency
  direction: Direction
  /** Node ids on the current root→node path — the cycle guard. */
  path: string[]
  depth: number
  edgeLabel?: string
  onSelect: (node: ProvenanceNode) => void
  selectedId: string | null
}

/**
 * One node and, recursively, everything the REAL edges say feeds it
 * (upstream) or is fed by it (downstream). `path` carries the ancestry so a
 * cycle renders a terminal marker rather than recursing forever.
 */
function ProvenanceBranch({
  nodeId, nodes, adjacency, direction, path, depth, edgeLabel, onSelect, selectedId,
}: BranchProps) {
  const node = nodes.get(nodeId)
  if (!node) return null

  const cycle = path.includes(nodeId)
  const tooDeep = depth >= MAX_DEPTH
  const edges = cycle || tooDeep
    ? []
    : (direction === 'upstream' ? adjacency.in.get(nodeId) : adjacency.out.get(nodeId)) ?? []
  const color = colorFor(node.nodeType)
  const selected = selectedId === node.id

  return (
    <div className="space-y-2">
      {edgeLabel && (
        <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-4))]">{humanise(edgeLabel)}</p>
      )}
      <button
        onClick={() => onSelect(node)}
        className="block w-full max-w-md border bg-raised p-3 text-left transition-colors hover:border-[hsl(var(--brand))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
        style={{ borderColor: selected ? 'hsl(var(--brand))' : color, borderWidth: depth === 0 ? 2 : 1 }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-semibold uppercase" style={{ color }}>{humanise(node.nodeType)}</span>
          <span
            className="ml-auto text-[10px] font-medium"
            style={{
              color: node.verificationStatus === 'verified' ? 'hsl(var(--s-ok-tx))'
                : node.verificationStatus === 'failed' ? 'hsl(var(--destructive))'
                : 'hsl(var(--text-4))',
            }}
            title={node.verificationStatus === 'unverified' ? 'No verifier has checked this node' : undefined}
          >
            {node.verificationStatus === 'verified' ? 'Verified'
              : node.verificationStatus === 'failed' ? 'Verification failed'
              : 'Unverified'}
          </span>
        </div>
        <p className="text-sm font-medium text-[hsl(var(--text-1))]">{node.label}</p>
        <p className="text-[11px] text-[hsl(var(--text-4))]">
          {text(node.version)} · {node.slsaLevel ? `SLSA ${node.slsaLevel}` : 'SLSA level not recorded'}
        </p>
      </button>

      {cycle && (
        <p className="ml-4 flex items-center gap-1 text-[11px] text-[hsl(var(--s-wn-tx))]">
          <ArrowsClockwise size={12} /> Cycle — this node already appears on this path; traversal stopped here.
        </p>
      )}
      {tooDeep && !cycle && (
        <p className="ml-4 text-[11px] text-[hsl(var(--text-4))]">Depth limit reached — open this node to continue from it.</p>
      )}

      {edges.length > 0 && (
        <div className="ml-5 space-y-3 border-l-2 border-[hsl(var(--border))] pl-4">
          {edges.map(e => (
            <ProvenanceBranch
              key={e.id}
              nodeId={direction === 'upstream' ? e.sourceNodeId : e.targetNodeId}
              nodes={nodes}
              adjacency={adjacency}
              direction={direction}
              path={[...path, nodeId]}
              depth={depth + 1}
              edgeLabel={e.edgeType}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const BLANK_NODE = {
  nodeType: 'model' as string,
  label: '',
  modelId: '',
  vendorId: '',
  datasetId: '',
  useCaseId: '',
  version: '',
  artifactUri: '',
  sourceRepo: '',
  sourceCommit: '',
  slsaLevel: '',
  licenseSpdx: '',
}

const BLANK_EDGE = {
  sourceNodeId: '',
  targetNodeId: '',
  edgeType: 'trained_on' as string,
  sourceJurisdiction: '',
  targetJurisdiction: '',
  transferMechanism: '',
  legalBasis: '',
  validFrom: '',
  validTo: '',
}

export default function ProvenanceGraph() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { graph, isLoading, error, refetch, createNode, createEdge, removeNode, removeEdge } = useProvenanceGraph()
  const entities = useSupplyChainEntities()

  const [focusId, setFocusId] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>('upstream')
  const [selected, setSelected] = useState<ProvenanceNode | null>(null)
  const [nodeFormOpen, setNodeFormOpen] = useState(false)
  const [edgeFormOpen, setEdgeFormOpen] = useState(false)
  const [nodeForm, setNodeForm] = useState({ ...BLANK_NODE })
  const [edgeForm, setEdgeForm] = useState({ ...BLANK_EDGE })
  const [nodeToDelete, setNodeToDelete] = useState<ProvenanceNode | null>(null)
  const [edgeToDelete, setEdgeToDelete] = useState<ProvenanceEdge | null>(null)

  /** Candidate focus points: model nodes first, then any node with no parent. */
  const focusCandidates = useMemo(() => {
    const models = graph.nodes.filter(n => n.nodeType === 'model')
    const roots = graph.nodes.filter(n => graph.roots.includes(n.id) && n.nodeType !== 'model')
    return [...models, ...roots]
  }, [graph])

  // ?model=<uuid> focuses the provenance node for that model; ?open=<id>
  // focuses (and selects) a specific node. Each deep-link value is applied
  // once, so choosing a different focus afterwards is not snapped back.
  const appliedDeepLink = useRef<string | null>(null)
  useEffect(() => {
    const key = `${openParam ?? ''}|${modelParam ?? ''}`
    if (key !== '|' && appliedDeepLink.current !== key) {
      if (openParam) {
        const n = graph.byId.get(openParam)
        if (n) { appliedDeepLink.current = key; setFocusId(n.id); setSelected(n); return }
      }
      if (modelParam) {
        const n = graph.nodes.find(x => x.modelId === modelParam)
        if (n) { appliedDeepLink.current = key; setFocusId(n.id); return }
      }
    }
    if (!focusId && focusCandidates.length) setFocusId(focusCandidates[0].id)
  }, [openParam, modelParam, graph, focusCandidates, focusId])

  const focus = focusId ? graph.byId.get(focusId) ?? null : null

  /** The nodes actually reachable from the focus in the chosen direction. */
  const subgraphIds = useMemo(() => {
    if (!focus) return new Set<string>()
    return direction === 'upstream'
      ? ancestorIds(focus.id, graph.adjacency)
      : descendantIds(focus.id, graph.adjacency)
  }, [focus, direction, graph.adjacency])

  const subgraphNodes = graph.nodes.filter(n => subgraphIds.has(n.id))
  const subgraphEdges = graph.edges.filter(e => subgraphIds.has(e.sourceNodeId) && subgraphIds.has(e.targetNodeId))
  const crossBorderEdges = subgraphEdges.filter(isCrossBorder)
  const unverified = subgraphNodes.filter(n => n.verificationStatus !== 'verified').length

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  /** Real file download of the traversed subgraph — no fake toast. */
  function exportSubgraph() {
    if (!focus) { toast.info('Select a node to export its provenance'); return }
    const payload = {
      _format: 'sentinel-provenance/1',
      _note: 'Node verification_status values are reported as stored. "unverified" means no verifier has checked the node.',
      focus: { id: focus.id, label: focus.label, modelId: focus.modelId },
      direction,
      nodes: subgraphNodes,
      edges: subgraphEdges,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `provenance-${focus.id}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`Exported ${subgraphNodes.length} nodes and ${subgraphEdges.length} edges`)
  }

  async function submitNode() {
    if (!nodeForm.label.trim()) { toast.error('A node label is required'); return }
    try {
      const saved = await createNode.mutateAsync({
        nodeType: nodeForm.nodeType,
        label: nodeForm.label.trim(),
        modelId: nodeForm.modelId || null,
        vendorId: nodeForm.vendorId || null,
        datasetId: nodeForm.datasetId || null,
        useCaseId: nodeForm.useCaseId || null,
        version: nodeForm.version.trim() || null,
        artifactUri: nodeForm.artifactUri.trim() || null,
        sourceRepo: nodeForm.sourceRepo.trim() || null,
        sourceCommit: nodeForm.sourceCommit.trim() || null,
        slsaLevel: nodeForm.slsaLevel.trim() || null,
        licenseSpdx: nodeForm.licenseSpdx.trim() || null,
      })
      toast.success(`Node “${saved.label}” added`)
      setNodeForm({ ...BLANK_NODE })
      setNodeFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add the node')
    }
  }

  async function submitEdge() {
    if (!edgeForm.sourceNodeId || !edgeForm.targetNodeId) { toast.error('Pick both a source and a target node'); return }
    if (edgeForm.sourceNodeId === edgeForm.targetNodeId) { toast.error('An edge cannot point at its own source'); return }
    try {
      await createEdge.mutateAsync({
        sourceNodeId: edgeForm.sourceNodeId,
        targetNodeId: edgeForm.targetNodeId,
        edgeType: edgeForm.edgeType,
        sourceJurisdiction: edgeForm.sourceJurisdiction.trim() || null,
        targetJurisdiction: edgeForm.targetJurisdiction.trim() || null,
        transferMechanism: edgeForm.transferMechanism.trim() || null,
        legalBasis: edgeForm.legalBasis.trim() || null,
        validFrom: edgeForm.validFrom || null,
        validTo: edgeForm.validTo || null,
      })
      toast.success('Edge recorded')
      setEdgeForm({ ...BLANK_EDGE })
      setEdgeFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record the edge')
    }
  }

  async function confirmDeleteNode() {
    if (!nodeToDelete) return
    try {
      await removeNode.mutateAsync(nodeToDelete.id)
      if (focusId === nodeToDelete.id) setFocusId(null)
      if (selected?.id === nodeToDelete.id) setSelected(null)
      toast.success(`Node “${nodeToDelete.label}” deleted`)
      setNodeToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the node')
      // Rethrown so ConfirmDialog stays open on failure.
      throw e
    }
  }

  async function confirmDeleteEdge() {
    if (!edgeToDelete) return
    try {
      await removeEdge.mutateAsync(edgeToDelete.id)
      toast.success('Edge removed')
      setEdgeToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove the edge')
      throw e
    }
  }

  type NodeRow = ProvenanceNode & { name: string }
  const nodeRows: NodeRow[] = subgraphNodes.map(n => ({ ...n, name: n.label }))

  const nodeColumns: Column<NodeRow>[] = [
    { key: 'nodeType', header: 'Type', sortable: true, render: n => <span className="text-[10px] font-semibold uppercase" style={{ color: colorFor(n.nodeType) }}>{humanise(n.nodeType)}</span> },
    { key: 'label', header: 'Node', sortable: true, render: n => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{n.label}</span> },
    { key: 'version', header: 'Version', render: n => <span className="text-xs text-[hsl(var(--text-3))]">{text(n.version)}</span> },
    {
      key: 'linked', header: 'Linked record',
      render: n => {
        const links: { label: string; to: string }[] = []
        const push = (kind: 'model' | 'vendor' | 'dataset' | 'use_case', id: string | null) => {
          const to = entities.routeFor(kind, id)
          const name = entities.resolve(kind, id)
          if (to && name) links.push({ label: name, to })
        }
        push('model', n.modelId); push('vendor', n.vendorId); push('dataset', n.datasetId); push('use_case', n.useCaseId)
        if (!links.length) {
          const anyId = n.modelId || n.vendorId || n.datasetId || n.useCaseId
          return <span className="text-xs text-[hsl(var(--text-4))]">{anyId ? 'Unavailable' : '—'}</span>
        }
        return (
          <span className="flex flex-wrap gap-1">
            {links.map(l => (
              <button key={l.to} onClick={e => { e.stopPropagation(); nav(l.to) }}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
                {l.label} <ArrowSquareOut size={11} />
              </button>
            ))}
          </span>
        )
      },
    },
    { key: 'sourceCommit', header: 'Build', render: n => <span className="font-mono text-[10px] text-[hsl(var(--text-4))]">{n.sourceCommit ? n.sourceCommit.slice(0, 12) : '—'}</span> },
    { key: 'licenseSpdx', header: 'Licence', render: n => <span className="text-xs text-[hsl(var(--text-3))]">{text(n.licenseSpdx)}</span> },
    {
      key: 'verificationStatus', header: 'Verification', sortable: true,
      render: n => (
        <span className="text-[11px] font-medium" style={{
          color: n.verificationStatus === 'verified' ? 'hsl(var(--s-ok-tx))'
            : n.verificationStatus === 'failed' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))',
        }}>
          {n.verificationStatus === 'verified' ? 'Verified' : n.verificationStatus === 'failed' ? 'Failed' : 'Unverified'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Provenance Graph"
        subtitle="Trace every component of a model back to its source — the graph follows the recorded lineage edges, not a flattened summary"
        icon={TreeStructure}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportSubgraph}>Export</Button>
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setEdgeFormOpen(true)} disabled={graph.nodes.length < 2}>Add edge</Button>
            <Button size="sm" icon={<Plus />} onClick={() => setNodeFormOpen(true)}>Add node</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Focused on <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model focus" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {isLoading ? <TableSkeleton cols={7} />
        : error ? <ErrorState message={error.message} onRetry={refetch} />
        : graph.nodes.length === 0 ? (
          <EmptyState
            title="No provenance recorded yet"
            message="Add the models, datasets, pipelines and vendor components that make up your supply chain, then connect them with typed edges (trained on, derived from, built by). The graph is drawn from those edges."
            actionLabel="Add node"
            onAction={() => setNodeFormOpen(true)}
          />
        ) : (
          <>
            <StatCardRow
              className="mb-4"
              cards={[
                { label: 'Nodes in view', value: subgraphNodes.length, description: `${graph.nodes.length} in the register` },
                { label: 'Lineage edges', value: subgraphEdges.length },
                { label: 'Cross-border edges', value: crossBorderEdges.length, variant: crossBorderEdges.length ? 'warning' : 'default', description: 'Both jurisdictions recorded and different' },
                { label: 'Unverified nodes', value: unverified, variant: unverified ? 'warning' : 'success', description: 'No verifier has checked these nodes' },
              ]}
            />

            {/* Focus + direction controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[hsl(var(--text-3))]">Focus</span>
              <Select value={focusId ?? ''} onValueChange={v => { setFocusId(v); setSelected(null) }}>
                <SelectTrigger className="w-[280px]" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a node" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {focusCandidates.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  {graph.nodes.filter(n => !focusCandidates.some(c => c.id === n.id)).map(n => (
                    <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex">
                {(['upstream', 'downstream'] as Direction[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className="border px-3 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                    style={direction === d
                      ? { background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--brand))' }
                      : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}
                  >
                    {d === 'upstream' ? 'Upstream lineage' : 'Downstream impact'}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {NODE_TYPES.map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--text-3))]">
                    <span className="h-2.5 w-2.5" style={{ background: colorFor(t) }} /> {humanise(t)}
                  </span>
                ))}
              </div>
            </div>

            {/* Recursive tree — follows the real edges */}
            <div className="mb-4 overflow-auto border border-[hsl(var(--border))] bg-surface p-4" style={{ minHeight: 280 }}>
              {!focus ? (
                <EmptyState title="Select a node" message="Choose a focus node to trace its lineage." />
              ) : subgraphEdges.length === 0 ? (
                <div className="space-y-3">
                  <ProvenanceBranch
                    nodeId={focus.id} nodes={graph.byId} adjacency={graph.adjacency}
                    direction={direction} path={[]} depth={0}
                    onSelect={setSelected} selectedId={selected?.id ?? null}
                  />
                  <p className="text-[11px] text-[hsl(var(--text-4))]">
                    No {direction === 'upstream' ? 'upstream' : 'downstream'} edges are recorded for this node — its lineage is unknown, not empty.
                  </p>
                </div>
              ) : (
                <ProvenanceBranch
                  nodeId={focus.id} nodes={graph.byId} adjacency={graph.adjacency}
                  direction={direction} path={[]} depth={0}
                  onSelect={setSelected} selectedId={selected?.id ?? null}
                />
              )}
            </div>

            {/* Selected node detail + interlinks */}
            {selected && (
              <div className="mb-4 border border-[hsl(var(--border))] bg-surface p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: colorFor(selected.nodeType) }}>{humanise(selected.nodeType)}</p>
                    <p className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="danger" icon={<Trash />} onClick={() => setNodeToDelete(selected)}>Delete node</Button>
                    <button aria-label="Close node detail" onClick={() => setSelected(null)} className="text-[hsl(var(--text-3))]"><X size={16} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Version', value: text(selected.version) },
                    { label: 'Artifact URI', value: text(selected.artifactUri) },
                    { label: 'Artifact digest', value: selected.artifactDigest ? `${selected.artifactDigest.slice(0, 18)}…` : '—' },
                    { label: 'Source repo', value: text(selected.sourceRepo) },
                    { label: 'Commit', value: selected.sourceCommit ? selected.sourceCommit.slice(0, 12) : '—' },
                    { label: 'Builder', value: text(selected.builderIdentity) },
                    { label: 'Built at', value: date(selected.builtAt) },
                    { label: 'SLSA level', value: text(selected.slsaLevel) },
                    { label: 'Predicate', value: text(selected.predicateType) },
                    { label: 'Licence', value: text(selected.licenseSpdx) },
                    { label: 'Verification', value: selected.verificationStatus === 'unverified' ? 'Unverified — no verifier has checked this node' : selected.verificationStatus },
                    { label: 'Verified at', value: date(selected.verifiedAt) },
                  ].map(f => (
                    <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-2.5">
                      <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                      <p className="mt-0.5 truncate text-xs text-[hsl(var(--text-1))]" title={f.value}>{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['model', 'vendor', 'dataset', 'use_case'] as const).map(kind => {
                    const id = kind === 'model' ? selected.modelId
                      : kind === 'vendor' ? selected.vendorId
                      : kind === 'dataset' ? selected.datasetId : selected.useCaseId
                    const to = entities.routeFor(kind, id)
                    const name = entities.resolve(kind, id)
                    if (!id) return null
                    if (!to || !name) return <span key={kind} className="text-[11px] text-[hsl(var(--text-4))]">{humanise(kind)}: Unavailable</span>
                    return <Button key={kind} size="xs" variant="secondary" onClick={() => nav(to)}>{humanise(kind)}: {name}</Button>
                  })}
                  {selected.modelId && (
                    <>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/aibom?model=${selected.modelId}`)}>AIBOM records</Button>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain?model=${selected.modelId}`)}>Attestations</Button>
                      <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain/graph?model=${selected.modelId}`)}>Supply chain graph</Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Node table for the traversed subgraph */}
            <DataTable
              data={nodeRows}
              columns={nodeColumns}
              searchKey="name"
              searchPlaceholder="Search nodes in view…"
              onRowClick={n => setSelected(n)}
              emptyMessage="No nodes in the current traversal."
            />

            {/* Edge table — the lineage facts themselves */}
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">
                Edges in view ({subgraphEdges.length})
              </p>
              {subgraphEdges.length === 0 ? (
                <EmptyState title="No edges in this traversal" message="Record an edge to connect two nodes." />
              ) : (
                <div className="space-y-2">
                  {subgraphEdges.map(e => {
                    const mechanism = transferMechanismLabel(e)
                    return (
                      <div key={e.id} className="flex items-center gap-3 border border-[hsl(var(--border))] bg-surface p-2.5">
                        <span className="text-xs text-[hsl(var(--text-1))]">{graph.byId.get(e.sourceNodeId)?.label ?? 'Unavailable'}</span>
                        <span className="text-[10px] uppercase text-[hsl(var(--text-4))]">— {humanise(e.edgeType)} →</span>
                        <span className="text-xs text-[hsl(var(--text-1))]">{graph.byId.get(e.targetNodeId)?.label ?? 'Unavailable'}</span>
                        {isCrossBorder(e) && (
                          <span
                            className="ml-2 px-2 py-0.5 text-[10px]"
                            style={mechanism
                              ? { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }
                              : { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}
                          >
                            {e.sourceJurisdiction} → {e.targetJurisdiction} · {mechanism ?? 'no transfer mechanism recorded'}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-[hsl(var(--text-4))]">
                          {e.validFrom || e.validTo ? `${date(e.validFrom)} → ${e.validTo ? date(e.validTo) : 'open'}` : 'validity not recorded'}
                        </span>
                        <button aria-label="Remove edge" onClick={() => setEdgeToDelete(e)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]">
                          <Trash size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

      {/* ── Add node ── */}
      <FormDialog
        open={nodeFormOpen}
        onOpenChange={setNodeFormOpen}
        title="Add provenance node"
        description="Link the node to the governed entity it represents so the graph stays on one id-space. Verification status is set by a verifier, never here."
        submitLabel="Add node"
        busy={createNode.isPending}
        onSubmit={submitNode}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required>
            <Select value={nodeForm.nodeType} onValueChange={v => setNodeForm(p => ({ ...p, nodeType: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {NODE_TYPES.map(t => <SelectItem key={t} value={t}>{humanise(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Label" required>
            <input value={nodeForm.label} onChange={e => setNodeForm(p => ({ ...p, label: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model" hint="ai_models.id">
            <Select value={nodeForm.modelId} onValueChange={v => setNodeForm(p => ({ ...p, modelId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vendor" hint="vendors.id">
            <Select value={nodeForm.vendorId} onValueChange={v => setNodeForm(p => ({ ...p, vendorId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dataset" hint="datasets.id">
            <Select value={nodeForm.datasetId} onValueChange={v => setNodeForm(p => ({ ...p, datasetId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.datasets.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Use case" hint="use_cases.id">
            <Select value={nodeForm.useCaseId} onValueChange={v => setNodeForm(p => ({ ...p, useCaseId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.useCases.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Version">
            <input value={nodeForm.version} onChange={e => setNodeForm(p => ({ ...p, version: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="SLSA build level">
            <input value={nodeForm.slsaLevel} onChange={e => setNodeForm(p => ({ ...p, slsaLevel: e.target.value }))} placeholder="e.g. L2"
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <Field label="Artifact URI" hint="Immutable OCI/artifact reference">
          <input value={nodeForm.artifactUri} onChange={e => setNodeForm(p => ({ ...p, artifactUri: e.target.value }))}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source repository">
            <input value={nodeForm.sourceRepo} onChange={e => setNodeForm(p => ({ ...p, sourceRepo: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Source commit">
            <input value={nodeForm.sourceCommit} onChange={e => setNodeForm(p => ({ ...p, sourceCommit: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
      </FormDialog>

      {/* ── Add edge ── */}
      <FormDialog
        open={edgeFormOpen}
        onOpenChange={setEdgeFormOpen}
        title="Record lineage edge"
        description="Edges point from upstream to downstream. Jurisdictions and the transfer mechanism are recorded as facts — Sentinel does not infer a legal conclusion from them."
        submitLabel="Record edge"
        busy={createEdge.isPending}
        onSubmit={submitEdge}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source (upstream)" required>
            <Select value={edgeForm.sourceNodeId} onValueChange={v => setEdgeForm(p => ({ ...p, sourceNodeId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select a node" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {graph.nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Target (downstream)" required>
            <Select value={edgeForm.targetNodeId} onValueChange={v => setEdgeForm(p => ({ ...p, targetNodeId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select a node" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {graph.nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Edge type" required>
          <Select value={edgeForm.edgeType} onValueChange={v => setEdgeForm(p => ({ ...p, edgeType: v }))}>
            <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {EDGE_TYPES.map(t => <SelectItem key={t} value={t}>{humanise(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Source jurisdiction">
            <input value={edgeForm.sourceJurisdiction} onChange={e => setEdgeForm(p => ({ ...p, sourceJurisdiction: e.target.value }))} placeholder="e.g. IE"
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Target jurisdiction">
            <input value={edgeForm.targetJurisdiction} onChange={e => setEdgeForm(p => ({ ...p, targetJurisdiction: e.target.value }))} placeholder="e.g. US"
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Transfer mechanism" hint="SCC | BCR | adequacy | derogation">
            <input value={edgeForm.transferMechanism} onChange={e => setEdgeForm(p => ({ ...p, transferMechanism: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valid from">
            <input type="date" value={edgeForm.validFrom} onChange={e => setEdgeForm(p => ({ ...p, validFrom: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Valid to">
            <input type="date" value={edgeForm.validTo} onChange={e => setEdgeForm(p => ({ ...p, validTo: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <Field label="Legal basis">
          <input value={edgeForm.legalBasis} onChange={e => setEdgeForm(p => ({ ...p, legalBasis: e.target.value }))}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!nodeToDelete}
        onOpenChange={o => !o && setNodeToDelete(null)}
        onConfirm={confirmDeleteNode}
        title="Delete provenance node?"
        description={`Deleting “${nodeToDelete?.label ?? 'this node'}” also removes every edge attached to it. This cannot be undone.`}
        isDestructive
        confirmLabel="Delete node"
      />

      <ConfirmDialog
        open={!!edgeToDelete}
        onOpenChange={o => !o && setEdgeToDelete(null)}
        onConfirm={confirmDeleteEdge}
        title="Remove lineage edge?"
        description="The two nodes stay in the register; only the recorded relationship between them is removed."
        isDestructive
        confirmLabel="Remove edge"
      />
    </div>
  )
}
