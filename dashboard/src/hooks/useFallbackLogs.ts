// SPDX-License-Identifier: Apache-2.0
// useFallbackLogs — React Query wrapper over the real `fallback_logs` table.

import { useQuery } from '@tanstack/react-query'
import { fetchFallbackLogs, type FallbackLogRecord } from '@/services/fallbackService'

export function useFallbackLogs() {
  const q = useQuery({
    queryKey: ['fallback-logs'],
    queryFn: fetchFallbackLogs,
    staleTime: 30_000,
  })
  return {
    data: (q.data ?? []) as FallbackLogRecord[],
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
  }
}
