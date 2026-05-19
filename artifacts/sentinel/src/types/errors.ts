// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
export type AppError = {
  code: string
  message: string
  details?: string
  status?: number
}

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export function ok<T>(data: T): Result<T> { return { ok: true, data } }
export function err(code: string, message: string, details?: string): Result<never> {
  return { ok: false, error: { code, message, details } }
}

export function fromSupabaseError(e: { message: string; code?: string }): AppError {
  return { code: e.code ?? 'SUPABASE_ERROR', message: e.message }
}
