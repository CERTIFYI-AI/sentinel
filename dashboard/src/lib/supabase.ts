// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// supabase.ts — Canonical Supabase singleton.
//
// Two modes:
//   DEMO_MODE (VITE_DEMO_MODE=true): returns a no-op client; all queries
//     silently return empty results so the app works without credentials.
//   LIVE MODE (default): validates env vars and connects to production.
//
// All services/hooks import { supabase, isSupabaseConfigured } from here.
// The old supabaseClient.ts has been consolidated into this file.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

/**
 * Returns true when the Supabase environment is properly configured
 * and the app is NOT running in demo mode.
 */
export const isSupabaseConfigured = (): boolean => {
  if (DEMO_MODE) return false
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-key' &&
    SUPABASE_ANON_KEY !== 'placeholder-key'
  )
}

/**
 * Singleton Supabase client.
 *
 * In demo mode, it still creates a client (with placeholder URL) but
 * isSupabaseConfigured() returns false, so all services bail out early
 * and return their demo fallbacks.
 *
 * In live mode, it throws at startup if env vars are missing.
 */
function createSupabaseClient(): SupabaseClient {
  if (!DEMO_MODE && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
    throw new Error(
      '[Sentinel] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
      'Copy dashboard/.env.example to dashboard/.env.local and fill in the values. ' +
      'To run without Supabase, set VITE_DEMO_MODE=true.'
    )
  }

  const url = SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = SUPABASE_ANON_KEY || 'placeholder-key'

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 20 },
    },
    global: {
      headers: {
        'X-Sentinel-Client': 'dashboard/1.0',
      },
    },
  })
}

export const supabase: SupabaseClient = createSupabaseClient()

export type { SupabaseClient }
