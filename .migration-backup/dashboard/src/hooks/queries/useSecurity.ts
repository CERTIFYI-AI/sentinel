import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSecurityScans, fetchSecurityThreats, fetchSecurityVulnerabilities, fetchApiKeys, upsertApiKey, deleteApiKey, fetchGuardrails, upsertGuardrail, deleteGuardrail, fetchRedTeamCampaigns } from '../../services/securityService'

export function useSecurityScans() {
  return useQuery({ queryKey: ['security_scans'], queryFn: fetchSecurityScans, staleTime: 30000, placeholderData: [] })
}

export function useSecurityThreats() {
  return useQuery({ queryKey: ['security_threats'], queryFn: fetchSecurityThreats, staleTime: 30000, placeholderData: [] })
}

export function useSecurityVulnerabilities() {
  return useQuery({ queryKey: ['security_vulnerabilities'], queryFn: fetchSecurityVulnerabilities, staleTime: 30000, placeholderData: [] })
}

export function useApiKeys() {
  return useQuery({ queryKey: ['api_keys'], queryFn: fetchApiKeys, staleTime: 30000, placeholderData: [] })
}

export function useUpsertApiKey() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (record: any) => upsertApiKey(record), onSuccess: () => qc.invalidateQueries({ queryKey: ['api_keys'] }) })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteApiKey(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['api_keys'] }) })
}

export function useGuardrails() {
  return useQuery({ queryKey: ['guardrails'], queryFn: fetchGuardrails, staleTime: 30000, placeholderData: [] })
}

export function useUpsertGuardrail() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (record: any) => upsertGuardrail(record), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardrails'] }) })
}

export function useDeleteGuardrail() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteGuardrail(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['guardrails'] }) })
}

export function useRedTeamCampaigns() {
  return useQuery({ queryKey: ['red_team_campaigns'], queryFn: fetchRedTeamCampaigns, staleTime: 30000, placeholderData: [] })
}
