// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// trainingService — the real `training_courses` table.
//
// V8 re-audit: this service previously returned SEED_TRAINING_COURSES
// (fabricated records) whenever the table was empty OR the query failed —
// invented completion percentages presented as a real training programme.
// Now: an empty table is an empty array, and a failed query THROWS so the
// caller can render a real error state. Writes throw too — no fake success
// (CLAUDE.md, First principle #4).

import { supabase, isSupabaseConfigured } from '@/lib/supabase'


export async function fetchAllTraining(filters: Record<string, any> = {}) {
  if (!isSupabaseConfigured()) return []
  let q = supabase.from('training_courses').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchTrainingById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase.from('training_courses').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export async function upsertTraining(record: any) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot save training course.')
  const { data, error } = await supabase.from('training_courses').upsert(record).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteTraining(id: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot delete training course.')
  const { error } = await supabase.from('training_courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}
