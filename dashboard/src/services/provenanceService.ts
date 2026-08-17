// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// provenanceService — the AI supply-chain provenance DAG, on the real
// org-scoped tables `provenance_nodes` and `provenance_edges`
// (supabase/migrations/20260822000002_supply_chain_esg_canonical.sql).
//
// Replaces two in-file literals keyed by the business code 'MDL-001'. Nodes
// join the one id-space via model_id / vendor_id / dataset_id / use_case_id;
// edges are typed and carry the temporal + cross-border transfer facts that
// make "what fed this model on the date of the incident" answerable.
//
// INTEGRITY HONESTY CONTRACT: `verificationStatus` on a node is only ever
// written by a real verifier — no write path in this file sets it, so it stays
// at the DB default 'unverified'. The UI must render that value, never a
// literal `verified: true`.
//
// org_id is never sent from the client (DB default `current_user_org_id()`).
// Writes throw on failure; every state change writes an Art. 12 audit entry.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'provenance'

export type ProvenanceNodeType =
  | 'model' | 'dataset' | 'component' | 'vendor' | 'data_source' | 'pipeline' | 'output'

export type ProvenanceEdgeType =
  | 'derived_from' | 'trained_on' | 'built_by' | 'deployed_as' | 'feeds' | 'uses' | 'produces'

export interface ProvenanceNode {
  id: string
  nodeType: string
  label: string
  modelId: string | null
  vendorId: string | null
  datasetId: string | null
  useCaseId: string | null
  version: string | null
  artifactUri: string | null
  artifactDigest: string | null
  sourceRepo: string | null
  sourceCommit: string | null
  buildId: string | null
  builderIdentity: string | null
  builtAt: string | null
  slsaLevel: string | null
  predicateType: string | null
  /** 'unverified' | 'verified' | 'failed' — verifier-owned, never asserted here. */
  verificationStatus: string
  verifiedAt: string | null
  verifiedBy: string | null
  verificationMethod: string | null
  licenseSpdx: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProvenanceEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  edgeType: string
  sourceJurisdiction: string | null
  targetJurisdiction: string | null
  transferMechanism: string | null
  legalBasis: string | null
  piiCategories: string[]
  retentionPeriod: string | null
  validFrom: string | null
  validTo: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {})
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

