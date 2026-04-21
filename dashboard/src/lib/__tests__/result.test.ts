// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import {
  andThen,
  appError,
  err,
  isErr,
  isOk,
  map,
  ok,
  toAppError,
  unwrap,
  unwrapOr,
} from "../result";

describe("Result<T, E>", () => {
  it("ok / err are correctly typed discriminated unions", () => {
    const a = ok(1);
    const b = err(appError("not_found", "x"));
    expect(isOk(a)).toBe(true);
    expect(isErr(a)).toBe(false);
    expect(isOk(b)).toBe(false);
    expect(isErr(b)).toBe(true);
  });

  it("map lifts into success branch only", () => {
    expect(map(ok(2), (n) => n * 2)).toEqual(ok(4));
    const e = appError("network", "offline");
    expect(map(err<typeof e>(e), () => 0)).toEqual(err(e));
  });

  it("andThen chains Result-returning fns", () => {
    const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err(appError("validation", "odd")));
    expect(andThen(ok(8), half)).toEqual(ok(4));
    const r = andThen(ok(5), half);
    expect(isErr(r)).toBe(true);
  });

  it("unwrap throws on err; unwrapOr returns fallback", () => {
    expect(unwrap(ok(3))).toBe(3);
    expect(() => unwrap(err(appError("unknown", "x")))).toThrow();
    expect(unwrapOr(err(appError("unknown", "x")), 42)).toBe(42);
  });
});

describe("toAppError", () => {
  it("preserves existing AppErrors passed as cause", () => {
    const e = toAppError({ code: "forbidden", message: "nope" });
    expect(e.code).toBe("forbidden");
    expect(e.message).toBe("nope");
  });

  it("maps AbortError → timeout", () => {
    const cause = new DOMException("timed out", "AbortError");
    const e = toAppError(cause);
    expect(e.code).toBe("timeout");
  });

  it("maps Postgres integrity violations to conflict", () => {
    const e = toAppError({ code: "23505", message: "duplicate key" });
    expect(e.code).toBe("conflict");
  });

  it("maps PGRST301 → unauthenticated and PGRST116 → not_found", () => {
    expect(toAppError({ code: "PGRST301", message: "jwt expired" }).code).toBe(
      "unauthenticated",
    );
    expect(toAppError({ code: "PGRST116", message: "no rows" }).code).toBe("not_found");
  });

  it("falls back to unknown for unrecognized shapes", () => {
    expect(toAppError("boom").code).toBe("unknown");
    expect(toAppError(new Error("xx")).code).toBe("unknown");
  });
});
