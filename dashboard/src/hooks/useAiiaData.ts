// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the Impact & Risk (AIIA) modules. Reads are cached and
// shared; mutations invalidate the relevant query so the UI reflects the real
// backend. Mutations surface errors (services throw) — callers show a real
// error toast instead of a false success.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModels } from '@/services/modelService'
import {
  fetchImpactAssessments, upsertImpactAssessment, deleteImpactAssessment, type ImpactAssessment,
} from '@/services/impactAssessmentService'
import {
  fetchUseCases, fetchUseCase, createUseCase, updateUseCase, softDeleteUseCase, type UseCase,
} from '@/services/useCaseService'
import {
  fetchRiskClassifications, upsertRiskClassification, deleteRiskClassification, type RiskClassification,
} from '@/services/riskTieringService'
import {
  fetchMeetings, fetchAgendaItems, fetchVotes, createMeeting, createAgendaItem,
  setAgendaDecision, castVote, fetchCommitteeMembers, addCommitteeMember, removeCommitteeMember,
  type MrcMeeting, type MrcAgendaItem, type MrcVote, type MrcMember, type Decision,
} from '@/services/mrcService'

// Shared: model registry options for interlink dropdowns across all modules.
export interface ModelOption { id: string; name: string; riskTier?: string; lifecycle?: string; euCategory?: string }
export function useModelOptions() {
  const q = useQuery({
    queryKey: ['model-options'],
    queryFn: async (): Promise<ModelOption[]> => {
      const models = await fetchAllModels()
      return models.map(m => ({ id: m.id, name: m.name, riskTier: m.risk_tier, lifecycle: m.lifecycle_stage, euCategory: (m as any).eu_ai_act_category }))
    },
    staleTime: 60_000,
  })
  return { models: q.data ?? [], loading: q.isLoading }
}

// ── Impact Assessments ──────────────────────────────────────────────────────
export function useImpactAssessments() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['impact-assessments'], queryFn: fetchImpactAssessments, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['impact-assessments'] })
  const save = useMutation({ mutationFn: (a: Partial<ImpactAssessment>) => upsertImpactAssessment(a), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => deleteImpactAssessment(id), onSuccess: inv })
  return { data: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null, save, remove }
}

// ── Use Cases ───────────────────────────────────────────────────────────────
export function useUseCases() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['use-cases'], queryFn: fetchUseCases, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['use-cases'] })
  const create = useMutation({ mutationFn: (u: Partial<UseCase>) => createUseCase(u), onSuccess: inv })
  const update = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<UseCase> }) => updateUseCase(id, patch), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteUseCase(id), onSuccess: inv })
  return { data: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null, create, update, remove }
}
export function useUseCase(id: string | undefined) {
  const q = useQuery({ queryKey: ['use-case', id], queryFn: () => fetchUseCase(id!), enabled: !!id })
  return { data: q.data ?? null, isLoading: q.isLoading, error: q.error as Error | null }
}

// ── Risk Classification ─────────────────────────────────────────────────────
export function useRiskClassifications() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['risk-tiering'], queryFn: fetchRiskClassifications, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['risk-tiering'] })
  const save = useMutation({ mutationFn: (c: Partial<RiskClassification>) => upsertRiskClassification(c), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => deleteRiskClassification(id), onSuccess: inv })
  return { data: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null, save, remove }
}

// ── Reverse interlink: a model's governance footprint ───────────────────────
// Powers the "Governance" cross-link card on the Model Detail page so the
// platform links both ways (model registry <-> AIIA modules).
export function useModelGovernance(modelId: string | undefined) {
  const impact = useQuery({
    queryKey: ['gov-impact', modelId],
    queryFn: async () => (await fetchImpactAssessments()).filter(a => a.modelId === modelId),
    enabled: !!modelId, staleTime: 30_000,
  })
  const tiering = useQuery({
    queryKey: ['gov-tier', modelId],
    queryFn: async () => (await fetchRiskClassifications()).filter(c => c.modelId === modelId || c.systemId === modelId),
    enabled: !!modelId, staleTime: 30_000,
  })
  const reviews = useQuery({
    queryKey: ['gov-mrc', modelId],
    queryFn: async () => (await fetchAgendaItems()).filter(i => i.modelId === modelId),
    enabled: !!modelId, staleTime: 30_000,
  })
  return {
    impactAssessments: impact.data ?? [],
    riskClassification: (tiering.data ?? [])[0] ?? null,
    mrcReviews: reviews.data ?? [],
    loading: impact.isLoading || tiering.isLoading || reviews.isLoading,
  }
}

// ── Model Risk Committee ────────────────────────────────────────────────────
export function useMrc() {
  const qc = useQueryClient()
  const meetings = useQuery({ queryKey: ['mrc-meetings'], queryFn: fetchMeetings, staleTime: 20_000 })
  const agenda = useQuery({ queryKey: ['mrc-agenda'], queryFn: fetchAgendaItems, staleTime: 20_000 })
  const votes = useQuery({ queryKey: ['mrc-votes'], queryFn: fetchVotes, staleTime: 20_000 })
  const members = useQuery({ queryKey: ['mrc-members'], queryFn: fetchCommitteeMembers, staleTime: 20_000 })
  const invAll = () => {
    qc.invalidateQueries({ queryKey: ['mrc-meetings'] })
    qc.invalidateQueries({ queryKey: ['mrc-agenda'] })
    qc.invalidateQueries({ queryKey: ['mrc-votes'] })
  }
  const invMembers = () => qc.invalidateQueries({ queryKey: ['mrc-members'] })
  const vote = useMutation({ mutationFn: (v: Partial<MrcVote>) => castVote(v), onSuccess: invAll })
  const addMeeting = useMutation({ mutationFn: (m: Partial<MrcMeeting>) => createMeeting(m), onSuccess: invAll })
  const addAgenda = useMutation({ mutationFn: (a: Partial<MrcAgendaItem>) => createAgendaItem(a), onSuccess: invAll })
  const decide = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: Decision }) => setAgendaDecision(id, decision), onSuccess: invAll })
  const addMember = useMutation({ mutationFn: (m: Partial<MrcMember>) => addCommitteeMember(m), onSuccess: invMembers })
  const removeMember = useMutation({ mutationFn: (id: string) => removeCommitteeMember(id), onSuccess: invMembers })
  return {
    meetings: meetings.data ?? [], agenda: agenda.data ?? [], votes: votes.data ?? [], members: members.data ?? [],
    isLoading: meetings.isLoading || agenda.isLoading || votes.isLoading,
    membersLoading: members.isLoading,
    error: (meetings.error || agenda.error || votes.error) as Error | null,
    vote, addMeeting, addAgenda, decide, addMember, removeMember,
  }
}
