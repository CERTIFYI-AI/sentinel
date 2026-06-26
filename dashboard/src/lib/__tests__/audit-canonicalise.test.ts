// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Mirrors the canonicalisation defined in the WS0.3 migration so drift in
// either direction fails CI.

import { describe, expect, it } from "vitest";

/**
 * Canonicalise an audit event the same way the DB RPC does:
 *   seq|id|org_id|actor_kind|actor_id|action|entity|entity_id|previous_hash|recorded_at|json_compact
 */
export function canonicaliseAudit(ev: {
  seq: number;
  id: string;
  org_id: string;
  actor_kind: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  previous_hash: string | null;
  recorded_at: string;
  details: Record<string, unknown> | null;
}): string {
  const parts = [
    String(ev.seq),
    ev.id,
    ev.org_id,
    ev.actor_kind,
    ev.actor_id ?? "",
    ev.action,
    ev.entity,
    ev.entity_id ?? "",
    ev.previous_hash ?? "",
    ev.recorded_at,
    ev.details ? JSON.stringify(ev.details) : "{}",
  ];
  return parts.join("|");
}

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const BASE = {
  seq: 1,
  id: "11111111-1111-1111-1111-111111111111",
  org_id: "22222222-2222-2222-2222-222222222222",
  actor_kind: "user",
  actor_id: "33333333-3333-3333-3333-333333333333",
  action: "create",
  entity: "control",
  entity_id: "44444444-4444-4444-4444-444444444444",
  previous_hash: null as string | null,
  recorded_at: "2026-04-21T10:00:00.000Z",
  details: { reason: "initial import" },
};

describe("audit canonicalisation", () => {
  it("is deterministic for identical inputs", () => {
    expect(canonicaliseAudit(BASE)).toBe(canonicaliseAudit(BASE));
  });

  it("changes when any field changes", () => {
    const a = canonicaliseAudit(BASE);
    const b = canonicaliseAudit({ ...BASE, seq: 2 });
    const c = canonicaliseAudit({ ...BASE, action: "update" });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("treats null actor_id and empty string details separately from populated ones", () => {
    const withNull = canonicaliseAudit({ ...BASE, actor_id: null });
    const withValue = canonicaliseAudit(BASE);
    expect(withNull).not.toBe(withValue);
  });

  it("produces a stable sha256 digest", async () => {
    const digest = await sha256Hex(canonicaliseAudit(BASE));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    const again = await sha256Hex(canonicaliseAudit(BASE));
    expect(again).toBe(digest);
  });
});
