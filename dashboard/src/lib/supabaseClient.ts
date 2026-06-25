// supabaseClient.ts — Compatibility re-export.
// The canonical singleton is now in ./supabase.ts.
// This file is kept to avoid breaking any imports that use this path directly.
// TODO: migrate all import sites to use '@/lib/supabase' and delete this file.
export { supabase, isSupabaseConfigured } from './supabase'
export type { SupabaseClient } from './supabase'
