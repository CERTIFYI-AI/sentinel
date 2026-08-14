import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDsarRequests, upsertDsarRequest } from '../../services/dataGovernanceService'

export function useDsarRequests() {
  return useQuery({ queryKey: ['dsar_requests'], queryFn: fetchDsarRequests, staleTime: 30000, placeholderData: [] })
}

export function useUpsertDsarRequest() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (r: any) => upsertDsarRequest(r), onSuccess: () => qc.invalidateQueries({ queryKey: ['dsar_requests'] }) })
}
