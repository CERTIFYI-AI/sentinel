// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// agentWorkflowService — org-scoped CRUD for public.agent_workflows.
// Platform contract (see CLAUDE.md): the client never sends org_id (DB default
// fills it under RLS), writes THROW on failure so the UI can never report a
// false success. The `agents` jsonb stores canonical agent_gov_registry ids
// ({ orchestratorId, workerIds }) plus display names resolved at write time;
// the UI re-resolves names from the registry at render time.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface WorkflowAgents {
  orchestratorId: string | null
  workerIds: string[]
  /** Display names captured at write time — render-time resolution from the registry wins. */
  orchestratorName?: string
  workerNames?: string[]
}

export interface WorkflowStep {
  name: string
}

export interface WorkflowTriggers {
  type: string
}

export interface AgentWorkflow {
  id: string
  name: string
  description: string | null
  status: string | null
  agents: WorkflowAgents
  steps: WorkflowStep[]
  triggers: WorkflowTriggers | null
  owner: string | null
  lastRunAt: string | null
  lastRunStatus: string | null
  runCount: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** Fields a caller may set when creating or updating a workflow. */
export type AgentWorkflowInput = Partial<Omit<AgentWorkflow, 'id' | 'createdAt' | 'updatedAt'>>

interface AgentWorkflowRow {
  id: string
  name: string
  description: string | null
  status: string | null
  agents: unknown
  steps: unknown
  triggers: unknown
  owner: string | null
  last_run_at: string | null
  last_run_status: string | null
  run_count: number | null
  metadata: unknown
  created_at: string
  updated_at: string
}

function fromRow(r: AgentWorkflowRow): AgentWorkflow {
  const agents = (r.agents && typeof r.agents === 'object' && !Array.isArray(r.agents)
    ? r.agents
    : {}) as Partial<WorkflowAgents>
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    agents: {
      orchestratorId: agents.orchestratorId ?? null,
      workerIds: Array.isArray(agents.workerIds) ? agents.workerIds : [],
      orchestratorName: agents.orchestratorName,
      workerNames: agents.workerNames,
    },
    steps: Array.isArray(r.steps) ? (r.steps as WorkflowStep[]).filter((s) => s && typeof s.name === 'string') : [],
    triggers: (r.triggers && typeof r.triggers === 'object' && !Array.isArray(r.triggers)
      ? (r.triggers as WorkflowTriggers)
      : null),
    owner: r.owner,
    lastRunAt: r.last_run_at,
    lastRunStatus: r.last_run_status,
    runCount: r.run_count ?? 0,
    metadata: (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** camelCase → snake_case, only for fields the caller actually set. */
function toRow(input: AgentWorkflowInput): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.description !== undefined) row.description = input.description
  if (input.status !== undefined) row.status = input.status
  if (input.agents !== undefined) row.agents = input.agents
  if (input.steps !== undefined) row.steps = input.steps
  if (input.triggers !== undefined) row.triggers = input.triggers
  if (input.owner !== undefined) row.owner = input.owner
  if (input.lastRunAt !== undefined) row.last_run_at = input.lastRunAt
  if (input.lastRunStatus !== undefined) row.last_run_status = input.lastRunStatus
  if (input.runCount !== undefined) row.run_count = input.runCount
  if (input.metadata !== undefined) row.metadata = input.metadata
  return row
}

export async function fetchWorkflows(): Promise<AgentWorkflow[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('agent_workflows')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) { console.warn('[agentWorkflowService] fetch:', error.message); throw new Error(error.message) }
  return ((data ?? []) as AgentWorkflowRow[]).map(fromRow)
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success. org_id is filled by the DB default.
export async function createWorkflow(input: AgentWorkflowInput & { name: string }): Promise<AgentWorkflow> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create workflow.')
  const { data, error } = await supabase
    .from('agent_workflows')
    .insert(toRow(input))
    .select()
    .single()
  if (error) { console.warn('[agentWorkflowService] create:', error.message); throw new Error(error.message) }
  return fromRow(data as AgentWorkflowRow)
}

export async function updateWorkflow(id: string, patch: AgentWorkflowInput): Promise<AgentWorkflow> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update workflow.')
  const { data, error } = await supabase
    .from('agent_workflows')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.warn('[agentWorkflowService] update:', error.message); throw new Error(error.message) }
  return fromRow(data as AgentWorkflowRow)
}
