// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// D-01 — Global federated search using Postgres tsvector + global_search() RPC.
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useRequiredOrgId } from './useTenant'

interface SearchResult {
  resource_type: string
  resource_id: string
  title: string
  excerpt: string
  url_path: string
  score: number
}

export function useGlobalSearch() {
  const orgId = useRequiredOrgId()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce
  const updateQuery = useCallback((q: string) => {
    setQuery(q)
    const timer = setTimeout(() => setDebouncedQuery(q), 300)
    return () => clearTimeout(timer)
  }, [])

  const results = useQuery({
    queryKey: ['global-search', orgId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) return []
      const { data, error } = await supabase.rpc('global_search', {
        p_org_id: orgId,
        p_query: debouncedQuery,
        p_limit: 20,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as SearchResult[]
    },
    enabled: !!orgId && debouncedQuery.length >= 2,
    staleTime: 10_000,
  })

  return { query, setQuery: updateQuery, results, isSearching: results.isFetching }
}
