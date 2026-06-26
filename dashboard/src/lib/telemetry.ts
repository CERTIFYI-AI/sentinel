// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// Replaces ad-hoc `console.*` calls across the services layer. The sink
// is intentionally minimal here; WS6 wires it into Sentry + OTEL. In
// production the sink is a no-op unless `VITE_TELEMETRY_ENABLED` is
// set, so accidental log-lines never ship to end users.

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogRecord {
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
  ts: string;
}

const enabled: boolean =
  typeof import.meta !== "undefined" &&
  typeof import.meta.env !== "undefined" &&
  // Vite rewrites `import.meta.env.MODE` at build time; fall back safely.
  ((import.meta.env as Record<string, string | undefined>).VITE_TELEMETRY_ENABLED === "true" ||
    (import.meta.env as Record<string, string | undefined>).MODE === "development");

const listeners = new Set<(rec: LogRecord) => void>();

export function onTelemetry(listener: (rec: LogRecord) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const rec: LogRecord = { level, event, data, ts: new Date().toISOString() };
  // Fan out to subscribers (Sentry/OTEL sinks register here in WS6).
  for (const l of listeners) {
    try {
      l(rec);
    } catch {
      // Sinks are best-effort; never crash the caller.
    }
  }
  // Dev-only visibility — production builds gate this.
  if (enabled && typeof globalThis !== "undefined") {
    const g = globalThis as { console?: Console };
    const c = g.console;
    if (!c) return;
    const line = `[telemetry] ${level.toUpperCase()} ${event}${data ? " " + JSON.stringify(data) : ""}`;
    if (level === "error") c.error(line);
    else if (level === "warn") c.warn(line);
    else c.info(line);
  }
}

export const telemetry = {
  debug: (event: string, data?: Record<string, unknown>) => emit("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
