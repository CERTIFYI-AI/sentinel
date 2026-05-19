// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS6 — OpenTelemetry browser tracer (W3C Trace Context).
//
// A minimal, dependency-free tracer that produces W3C-compliant
// traceparent headers for outgoing supabase / Worker calls. Swappable
// for @opentelemetry/sdk-trace-web when the team is ready to ship the
// full SDK — the API surface is intentionally congruent.

export interface SpanContext {
  traceId: string; // 32 hex chars
  spanId: string; // 16 hex chars
  sampled: boolean;
}

function hex(len: number): string {
  const bytes = new Uint8Array(len / 2);
  (globalThis.crypto ?? (globalThis as { crypto: Crypto }).crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newTraceContext(): SpanContext {
  return {
    traceId: hex(32),
    spanId: hex(16),
    sampled: true,
  };
}

export function traceparent(ctx: SpanContext): string {
  // Version-00 traceparent per W3C Trace Context.
  return `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? "01" : "00"}`;
}

export interface SpanData {
  name: string;
  startedAt: number;
  endedAt?: number;
  attributes: Record<string, string | number | boolean>;
  error?: string;
}

export interface Span {
  ctx: SpanContext;
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(err: unknown): void;
  end(): void;
}

type Exporter = (span: SpanData & { ctx: SpanContext }) => void;
const exporters = new Set<Exporter>();

export function registerExporter(exp: Exporter): () => void {
  exporters.add(exp);
  return () => exporters.delete(exp);
}

export function startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): Span {
  const ctx = newTraceContext();
  const data: SpanData = {
    name,
    startedAt: Date.now(),
    attributes: { ...attributes },
  };
  let ended = false;
  return {
    ctx,
    setAttribute(key, value) {
      data.attributes[key] = value;
    },
    recordException(err) {
      data.error = err instanceof Error ? err.message : String(err);
    },
    end() {
      if (ended) return;
      ended = true;
      data.endedAt = Date.now();
      for (const e of exporters) {
        try {
          e({ ...data, ctx });
        } catch {
          // best-effort
        }
      }
    },
  };
}
