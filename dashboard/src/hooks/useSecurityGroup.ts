// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the Security group, on the platform contract:
// reads surface real loading/error, mutations invalidate and surface real
// success/error via sonner (writes throw in the service, so onError is
// reachable — no fake success).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as svc from '../services/securityGroupService'

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

export const useThreats   = crud('sec-threats', svc.fetchThreats, svc.saveThreat, svc.deleteThreat, 'Threat')
export const useScans     = crud('sec-scans', svc.fetchScans, svc.saveScan, svc.deleteScan, 'Scan')
export const useVulns     = crud('sec-vulns', svc.fetchVulns, svc.saveVuln, svc.deleteVuln, 'Vulnerability')
export const useAssets    = crud('sec-assets', svc.fetchAssets, svc.saveAsset, svc.deleteAsset, 'Asset')
export const useFindings  = crud('sec-findings', svc.fetchFindings, svc.saveFinding, svc.deleteFinding, 'Finding')
export const useCampaigns = crud('sec-campaigns', svc.fetchCampaigns, svc.saveCampaign, svc.deleteCampaign, 'Campaign')
export const useArena     = crud('sec-arena', svc.fetchArena, svc.saveArena, svc.deleteArena, 'Benchmark')
export const useFirewall  = crud('sec-firewall', svc.fetchFirewall, svc.saveFirewall, svc.deleteFirewall, 'Rule')
export const useReports   = crud('sec-reports', svc.fetchReports, svc.saveReport, svc.deleteReport, 'Report')

// Keys Vault — bespoke because of rotate/revoke and the never-store-secret rule.
export function useKeys() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({ queryKey: ['sec-keys'], queryFn: svc.fetchKeys, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['sec-keys'] })
  const save = useMutation({
    mutationFn: (r: svc.KeyRecord & { secret?: string }) => svc.saveKey(r),
    onSuccess: () => { inv(); toast.success('Key saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save key'),
  })
  const rotate = useMutation({
    mutationFn: (v: { id: string; prefix: string; secret: string }) => svc.rotateKey(v.id, v.prefix, v.secret),
    onSuccess: () => { inv(); toast.success('Key rotated — old secret invalidated') },
    onError: (e: any) => toast.error(e?.message ? `Rotate failed: ${e.message}` : 'Failed to rotate key'),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => svc.revokeKey(id),
    onSuccess: () => { inv(); toast.success('Key revoked') },
    onError: (e: any) => toast.error(e?.message ? `Revoke failed: ${e.message}` : 'Failed to revoke key'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => svc.deleteKey(id),
    onSuccess: () => { inv(); toast.success('Key deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete key'),
  })
  return {
    items, isLoading, error,
    save: save.mutateAsync, rotate: rotate.mutateAsync, revoke: revoke.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending,
  }
}

// Security report generation + run history.
export function useReportRuns(reportId?: string) {
  return useQuery({
    queryKey: ['sec-report-runs', reportId ?? 'all'],
    queryFn: () => svc.fetchReportRuns(reportId),
    staleTime: 15_000,
  })
}
export function useGenerateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { template: svc.ReportTemplate; by: string }) => svc.generateReport(v.template, v.by),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sec-report-runs'] })
      qc.invalidateQueries({ queryKey: ['sec-reports'] })
      toast.success('Report generated')
    },
    onError: (e: any) => toast.error(e?.message ? `Generation failed: ${e.message}` : 'Failed to generate report'),
  })
}
