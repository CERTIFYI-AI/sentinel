// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// F.1 — Unit tests for src/lib/remediationRowStyle.ts
// Covers: overdue, near-due (<24h), future, null/undefined due date, and
// completed/closed status bypass.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { remediationRowClass } from "@/lib/remediationRowStyle";

// ---------------------------------------------------------------------------
// Helper: build ISO strings relative to "now" in tests
// ---------------------------------------------------------------------------
const NOW = new Date("2026-04-21T12:00:00.000Z").getTime();

function isoOffset(deltaMs: number): string {
  return new Date(NOW + deltaMs).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Overdue (past due date)
// ---------------------------------------------------------------------------
describe("remediationRowClass — overdue", () => {
  it("returns a class containing bg-red-50 when the due date is in the past", () => {
    const pastDate = isoOffset(-1); // 1ms in the past
    const cls = remediationRowClass(pastDate);
    expect(cls).toContain("bg-red-50");
  });

  it("returns bg-red-50 for a date that was due days ago", () => {
    const longOverdue = isoOffset(-7 * 24 * 60 * 60 * 1000); // 7 days ago
    const cls = remediationRowClass(longOverdue);
    expect(cls).toContain("bg-red-50");
  });

  it("includes a border accent class alongside bg-red-50", () => {
    const cls = remediationRowClass(isoOffset(-1000));
    // The function adds a border-l-2 border-red-400 accent
    expect(cls).toContain("border-l-2");
    expect(cls).toContain("border-red-400");
  });
});

// ---------------------------------------------------------------------------
// Near-due (within next 24 hours, not yet overdue)
// ---------------------------------------------------------------------------
describe("remediationRowClass — near-due (< 24h remaining)", () => {
  it("returns a class containing bg-amber-50 when due in 1 hour", () => {
    const soonDate = isoOffset(60 * 60 * 1000); // 1 h from now
    const cls = remediationRowClass(soonDate);
    expect(cls).toContain("bg-amber-50");
  });

  it("returns bg-amber-50 when due in exactly 23 hours 59 minutes", () => {
    const almostThreshold = isoOffset(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    const cls = remediationRowClass(almostThreshold);
    expect(cls).toContain("bg-amber-50");
  });

  it("does NOT return bg-red-50 for a near-due item", () => {
    const cls = remediationRowClass(isoOffset(3 * 60 * 60 * 1000));
    expect(cls).not.toContain("bg-red-50");
  });
});

// ---------------------------------------------------------------------------
// Future (> 24h remaining)
// ---------------------------------------------------------------------------
describe("remediationRowClass — future (> 24h remaining)", () => {
  it("returns an empty string when due date is 2 days away", () => {
    const future = isoOffset(2 * 24 * 60 * 60 * 1000);
    expect(remediationRowClass(future)).toBe("");
  });

  it("returns an empty string when due date is 30 days away", () => {
    const far = isoOffset(30 * 24 * 60 * 60 * 1000);
    expect(remediationRowClass(far)).toBe("");
  });

  it("returns a string that does not contain red or amber classes", () => {
    const cls = remediationRowClass(isoOffset(48 * 60 * 60 * 1000));
    expect(cls).not.toContain("bg-red");
    expect(cls).not.toContain("bg-amber");
  });
});

// ---------------------------------------------------------------------------
// Null / undefined due date
// ---------------------------------------------------------------------------
describe("remediationRowClass — null / undefined due date", () => {
  it("returns empty string for null due date", () => {
    expect(remediationRowClass(null)).toBe("");
  });

  it("returns empty string for undefined due date", () => {
    expect(remediationRowClass(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Status bypass (COMPLETED / CLOSED)
// ---------------------------------------------------------------------------
describe("remediationRowClass — status bypass", () => {
  it("returns empty string for an overdue item with status COMPLETED", () => {
    const overdue = isoOffset(-1000);
    expect(remediationRowClass(overdue, "COMPLETED")).toBe("");
  });

  it("returns empty string for an overdue item with status CLOSED", () => {
    const overdue = isoOffset(-1000);
    expect(remediationRowClass(overdue, "CLOSED")).toBe("");
  });

  it("still applies red class for an overdue item with another status", () => {
    const overdue = isoOffset(-1000);
    expect(remediationRowClass(overdue, "OPEN")).toContain("bg-red-50");
  });
});
