// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// F.1 — Unit tests for src/types/errors.ts
// Covers: ok(), err(), AppError shape, fromSupabaseError(), Result discriminant.

import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  fromSupabaseError,
  type AppError,
  type Result,
} from "@/types/errors";

// ---------------------------------------------------------------------------
// ok()
// ---------------------------------------------------------------------------
describe("ok()", () => {
  it("returns a Result with ok:true and the wrapped data", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    // Narrow to access data without TS error
    if (result.ok) {
      expect(result.data).toBe(42);
    }
  });

  it("wraps non-primitive values by reference", () => {
    const obj = { id: "abc", name: "test" };
    const result = ok(obj);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(obj);
    }
  });

  it("wraps null and undefined without error", () => {
    const r1 = ok(null);
    const r2 = ok(undefined);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok) expect(r1.data).toBeNull();
    if (r2.ok) expect(r2.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// err()
// ---------------------------------------------------------------------------
describe("err()", () => {
  it("returns a Result with ok:false and an embedded AppError", () => {
    const result = err("NOT_FOUND", "resource missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe("resource missing");
    }
  });

  it("includes optional details when provided", () => {
    const result = err("VALIDATION", "invalid input", "field name is required");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.details).toBe("field name is required");
    }
  });

  it("sets details to undefined when not provided", () => {
    const result = err("SERVER_ERROR", "unexpected failure");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.details).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// AppError shape
// ---------------------------------------------------------------------------
describe("AppError shape", () => {
  it("has required code and message fields", () => {
    const e: AppError = { code: "FORBIDDEN", message: "access denied" };
    expect(e.code).toBe("FORBIDDEN");
    expect(e.message).toBe("access denied");
  });

  it("accepts optional status field", () => {
    const e: AppError = { code: "RATE_LIMITED", message: "slow down", status: 429 };
    expect(e.status).toBe(429);
  });

  it("accepts optional details field", () => {
    const e: AppError = { code: "VALIDATION", message: "bad input", details: "email invalid" };
    expect(e.details).toBe("email invalid");
  });
});

// ---------------------------------------------------------------------------
// Result<T> discriminant
// ---------------------------------------------------------------------------
describe("Result<T> type discriminant", () => {
  it("ok branch carries data, not error", () => {
    const r: Result<string> = ok("hello");
    expect(r.ok).toBe(true);
    // TypeScript type narrowing via runtime branch
    if (r.ok) {
      expect(r.data).toBe("hello");
    }
  });

  it("err branch carries error, not data", () => {
    const r: Result<string> = err("E", "oops");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("E");
    }
  });
});

// ---------------------------------------------------------------------------
// fromSupabaseError()
// ---------------------------------------------------------------------------
describe("fromSupabaseError()", () => {
  it("maps a Supabase error object to AppError with its code", () => {
    const appErr = fromSupabaseError({ message: "row not found", code: "PGRST116" });
    expect(appErr.code).toBe("PGRST116");
    expect(appErr.message).toBe("row not found");
  });

  it("falls back to SUPABASE_ERROR when no code is provided", () => {
    const appErr = fromSupabaseError({ message: "network error" });
    expect(appErr.code).toBe("SUPABASE_ERROR");
    expect(appErr.message).toBe("network error");
  });

  it("preserves message exactly", () => {
    const msg = "duplicate key value violates unique constraint";
    const appErr = fromSupabaseError({ message: msg, code: "23505" });
    expect(appErr.message).toBe(msg);
  });
});
