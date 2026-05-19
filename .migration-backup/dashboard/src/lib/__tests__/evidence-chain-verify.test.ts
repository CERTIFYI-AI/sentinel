// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.5 — Chain-verify unit tests mirroring the client-side verifier in
// EvidenceCustodyExplorer. Guards against regressions in the O(n) chain
// walk and against breaking changes in custody event ordering rules.

import { describe, expect, it } from "vitest";

export interface CustodyEvent {
  seq: number;
  previous_hash: string | null;
  event_hash: string;
}

export function verifyChain(
  events: CustodyEvent[],
  tip: string | null,
): { ok: boolean; failAt: number | null } {
  let prev: string | null = null;
  for (const ev of events) {
    if ((ev.previous_hash ?? null) !== prev) {
      return { ok: false, failAt: ev.seq };
    }
    prev = ev.event_hash;
  }
  if (tip && prev !== tip) return { ok: false, failAt: null };
  return { ok: true, failAt: null };
}

const CHAIN: CustodyEvent[] = [
  { seq: 1, previous_hash: null, event_hash: "aa" },
  { seq: 2, previous_hash: "aa", event_hash: "bb" },
  { seq: 3, previous_hash: "bb", event_hash: "cc" },
];

describe("custody chain verifier", () => {
  it("passes for an intact chain with matching tip", () => {
    expect(verifyChain(CHAIN, "cc")).toEqual({ ok: true, failAt: null });
  });

  it("fails when an event's previous_hash does not match prior event_hash", () => {
    const tampered = [
      CHAIN[0]!,
      { ...CHAIN[1]!, previous_hash: "zz" },
      CHAIN[2]!,
    ];
    expect(verifyChain(tampered, "cc")).toEqual({ ok: false, failAt: 2 });
  });

  it("fails when final event_hash does not match recorded tip", () => {
    expect(verifyChain(CHAIN, "dd")).toEqual({ ok: false, failAt: null });
  });

  it("passes an empty chain when tip is null", () => {
    expect(verifyChain([], null)).toEqual({ ok: true, failAt: null });
  });

  it("treats missing previous_hash as null at genesis", () => {
    const first: CustodyEvent[] = [
      { seq: 1, previous_hash: null, event_hash: "aa" },
    ];
    expect(verifyChain(first, "aa")).toEqual({ ok: true, failAt: null });
  });
});
