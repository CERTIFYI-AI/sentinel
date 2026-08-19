// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the AI Brain configuration (Settings → AI Brain tab).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  readAiBrainConfig, saveAiBrainConfig,
  type AiBrainConfig, type AiBrainSaveInput,
} from '../services/aiBrainConfigService'

const KEY = ['ai-brain-config'] as const

export function useAiBrainConfig() {
  return useQuery<AiBrainConfig | null>({
    queryKey: KEY,
    queryFn: readAiBrainConfig,
    staleTime: 30_000,
  })
}

export function useSaveAiBrainConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AiBrainSaveInput) => saveAiBrainConfig(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
