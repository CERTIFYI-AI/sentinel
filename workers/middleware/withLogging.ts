/*
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
 *
 * WS0.6 — Edge request logger. JSON lines (pino-compatible shape).
 * Wraps a handler and emits one log line per request with latency,
 * status, trace id. Never throws. Never leaks bodies.
 */

export interface LogRecord {
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
  method: string;
  path: string;
  status: number;
  latency_ms: number;
  trace_id: string;
}

export function genTraceId(): string {
  // 16-byte random, hex-encoded. Matches OTEL trace_id length/format.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function withLogging(
  handler: (req: Request, traceId: string) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async function logged(req) {
    const trace_id = req.headers.get("x-trace-id") ?? genTraceId();
    const start = Date.now();
    const url = new URL(req.url);
    let resp: Response;
    let level: LogRecord["level"] = "info";
    try {
      resp = await handler(req, trace_id);
      if (resp.status >= 500) level = "error";
      else if (resp.status >= 400) level = "warn";
    } catch (err) {
      level = "error";
      resp = new Response(
        JSON.stringify({ error: "internal" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
      // fall through to logging
      void err;
    }
    const rec: LogRecord = {
      ts: new Date().toISOString(),
      level,
      msg: "http_request",
      method: req.method,
      path: url.pathname,
      status: resp.status,
      latency_ms: Date.now() - start,
      trace_id,
    };
    // Workers console is captured by Cloudflare and shipped to the
    // logpush destination. Use .log for info, .error for warn+error so
    // alerts fire on the right shelf.
    if (level === "info") console.log(JSON.stringify(rec));
    else console.error(JSON.stringify(rec));

    // Propagate the trace id back to the client.
    const headers = new Headers(resp.headers);
    headers.set("x-trace-id", trace_id);
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  };
}
