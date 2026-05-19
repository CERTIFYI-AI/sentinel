import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDataAssets, upsertDataAsset, deleteDataAsset, fetchDsarRequests, upsertDsarRequest } from '../../services/dataGovernanceService'

export function useDataAssets() {
  return useQuery({ queryKey: ['data_assets'], queryFn: fetchDataAssets, staleTime: 30000, placeholderData: [] })
}

export function useUpsertDataAsset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (r: any) => upsertDataAsset(r), onSuccess: () => qc.invalidateQueries({ queryKey: ['data_assets'] }) })
}

export function useDeleteDataAsset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteDataAsset(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['data_assets'] }) })
}

export function useDsarRequests() {
  return useQuery({ queryKey: ['dsar_requests'], queryFn: fetchDsarRequests, staleTime: 30000, placeholderData: [] })
}

export function useUpsertDsarRequest() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (r: any) => upsertDsarRequest(r), onSuccess: () => qc.invalidateQueries({ queryKey: ['dsar_requests'] }) })
}
