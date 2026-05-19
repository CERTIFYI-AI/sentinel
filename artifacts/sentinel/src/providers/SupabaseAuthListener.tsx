// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// SupabaseAuthListener
// --------------------
// Mount once near the top of the React tree (inside QueryClientProvider).
// Listens for Supabase auth lifecycle events and reacts safely:
//
//   - TOKEN_REFRESHED  → no-op (the supabase-js client already swapped the
//                        access token in memory; queued queries pick it up).
//   - SIGNED_IN        → invalidate all server state so freshly authenticated
//                        users don't see another tenant's cached data.
//   - SIGNED_OUT       → clear all server state immediately.
//   - USER_UPDATED     → invalidate auth-scoped queries (profile/role).
//
// This component renders nothing. It is additive — no existing logic is
// modified. The custom JWT-based AuthContext continues to work in parallel
// for Worker API calls; this listener is exclusively for the supabase-js
// session.

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function SupabaseAuthListener() {
  const qc = useQueryClient()

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'SIGNED_OUT':
          // Hard reset: avoids cross-tenant leakage of cached query results.
          qc.clear()
          break
        case 'USER_UPDATED':
          qc.invalidateQueries({ queryKey: ['auth'] })
          qc.invalidateQueries({ queryKey: ['profile'] })
          qc.invalidateQueries({ queryKey: ['org'] })
          break
        case 'TOKEN_REFRESHED':
          // supabase-js handles the rotation transparently. We intentionally
          // do NOT invalidate queries here — that would cause a refetch storm
          // every ~hour for every signed-in user.
          break
        default:
          break
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [qc])

  return null
}

export default SupabaseAuthListener
