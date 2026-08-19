// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// aiBrainConfigService — browser client for the ai-brain-config Edge Function.
//
// Provider API keys are sent to the Edge Function for AES-256-GCM encryption;
// the browser never sees the encrypted blob and never stores the plaintext.
// Reads return the key_prefix (first 8 chars) for display — never the key.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

const FUNCTION = 'ai-brain-config'

export interface AiBrainConfig {
  id: string
  provider: string
  keyPrefix: string | null
  judgeModel: string
  embeddingModel: string
  autoActionConfidence: number
  enabled: boolean
  updatedAt: string | null
}

export interface AiBrainSaveInput {
  provider: string
  apiKey?: string
  judgeModel?: string
  embeddingModel?: string
  autoActionConfidence?: number
  enabled?: boolean
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot manage AI Brain configuration.')
  }
}

async function messageFromError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: unknown })?.context
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).json()
      if (typeof body?.error === 'string') return body.error
    } catch { /* fall through */ }
  }
  const msg = (error as { message?: unknown })?.message
  return typeof msg === 'string' && msg ? msg : fallback
}

export async function readAiBrainConfig(): Promise<AiBrainConfig | null> {
  ensureConfigured()
  const { data, error } = await supabase!.functions.invoke(FUNCTION, {
    body: { action: 'read' },
  })
  if (error) throw new Error(await messageFromError(error, 'Could not load AI Brain configuration.'))
  const cfg = data?.config
  if (!cfg) return null
  return {
    id: cfg.id,
    provider: cfg.provider,
    keyPrefix: cfg.key_prefix ?? null,
    judgeModel: cfg.judge_model,
    embeddingModel: cfg.embedding_model,
    autoActionConfidence: cfg.auto_action_confidence,
    enabled: cfg.enabled,
    updatedAt: cfg.updated_at ?? null,
  }
}

export async function saveAiBrainConfig(input: AiBrainSaveInput): Promise<{ status: string; message: string }> {
  ensureConfigured()
  const { data, error } = await supabase!.functions.invoke(FUNCTION, {
    body: {
      action: 'save',
      provider: input.provider,
      api_key: input.apiKey,
      judge_model: input.judgeModel,
      embedding_model: input.embeddingModel,
      auto_action_confidence: input.autoActionConfidence,
      enabled: input.enabled,
    },
  })
  if (error) throw new Error(await messageFromError(error, 'Could not save AI Brain configuration.'))
  return { status: data?.status ?? 'saved', message: data?.message ?? 'Saved.' }
}
