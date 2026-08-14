// SPDX-License-Identifier: Apache-2.0
// useToolCalls — React Query wrapper over the real `tool_call_logs` table.

import { useQuery } from '@tanstack/react-query'
import { fetchToolCalls, type ToolCallRecord } from '@/services/toolCallService'

export function useToolCalls() {
  const q = useQuery({
    queryKey: ['tool-calls'],
    queryFn: fetchToolCalls,
    staleTime: 30_000,
  })
  return {
    data: (q.data ?? []) as ToolCallRecord[],
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
  }
}
