// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the Compliance & Regulatory group, on the platform
// contract: reads surface real loading/error, mutations invalidate and
// surface real success/error via sonner (writes throw in the services, so
// onError is reachable — no fake success). Cross-namespace invalidation
// keeps legacy hooks fresh where two namespaces share a table (e.g. control
// tests touch the control row read under ['controls'] by queries/useControls).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as co from '../services/complianceOpsService'
import * as ro from '../services/regulatoryOpsService'
import { fetchPolicyVersions } from '../services/policyService'

function crud<T extends { id?: string }>(
  key: string,
  fetchFn: () => Promise<T[]>,
  saveFn: (r: any) => Promise<T>,
  deleteFn: (id: string) => Promise<void>,
  label: string,
  // Extra query keys to invalidate on mutation — for tables that legacy hooks
  // also read under a different namespace.
  extraKeys: string[] = [],
) {
  return function useResource() {
    const qc = useQueryClient()
    const { data: items = [], isLoading, error } = useQuery({ queryKey: [key], queryFn: fetchFn, staleTime: 30_000 })
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: [key] })
      for (const k of extraKeys) qc.invalidateQueries({ queryKey: [k] })
    }
    const save = useMutation({
      mutationFn: (r: T) => saveFn(r),
      onSuccess: () => { invalidate(); toast.success(`${label} saved`) },
      onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : `Failed to save ${label.toLowerCase()}`),
    })
    const remove = useMutation({
      mutationFn: (id: string) => deleteFn(id),
      onSuccess: () => { invalidate(); toast.success(`${label} deleted`) },
      onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : `Failed to delete ${label.toLowerCase()}`),
    })
    return {
      items, isLoading, error,
      save: save.mutateAsync, remove: remove.mutateAsync,
      isSaving: save.isPending, isDeleting: remove.isPending,
    }
  }
}

// Audit management — audits also feed the derived calendar (start_date), so
// the calendar namespace cross-invalidates.
export const useAudits = crud('cg-audits', co.fetchAudits, co.saveAudit, co.deleteAudit, 'Audit', ['cg-calendar'])

export function useAuditFindings(auditId?: string) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['cg-audit-findings', auditId ?? 'all'],
    queryFn: () => co.fetchFindings(auditId),
    staleTime: 30_000,
  })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cg-audit-findings'] })
    qc.invalidateQueries({ queryKey: ['cg-audits'] })
  }
  const save = useMutation({
    mutationFn: (r: co.AuditFindingRecord) => co.saveFinding(r),
    onSuccess: () => { invalidate(); toast.success('Finding saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save finding'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => co.deleteFinding(id),
    onSuccess: () => { invalidate(); toast.success('Finding deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete finding'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending, isDeleting: remove.isPending,
  }
}

// Compliance calendar — merged view (manual + live-derived deadline events);
// save/remove apply to manual rows only, the services enforce it.
export function useCalendar() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['cg-calendar'],
    queryFn: co.fetchCalendarEvents,
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cg-calendar'] })
  const save = useMutation({
    mutationFn: (r: co.CalendarEventRecord) => co.saveCalendarEvent(r),
    onSuccess: () => { invalidate(); toast.success('Calendar entry saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save calendar entry'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => co.deleteCalendarEvent(id),
    onSuccess: () => { invalidate(); toast.success('Calendar entry deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete calendar entry'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending, isDeleting: remove.isPending,
  }
}

// Control tests — a save also updates the control row (last_tested_at /
// test_result / next_test_at), so the legacy ['controls'] namespace and the
// derived calendar (which surfaces next_test_at) are cross-invalidated.
export function useControlTests(controlId?: string) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['cg-control-tests', controlId ?? 'all'],
    queryFn: () => co.fetchControlTests(controlId),
    staleTime: 30_000,
  })
  const save = useMutation({
    mutationFn: (r: co.ControlTestRecord) => co.saveControlTest(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cg-control-tests'] })
      qc.invalidateQueries({ queryKey: ['controls'] })
      qc.invalidateQueries({ queryKey: ['cg-gaps'] })
      qc.invalidateQueries({ queryKey: ['cg-calendar'] })
      toast.success('Test recorded')
    },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to record test'),
  })
  return { items, isLoading, error, save: save.mutateAsync, isSaving: save.isPending }
}

// Gap analysis — derived, read-only. Exposes both the gap rows and the live
// per-framework rollups (implemented+effective vs in-scope total).
export function useGaps() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cg-gaps'],
    queryFn: co.fetchGaps,
    staleTime: 30_000,
  })
  return { items: data?.gaps ?? [], rollups: data?.rollups ?? [], isLoading, error }
}

// Regulatory operations
export const useFilings = crud('cg-filings', ro.fetchFilings, ro.saveFiling, ro.deleteFiling, 'Filing', ['cg-calendar'])
export const useTransparencyReports = crud('cg-transparency-reports', ro.fetchTransparencyReports, ro.saveTransparencyReport, ro.deleteTransparencyReport, 'Report')
export const usePostMarketPlans = crud('cg-pmm-plans', ro.fetchPostMarketPlans, ro.savePostMarketPlan, ro.deletePostMarketPlan, 'Plan')

// Post-market events — saving with escalate=true declares a REAL incident
// through the incident pipeline, so the incident namespaces invalidate too.
export function usePostMarketEvents(planId?: string) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['cg-pmm-events', planId ?? 'all'],
    queryFn: () => ro.fetchPostMarketEvents(planId),
    staleTime: 30_000,
  })
  const invalidate = (escalated: boolean) => {
    qc.invalidateQueries({ queryKey: ['cg-pmm-events'] })
    if (escalated) {
      qc.invalidateQueries({ queryKey: ['ri-incidents'] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    }
  }
  const save = useMutation({
    mutationFn: (v: { event: ro.PostMarketEventRecord; escalateToIncident?: boolean }) =>
      ro.savePostMarketEvent(v.event, v.escalateToIncident ?? false),
    onSuccess: (_d, v) => {
      invalidate(!!v.escalateToIncident)
      toast.success(v.escalateToIncident ? 'Event saved and escalated to an incident' : 'Event saved')
    },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save event'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => ro.deletePostMarketEvent(id),
    onSuccess: () => { invalidate(false); toast.success('Event deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete event'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending, isDeleting: remove.isPending,
  }
}

// Policy templates — global read-only catalog.
export function usePolicyTemplates() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['cg-policy-templates'],
    queryFn: ro.fetchPolicyTemplates,
    staleTime: 60_000,
  })
  return { items, isLoading, error }
}

// Template → draft policy + first version; the policies namespace used by
// queries/usePolicies invalidates so the new draft appears immediately.
export function useInstantiateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { template: ro.PolicyTemplateRecord; byName?: string }) =>
      ro.instantiateTemplate(v.template, v.byName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
      qc.invalidateQueries({ queryKey: ['cg-policy-versions'] })
      toast.success('Policy created from template')
    },
    onError: (e: any) => toast.error(e?.message ? `Create failed: ${e.message}` : 'Failed to create policy from template'),
  })
}

// Version history for one policy.
export function usePolicyVersions(policyId?: string) {
  return useQuery({
    queryKey: ['cg-policy-versions', policyId ?? 'none'],
    queryFn: () => fetchPolicyVersions(policyId!),
    enabled: !!policyId,
    staleTime: 30_000,
  })
}
