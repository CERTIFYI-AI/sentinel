// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * Result<T, E> — discriminated-union return envelope used by every service.
 *
 * Rationale
 * ---------
 * Throwing from service code requires every call site to remember a try/catch
 * or opt into TanStack Query's `throwOnError`, which is brittle. A tagged
 * union forces the type checker to ensure both branches are handled.
 *
 * Shape
 * -----
 *   { ok: true;  value: T }
 *   { ok: false; error: AppError }
 *
 * Use the helpers `ok(...)`, `err(...)`, `isOk(...)`, `isErr(...)`.
 * Never hand-construct the object literals.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok === true;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.ok === false;
}

/** Apply f to the success value, preserving error. */
export function map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return isOk(r) ? ok(f(r.value)) : r;
}

/** Chain another Result-returning operation. */
export function andThen<T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> {
  return isOk(r) ? f(r.value) : r;
}

/** Extract the value or throw the error — only for test code. */
export function unwrap<T, E>(r: Result<T, E>): T {
  if (isOk(r)) return r.value;
  throw r.error;
}

/** Extract the value or return a fallback. */
export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return isOk(r) ? r.value : fallback;
}

// -----------------------------------------------------------------------------
// AppError — canonical error envelope
// -----------------------------------------------------------------------------

export type AppErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "timeout"
  | "network"
  | "unknown";

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  /** Optional HTTP-style status for API-origin errors. */
  readonly status?: number;
  /** Server-provided correlation id for tracing. */
  readonly requestId?: string;
  /** Field-level issues for validation errors (path → message). */
  readonly issues?: readonly { path: string; message: string }[];
  /** Cause (not serialized). */
  readonly cause?: unknown;
}

export function appError(
  code: AppErrorCode,
  message: string,
  extra?: Omit<Partial<AppError>, "code" | "message">,
): AppError {
  return { code, message, ...(extra ?? {}) };
}

/**
 * Normalize anything thrown into an AppError. Used at service boundaries
 * to prevent leaking driver-specific error shapes into the UI.
 */
export function toAppError(cause: unknown): AppError {
  // DOMException (AbortError) — must be checked first because it also has a `code`.
  if (cause && typeof cause === "object" && "name" in cause) {
    const name = (cause as { name?: unknown }).name;
    if (name === "AbortError") {
      const msg = (cause as { message?: unknown }).message;
      return {
        code: "timeout",
        message: typeof msg === "string" ? msg : "aborted",
        cause,
      };
    }
  }
  if (cause && typeof cause === "object" && "code" in cause && "message" in cause) {
    const c = cause as { code: unknown; message: unknown };
    if (typeof c.code === "string" && typeof c.message === "string") {
      const code = KNOWN_CODES.has(c.code)
        ? (c.code as AppErrorCode)
        : mapPostgresCode(c.code);
      return { code, message: c.message, cause };
    }
  }
  if (cause instanceof Error) {
    return { code: "unknown", message: cause.message, cause };
  }
  return { code: "unknown", message: String(cause), cause };
}

const KNOWN_CODES = new Set<string>([
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation",
  "conflict",
  "rate_limited",
  "unavailable",
  "timeout",
  "network",
  "unknown",
]);

/** Map a handful of Postgres SQLSTATE codes to AppErrorCode. */
function mapPostgresCode(code: unknown): AppErrorCode {
  if (typeof code !== "string") return "unknown";
  if (code.startsWith("23")) return "conflict"; // integrity violations
  if (code === "42501") return "forbidden"; // insufficient_privilege
  if (code === "PGRST301") return "unauthenticated"; // PostgREST JWT expired
  if (code === "PGRST116") return "not_found"; // PostgREST no rows
  return "unknown";
}
