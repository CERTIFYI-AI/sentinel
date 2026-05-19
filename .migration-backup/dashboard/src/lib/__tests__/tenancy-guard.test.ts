// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.5 — Tenancy invariant tests. Any client helper that filters by
// org_id must refuse to run without a resolved org_id, to prevent the
// "empty org_id => return all rows" class of bug.

import { describe, expect, it } from "vitest";

export class TenancyError extends Error {
  constructor() {
    super("tenancy:missing_org_id");
    this.name = "TenancyError";
  }
}

export function requireOrgId(orgId: string | null | undefined): string {
  if (!orgId || typeof orgId !== "string" || orgId.trim().length === 0) {
    throw new TenancyError();
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
    throw new TenancyError();
  }
  return orgId;
}

describe("requireOrgId", () => {
  it("returns the org id when valid", () => {
    const v = "11111111-2222-3333-4444-555555555555";
    expect(requireOrgId(v)).toBe(v);
  });

  it.each([null, undefined, "", "   ", "not-a-uuid", "1234"])(
    "throws TenancyError for %p",
    (bad) => {
      expect(() => requireOrgId(bad as string | null | undefined)).toThrow(TenancyError);
    },
  );

  it("rejects the all-zeroes sentinel via caller policy (documentation test)", () => {
    // The all-zeroes UUID is the Phase A backfill sentinel; callers that
    // forbid it must add an additional guard. requireOrgId itself accepts
    // any syntactically valid UUID — this test pins that contract.
    const zeros = "00000000-0000-0000-0000-000000000000";
    expect(requireOrgId(zeros)).toBe(zeros);
  });
});
