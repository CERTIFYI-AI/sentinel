import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTenantSettings, saveTenantSettings, logSettingsAudit } from '../services/settingsService'
import type { TenantSettings } from '../services/settingsService'

export function useSettingsData() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: fetchTenantSettings,
    staleTime: 30_000,
    retry: 1,
  })

  const mutation = useMutation({
    mutationFn: async (args: { patch: Partial<TenantSettings>; audit?: { user: string; section: string; field: string; oldValue: string; newValue: string } }) => {
      const ok = await saveTenantSettings(args.patch)
      if (ok && args.audit) await logSettingsAudit(args.audit)
      return ok
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    saveSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
