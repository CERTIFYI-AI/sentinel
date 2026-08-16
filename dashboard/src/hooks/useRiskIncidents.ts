// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the Risk & Incidents group, on the platform contract:
// reads surface real loading/error, mutations invalidate and surface real
// success/error via sonner (writes throw in the services, so onError is
// reachable — no fake success).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as ir from '../services/incidentResponseService'
import * as ov from '../services/oversightService'
import * as rg from '../services/riskGroupService'

function crud<T extends { id?: string }>(
  key: string,
  fetchFn: () => Promise<T[]>,
  saveFn: (r: any) => Promise<T>,
  deleteFn: (id: string) => Promise<void>,
  label: string,
) {
  return function useResource() {
    const qc = useQueryClient()
    const { data: items = [], isLoading, error } = useQuery({ queryKey: [key], queryFn: fetchFn, staleTime: 30_000 })
    const save = useMutation({
      mutationFn: (r: T) => saveFn(r),
      onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); toast.success(`${label} saved`) },
      onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : `Failed to save ${label.toLowerCase()}`),
    })
    const remove = useMutation({
      mutationFn: (id: string) => deleteFn(id),
      onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); toast.success(`${label} deleted`) },
      onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : `Failed to delete ${label.toLowerCase()}`),
    })
    return {
      items, isLoading, error,
      save: save.mutateAsync, remove: remove.mutateAsync,
      isSaving: save.isPending, isDeleting: remove.isPending,
    }
  }
}

// Incident-response cluster
export const useIncidents    = crud('ri-incidents', ir.fetchIncidents, ir.saveIncident, ir.deleteIncident, 'Incident')
export const usePlaybooks    = crud('ri-playbooks', ir.fetchPlaybooks, ir.savePlaybook, ir.deletePlaybook, 'Playbook')
export const useTabletops    = crud('ri-tabletops', ir.fetchTabletops, ir.saveTabletop, ir.deleteTabletop, 'Exercise')
export const useRemediations = crud('ri-remediations', ir.fetchRemediations, ir.saveRemediation, ir.deleteRemediation, 'Plan')
export const useExceptions   = crud('ri-exceptions', ir.fetchExceptions, ir.saveException, ir.deleteException, 'Exception')

// Risk cluster
export const useFinancialRisks    = crud('ri-financial', rg.fetchFinancialRisks, rg.saveFinancialRisk, rg.deleteFinancialRisk, 'Quantification')
export const useRegulationEntries = crud('ri-regulations', rg.fetchRegulationEntries, rg.saveRegulationEntry, rg.deleteRegulationEntry, 'Regulation')

// Oversight cluster
export const useApprovalWorkflows = crud('ri-approval-workflows', ov.fetchApprovalWorkflows, ov.saveApprovalWorkflow, ov.deleteApprovalWorkflow, 'Workflow')
export const useAutomationRules   = crud('ri-automation-rules', ov.fetchAutomationRules, ov.saveAutomationRule, ov.deleteAutomationRule, 'Rule')

// Incident workflow — status transitions persist a step record.
export function useIncidentTransitions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { incident: ir.IncidentRecord; toStatus: string; actor?: string; notes?: string }) =>
      ir.transitionIncident(v.incident, v.toStatus, v.actor, v.notes),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['ri-incidents'] })
      qc.invalidateQueries({ queryKey: ['ri-workflow-steps'] })
      toast.success(`Incident moved to ${v.toStatus.replace(/_/g, ' ')}`)
    },
    onError: (e: any) => toast.error(e?.message ?? 'Status change failed'),
  })
}
export function useWorkflowSteps(incidentId?: string) {
  return useQuery({
    queryKey: ['ri-workflow-steps', incidentId ?? 'all'],
    queryFn: () => ir.fetchWorkflowSteps(incidentId),
    staleTime: 15_000,
  })
}

// Playbook runs — activations against real incidents.
export function usePlaybookRuns() {
  const qc = useQueryClient()
  const { data: runs = [], isLoading, error } = useQuery({
    queryKey: ['ri-playbook-runs'], queryFn: ir.fetchPlaybookRuns, staleTime: 15_000,
  })
  const save = useMutation({
    mutationFn: (r: ir.PlaybookRunRecord) => ir.savePlaybookRun(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ri-playbook-runs'] }) },
    onError: (e: any) => toast.error(e?.message ?? 'Playbook run update failed'),
  })
  return { runs, isLoading, error, saveRun: save.mutateAsync, isSaving: save.isPending }
}

// HITL — one queue shared with the agent mesh; decisions are audited.
export function useHitlReviews() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['ri-hitl'], queryFn: ov.fetchHitlReviews, staleTime: 15_000,
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['ri-hitl'] })
  const save = useMutation({
    mutationFn: (r: ov.HitlRecord) => ov.saveHitlReview(r),
    onSuccess: () => { inv(); toast.success('Review saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save review'),
  })
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: 'approved' | 'rejected' | 'info_requested'; decidedBy: string; remarks?: string }) =>
      ov.decideHitlReview(v.id, v.decision, v.decidedBy, v.remarks),
    onSuccess: (_d, v) => {
      inv()
      toast.success(v.decision === 'approved' ? 'Review approved' : v.decision === 'rejected' ? 'Review rejected' : 'More information requested')
    },
    onError: (e: any) => toast.error(e?.message ?? 'Decision did not persist'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => ov.deleteHitlReview(id),
    onSuccess: () => { inv(); toast.success('Review deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete review'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, decide: decide.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending, isDeciding: decide.isPending,
  }
}
export function useHitlReview(id?: string) {
  return useQuery({
    queryKey: ['ri-hitl', id],
    queryFn: () => (id ? ov.fetchHitlReview(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

// Approvals — entity-linked requests with audited decisions.
export function useApprovals() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['ri-approvals'], queryFn: ov.fetchApprovals, staleTime: 15_000,
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['ri-approvals'] })
  const save = useMutation({
    mutationFn: (r: ov.ApprovalRecord) => ov.saveApproval(r),
    onSuccess: () => { inv(); toast.success('Approval request created') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create request'),
  })
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: 'approved' | 'rejected'; approver: string }) =>
      ov.decideApproval(v.id, v.decision, v.approver),
    onSuccess: (_d, v) => { inv(); toast.success(v.decision === 'approved' ? 'Approved' : 'Rejected') },
    onError: (e: any) => toast.error(e?.message ?? 'Decision did not persist'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => ov.deleteApproval(id),
    onSuccess: () => { inv(); toast.success('Request deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete request'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, decide: decide.mutateAsync, remove: remove.mutateAsync,
    isDeciding: decide.isPending,
  }
}

// Automation runs + honest validation.
export function useAutomationRuns(ruleId?: string) {
  return useQuery({
    queryKey: ['ri-automation-runs', ruleId ?? 'all'],
    queryFn: () => ov.fetchAutomationRuns(ruleId),
    staleTime: 15_000,
  })
}
export function useValidateAutomationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rule: ov.AutomationRuleRecord) => ov.validateAutomationRule(rule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ri-automation-runs'] })
      toast.success('Configuration validated — recorded in run history (nothing executed)')
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['ri-automation-runs'] })
      toast.error(e?.message ?? 'Validation failed')
    },
  })
}
