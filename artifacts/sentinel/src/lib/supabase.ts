// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Sentinel — canonical Supabase client.
//
// Historically this file silently fell back to a placeholder URL/key when env
// vars were missing. That mode is unsafe in production: every query failed
// silently and every page that depended on Supabase data appeared to "load
// forever" (e.g. /tasks blank-screen). We now fail fast at module load so the
// failure mode is loud and obvious.
//
// Sister file `supabaseClient.ts` does the same thing; both export a singleton
// named `supabase`. Existing imports from either path continue to work.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surface a clear, actionable error instead of booting a placeholder client.
  // The dashboard is a Vite SPA — env vars are baked at build time, so this
  // throw fires once on first script execution and is visible in the console.
  const missing = [
    !SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
    !SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null,
  ]
    .filter(Boolean)
    .join(', ')
  throw new Error(
    `[Sentinel] Supabase client cannot start — missing env var(s): ${missing}. ` +
      `Set these in dashboard/.env.local for local dev, or in your Cloudflare ` +
      `Pages / Workers build environment for deployments. See .env.example.`,
  )
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 20 } },
  global: {
    headers: {
      'X-Sentinel-Client': 'dashboard/1.0',
    },
  },
})

/**
 * Back-compat — previously used by call sites that wanted to short-circuit
 * before issuing real queries. With fail-fast in place this is always true
 * by the time any module body executes, but we keep the export so existing
 * imports don't break.
 */
export const isSupabaseConfigured = (): boolean => true

export type { SupabaseClient }
