// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the provenance DAG (provenance_nodes /
// provenance_edges). The graph is returned with its adjacency index and
// longest-path ranks already computed, so both the Provenance Graph tree and
// the Supply Chain Graph canvas follow the REAL edges instead of re-deriving
// (or discarding) them.

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProvenanceNodes, fetchProvenanceEdges,
  createProvenanceNode, updateProvenanceNode, deleteProvenanceNode,
  createProvenanceEdge, deleteProvenanceEdge,
  buildAdjacency, computeRanks, rootNodeIds,
  type ProvenanceNode, type ProvenanceEdge, type Adjacency,
} from '@/services/provenanceService'

const NODES = ['provenance-nodes']
const EDGES = ['provenance-edges']

export interface ProvenanceGraphData {
  nodes: ProvenanceNode[]
  edges: ProvenanceEdge[]
  byId: Map<string, ProvenanceNode>
  adjacency: Adjacency
  /** Longest-path layer index per node — drives the computed layout. */
  ranks: Map<string, number>
  /** Nodes with no incoming edge. */
  roots: string[]
}

export function useProvenanceGraph() {
  const qc = useQueryClient()

  const nodesQuery = useQuery({ queryKey: NODES, queryFn: () => fetchProvenanceNodes(), staleTime: 20_000 })
  const edgesQuery = useQuery({ queryKey: EDGES, queryFn: fetchProvenanceEdges, staleTime: 20_000 })

  const graph: ProvenanceGraphData = useMemo(() => {
    const nodes = nodesQuery.data ?? []
    const edges = edgesQuery.data ?? []
    // Drop edges whose endpoints are not in the visible node set — an edge to a
    // node RLS hid must not render as a dangling arrow.
    const ids = new Set(nodes.map(n => n.id))
    const liveEdges = edges.filter(e => ids.has(e.sourceNodeId) && ids.has(e.targetNodeId))
    const adjacency = buildAdjacency(liveEdges)
    return {
      nodes,
      edges: liveEdges,
      byId: new Map(nodes.map(n => [n.id, n])),
      adjacency,
      ranks: computeRanks(nodes, adjacency),
      roots: rootNodeIds(nodes, adjacency),
    }
  }, [nodesQuery.data, edgesQuery.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: NODES })
    qc.invalidateQueries({ queryKey: EDGES })
  }

  const createNode = useMutation({
    mutationFn: (node: Partial<ProvenanceNode>) => createProvenanceNode(node),
    onSuccess: invalidate,
  })
  const updateNode = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ProvenanceNode> }) => updateProvenanceNode(id, patch),
    onSuccess: invalidate,
  })
  const removeNode = useMutation({
    mutationFn: (id: string) => deleteProvenanceNode(id),
    onSuccess: invalidate,
  })
  const createEdge = useMutation({
    mutationFn: (edge: Partial<ProvenanceEdge>) => createProvenanceEdge(edge),
    onSuccess: invalidate,
  })
  const removeEdge = useMutation({
    mutationFn: (id: string) => deleteProvenanceEdge(id),
    onSuccess: invalidate,
  })

  return {
    graph,
    isLoading: nodesQuery.isLoading || edgesQuery.isLoading,
    error: (nodesQuery.error ?? edgesQuery.error) as Error | null,
    refetch: () => { void nodesQuery.refetch(); void edgesQuery.refetch() },
    createNode, updateNode, removeNode, createEdge, removeEdge,
  }
}
