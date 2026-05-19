// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.

import { describe, it, expect, vi } from "vitest";
import { createTokenBucket } from "@/lib/observability/rateLimit";
import { newTraceContext, traceparent, startSpan, registerExporter } from "@/lib/observability/otel";

describe("token bucket rate limiter", () => {
  it("starts at capacity", () => {
    const b = createTokenBucket({ capacity: 5, refillPerSecond: 1 });
    expect(b.available()).toBe(5);
  });

  it("drains on take()", () => {
    const b = createTokenBucket({ capacity: 3, refillPerSecond: 0 });
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
  });

  it("refills over time", async () => {
    vi.useFakeTimers();
    const b = createTokenBucket({ capacity: 10, refillPerSecond: 10 });
    for (let i = 0; i < 10; i++) b.take();
    expect(b.available()).toBeLessThan(1);
    vi.advanceTimersByTime(500); // 0.5s -> +5 tokens
    expect(b.available()).toBeGreaterThanOrEqual(4);
    vi.useRealTimers();
  });
});

describe("otel", () => {
  it("newTraceContext produces W3C-valid ids", () => {
    const ctx = newTraceContext();
    expect(ctx.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(ctx.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(traceparent(ctx)).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it("startSpan delivers to registered exporters on end()", () => {
    const received: unknown[] = [];
    const off = registerExporter((s) => received.push(s));
    const s = startSpan("db.query", { "db.table": "widgets" });
    s.setAttribute("db.operation", "list");
    s.end();
    expect(received.length).toBe(1);
    off();
  });

  it("startSpan records exceptions", () => {
    const seen: unknown[] = [];
    const off = registerExporter((s) => seen.push(s));
    const s = startSpan("db.query");
    s.recordException(new Error("boom"));
    s.end();
    expect((seen[0] as { error?: string }).error).toBe("boom");
    off();
  });
});
