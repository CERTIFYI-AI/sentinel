// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TPRM questionnaire packs — org-scoped rows in vendor_assessment_templates.
// The 10 built-in packs are seeded by migration 20260928000001 and grouped by
// the TPRM module taxonomy. Responses snapshot the template (name, version,
// questions) at submit time, so a template edit never rescores history.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface TemplateOption { value: string; label: string; points: number }
export interface TemplateQuestion { id: string; text: string; category: string; options: TemplateOption[] }

export interface AssessmentTemplate {
  id: string
  slug: string
  name: string
  module: string
  version: string
  description: string | null
  questions: TemplateQuestion[]
  isBuiltin: boolean
}

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — assessment templates are unavailable')
  }
  return supabase
}

export async function fetchAssessmentTemplates(): Promise<AssessmentTemplate[]> {
  const { data, error } = await client()
    .from('vendor_assessment_templates')
    .select('id, slug, name, module, version, description, questions, is_builtin')
    .order('module', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(`Templates failed to load: ${error.message}`)
  return (data ?? []).map((r: any) => ({
    id: r.id, slug: r.slug, name: r.name, module: r.module, version: r.version,
    description: r.description ?? null,
    questions: Array.isArray(r.questions) ? r.questions : [],
    isBuiltin: !!r.is_builtin,
  }))
}