function rowToNode(r: Record<string, any>): ProvenanceNode {
  return {
    id: r.id,
    nodeType: r.node_type ?? 'component',
    label: r.label ?? '',
    modelId: r.model_id ?? null,
    vendorId: r.vendor_id ?? null,
    datasetId: r.dataset_id ?? null,
    useCaseId: r.use_case_id ?? null,
    version: r.version ?? null,
    artifactUri: r.artifact_uri ?? null,
    artifactDigest: r.artifact_digest ?? null,
    sourceRepo: r.source_repo ?? null,
    sourceCommit: r.source_commit ?? null,
    buildId: r.build_id ?? null,
    builderIdentity: r.builder_identity ?? null,
    builtAt: r.built_at ?? null,
    slsaLevel: r.slsa_level ?? null,
    predicateType: r.predicate_type ?? null,
    verificationStatus: r.verification_status ?? 'unverified',
    verifiedAt: r.verified_at ?? null,
    verifiedBy: r.verified_by ?? null,
    verificationMethod: r.verification_method ?? null,
    licenseSpdx: r.license_spdx ?? null,
    metadata: obj(r.metadata),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** Verification columns are deliberately unmapped — see the contract above. */
function nodeToRow(n: Partial<ProvenanceNode>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('node_type', n.nodeType)
  set('label', n.label)
  set('model_id', n.modelId)
  set('vendor_id', n.vendorId)
  set('dataset_id', n.datasetId)
  set('use_case_id', n.useCaseId)
  set('version', n.version)
  set('artifact_uri', n.artifactUri)
  set('artifact_digest', n.artifactDigest)
  set('source_repo', n.sourceRepo)
  set('source_commit', n.sourceCommit)
  set('build_id', n.buildId)
  set('builder_identity', n.builderIdentity)
  set('built_at', n.builtAt)
  set('slsa_level', n.slsaLevel)
  set('predicate_type', n.predicateType)
  set('license_spdx', n.licenseSpdx)
  set('metadata', n.metadata)
  return row
}

function rowToEdge(r: Record<string, any>): ProvenanceEdge {
  return {
    id: r.id,
    sourceNodeId: r.source_node_id,
    targetNodeId: r.target_node_id,
    edgeType: r.edge_type ?? 'feeds',
    sourceJurisdiction: r.source_jurisdiction ?? null,
    targetJurisdiction: r.target_jurisdiction ?? null,
    transferMechanism: r.transfer_mechanism ?? null,
    legalBasis: r.legal_basis ?? null,
    piiCategories: arr(r.pii_categories),
    retentionPeriod: r.retention_period ?? null,
    validFrom: r.valid_from ?? null,
    validTo: r.valid_to ?? null,
    metadata: obj(r.metadata),
    createdAt: r.created_at,
  }
}

function edgeToRow(e: Partial<ProvenanceEdge>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('source_node_id', e.sourceNodeId)
  set('target_node_id', e.targetNodeId)
  set('edge_type', e.edgeType)
  set('source_jurisdiction', e.sourceJurisdiction)
  set('target_jurisdiction', e.targetJurisdiction)
  set('transfer_mechanism', e.transferMechanism)
  set('legal_basis', e.legalBasis)
  set('pii_categories', e.piiCategories)
  set('retention_period', e.retentionPeriod)
  set('valid_from', e.validFrom)
  set('valid_to', e.validTo)
  set('metadata', e.metadata)
  return row
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function fetchProvenanceNodes(filters: { modelId?: string } = {}): Promise<ProvenanceNode[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('provenance_nodes').select('*').order('created_at', { ascending: true })
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  const { data, error } = await q
  if (error) { console.warn('[provenanceService] fetchNodes:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToNode)
}

export async function fetchProvenanceEdges(): Promise<ProvenanceEdge[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('provenance_edges').select('*').order('created_at', { ascending: true })
  if (error) { console.warn('[provenanceService] fetchEdges:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToEdge)
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function createProvenanceNode(node: Partial<ProvenanceNode>): Promise<ProvenanceNode> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create provenance node.')
  if (!node.label) throw new Error('A node label is required.')
  if (!node.nodeType) throw new Error('A node type is required.')
  const row = nodeToRow(node)
  const { data, error } = await supabase.from('provenance_nodes').insert(row).select().single()
  if (error) { console.warn('[provenanceService] createNode:', error.message); throw new Error(error.message) }
  const saved = rowToNode(data)
  void logAction({
    module: MODULE, entityType: 'provenance_node', entityId: saved.id,
    entityName: saved.label, action: 'create', newValues: row,
  })
  return saved
}

export async function updateProvenanceNode(id: string, patch: Partial<ProvenanceNode>): Promise<ProvenanceNode> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update provenance node.')
  const row = nodeToRow(patch)
  row.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('provenance_nodes').update(row).eq('id', id).select().single()
  if (error) { console.warn('[provenanceService] updateNode:', error.message); throw new Error(error.message) }
  const saved = rowToNode(data)
  void logAction({
    module: MODULE, entityType: 'provenance_node', entityId: id,
    entityName: saved.label, action: 'update', newValues: row,
  })
  return saved
}

export async function deleteProvenanceNode(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete provenance node.')
  const { error } = await supabase.from('provenance_nodes').delete().eq('id', id)
  if (error) { console.warn('[provenanceService] deleteNode:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'provenance_node', entityId: id, action: 'delete' })
}

export async function createProvenanceEdge(edge: Partial<ProvenanceEdge>): Promise<ProvenanceEdge> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create provenance edge.')
  if (!edge.sourceNodeId || !edge.targetNodeId) throw new Error('Both a source and a target node are required.')
  if (edge.sourceNodeId === edge.targetNodeId) throw new Error('An edge cannot point at its own source node.')
  if (!edge.edgeType) throw new Error('An edge type is required.')
  const row = edgeToRow(edge)
  const { data, error } = await supabase.from('provenance_edges').insert(row).select().single()
  if (error) { console.warn('[provenanceService] createEdge:', error.message); throw new Error(error.message) }
  const saved = rowToEdge(data)
  void logAction({
    module: MODULE, entityType: 'provenance_edge', entityId: saved.id,
    entityName: `${saved.sourceNodeId} → ${saved.targetNodeId}`, action: 'create', newValues: row,
  })
  return saved
}

export async function deleteProvenanceEdge(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete provenance edge.')
  const { error } = await supabase.from('provenance_edges').delete().eq('id', id)
  if (error) { console.warn('[provenanceService] deleteEdge:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'provenance_edge', entityId: id, action: 'delete' })
}

// ── Pure graph helpers (used by the renderers; no I/O, unit-testable) ───────

export interface Adjacency {
  /** node id → outgoing edges */
  out: Map<string, ProvenanceEdge[]>
  /** node id → incoming edges */
  in: Map<string, ProvenanceEdge[]>
}

export function buildAdjacency(edges: ProvenanceEdge[]): Adjacency {
  const out = new Map<string, ProvenanceEdge[]>()
  const inn = new Map<string, ProvenanceEdge[]>()
  for (const e of edges) {
    if (!out.has(e.sourceNodeId)) out.set(e.sourceNodeId, [])
    out.get(e.sourceNodeId)!.push(e)
    if (!inn.has(e.targetNodeId)) inn.set(e.targetNodeId, [])
    inn.get(e.targetNodeId)!.push(e)
  }
  return { out, in: inn }
}

/** Nodes with no incoming edge — the natural roots of the DAG. */
export function rootNodeIds(nodes: ProvenanceNode[], adj: Adjacency): string[] {
  return nodes.filter(n => !(adj.in.get(n.id)?.length)).map(n => n.id)
}

/**
 * Every node reachable downstream of `startId`, inclusive. BFS with a visited
 * set, so a cycle in the data terminates instead of hanging the renderer.
 */
export function descendantIds(startId: string, adj: Adjacency): Set<string> {
  const seen = new Set<string>()
  const queue = [startId]
  while (queue.length) {
    const current = queue.shift()!
    if (seen.has(current)) continue
    seen.add(current)
    for (const e of adj.out.get(current) ?? []) queue.push(e.targetNodeId)
  }
  return seen
}

/** Every node reachable upstream of `startId`, inclusive (same cycle guard). */
export function ancestorIds(startId: string, adj: Adjacency): Set<string> {
  const seen = new Set<string>()
  const queue = [startId]
  while (queue.length) {
    const current = queue.shift()!
    if (seen.has(current)) continue
    seen.add(current)
    for (const e of adj.in.get(current) ?? []) queue.push(e.sourceNodeId)
  }
  return seen
}

/**
 * Longest-path layering: rank(n) = 0 for a root, else 1 + max(rank(parents)).
 * Cycle-safe — a node already on the recursion stack contributes rank 0 rather
 * than recursing forever. Used to compute a real layout instead of hardcoded
 * x/y literals.
 */
export function computeRanks(nodes: ProvenanceNode[], adj: Adjacency): Map<string, number> {
  const rank = new Map<string, number>()
  const stack = new Set<string>()

  const visit = (id: string): number => {
    const cached = rank.get(id)
    if (cached !== undefined) return cached
    if (stack.has(id)) return 0            // cycle guard
    stack.add(id)
    const parents = adj.in.get(id) ?? []
    const r = parents.length ? Math.max(...parents.map(e => visit(e.sourceNodeId) + 1)) : 0
    stack.delete(id)
    rank.set(id, r)
    return r
  }

  for (const n of nodes) visit(n.id)
  return rank
}

/**
 * An edge crosses a border when both jurisdictions are recorded and differ.
 * Anything less is "not recorded" — never inferred, and never turned into a
 * legal conclusion such as "SCCs required".
 */
export function isCrossBorder(edge: ProvenanceEdge): boolean {
  return !!edge.sourceJurisdiction && !!edge.targetJurisdiction
    && edge.sourceJurisdiction.trim().toUpperCase() !== edge.targetJurisdiction.trim().toUpperCase()
}

/** The transfer mechanism recorded on a cross-border edge, or null if none is. */
export function transferMechanismLabel(edge: ProvenanceEdge): string | null {
  if (!isCrossBorder(edge)) return null
  const m = (edge.transferMechanism ?? '').trim()
  if (!m || m.toLowerCase() === 'none') return null
  return m
}
