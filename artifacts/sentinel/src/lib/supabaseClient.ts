// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Canonical Supabase client — single import, environment-validated.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[Sentinel] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set')
}

// Singleton — re-export so existing `import { supabase } from './supabase'` still works.
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } },
  global: {
    headers: { 'X-Sentinel-Client': 'dashboard/1.0', 'X-Request-ID': crypto.randomUUID() },
  },
})

export type { SupabaseClient }
