// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// supabaseError — turn a raw PostgREST/Postgres error into something a person
// can act on.
//
// The specific error this exists to tame:
//
//   Could not find the table 'public.vendor_assessments' in the schema cache
//
// That is a correct, precise message — for an engineer. Shown to an operator on
// a governance screen it reads as a crash. It happens when a table the frontend
// queries has not been provisioned in this environment's database yet (a
// migration not applied, or a module ahead of its backend). The right response
// is not a red alarm; it is a calm "this area isn't set up yet", because
// nothing is broken — it is simply not there.

/** True when the error is PostgREST/Postgres "relation does not exist". */
export function isMissingRelationError(error: unknown): boolean {
  if (!error) return false
  // PostgREST surfaces this as code PGRST205 with a "schema cache" message;
  // a direct Postgres error is SQLSTATE 42P01 (undefined_table). Match on
  // whichever fields are present — supabase-js shapes vary by call.
  const code = readField(error, 'code')
  if (code === 'PGRST205' || code === '42P01') return true

  const msg = messageOf(error).toLowerCase()
  return (
    // "Could not find the table '…' in the schema cache"
    (msg.includes('could not find the table') && msg.includes('schema cache')) ||
    // "relation \"public.x\" does not exist"
    (msg.includes('relation') && msg.includes('does not exist'))
  )
}

/** The relation name in a missing-table error, e.g. `public.vendor_assessments`. */
export function missingRelationName(error: unknown): string | null {
  const msg = messageOf(error)
  // Single- or double-quoted, with or without the schema prefix.
  const m =
    msg.match(/table '([^']+)'/i) ||
    msg.match(/relation "([^"]+)"/i)
  return m ? m[1] : null
}

export interface FriendlyError {
  /** Calm when the table just isn't provisioned; alarming when it's a real fault. */
  tone: 'setup' | 'error'
  title: string
  detail: string
}

/**
 * Map an error to an operator-facing title + detail, never leaking the raw
 * "schema cache" phrasing. `subject` names the thing being loaded, e.g.
 * "vendor assessments", so the message reads naturally.
 */
export function humanizeError(error: unknown, subject = 'this data'): FriendlyError {
  if (isMissingRelationError(error)) {
    return {
      tone: 'setup',
      title: 'This module is not set up yet',
      detail:
        `The database table behind ${subject} has not been provisioned in this ` +
        `environment. This usually means a pending database migration has not ` +
        `been applied yet — the screen will work as soon as it is. Nothing is ` +
        `broken and no data has been lost.`,
    }
  }
  const msg = messageOf(error)
  return {
    tone: 'error',
    title: 'Something went wrong',
    detail: msg || 'An unexpected error occurred. Please try again.',
  }
}

// ── internals ──────────────────────────────────────────────────────────────

function readField(error: unknown, field: string): string | undefined {
  if (error && typeof error === 'object' && field in error) {
    const v = (error as Record<string, unknown>)[field]
    return typeof v === 'string' ? v : undefined
  }
  return undefined
}

function messageOf(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return readField(error, 'message') ?? readField(error, 'details') ?? ''
}
