// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildSignatureHeader,
  deliverOnce,
  nextRetryDelaySeconds,
  RETRY_SCHEDULE_SECONDS,
} from "../../../../workers/webhooks/delivery";

describe("WS8 webhook delivery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds a deterministic HMAC signature header", async () => {
    const header = await buildSignatureHeader(
      '{"hello":"world"}',
      "shhh",
      Date.parse("2026-04-21T12:00:00Z"),
    );
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    // Stable: same inputs → same output
    const again = await buildSignatureHeader(
      '{"hello":"world"}',
      "shhh",
      Date.parse("2026-04-21T12:00:00Z"),
    );
    expect(header).toBe(again);
  });

  it("exposes an 8-attempt retry schedule", () => {
    expect(RETRY_SCHEDULE_SECONDS).toHaveLength(8);
    expect(nextRetryDelaySeconds(0)).toBe(0);
    expect(nextRetryDelaySeconds(7)).toBe(86_400);
    expect(nextRetryDelaySeconds(8)).toBeNull();
    expect(nextRetryDelaySeconds(-1)).toBeNull();
  });

  it("captures non-2xx responses as failures", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("oops", { status: 500 }));
    const result = await deliverOnce(
      {
        id: "s1",
        org_id: "o1",
        url: "https://example.test/hook",
        events: ["incident.opened"],
        secret: "shhh",
        active: true,
      },
      {
        id: "e1",
        type: "incident.opened",
        org_id: "o1",
        created_at: "2026-04-21T12:00:00Z",
        data: { title: "test" },
      },
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
