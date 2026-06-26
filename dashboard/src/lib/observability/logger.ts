// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// dashboard code. In production it forwards to a Workers collector
// endpoint (configured via VITE_LOG_ENDPOINT); in tests / dev it's a
// no-op unless VITE_LOG_CONSOLE=1.

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEvent {
  readonly ts: string;
  readonly level: LogLevel;
  readonly msg: string;
  readonly ctx?: Record<string, unknown>;
}

function envFlag(key: string): boolean {
  try {
    // Vite exposes env via import.meta.env.
    return (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[key] === "1"
    );
  } catch {
    return false;
  }
}

function envStr(key: string): string | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[key];
  } catch {
    return undefined;
  }
}

function emit(event: LogEvent): void {
  // Dev / test: pipe to console only if explicitly enabled.
  if (envFlag("VITE_LOG_CONSOLE")) {
    // eslint-disable-next-line no-console -- sanctioned dev-only output
    const fn = (globalThis.console as Console)[event.level] ?? console.log;
    fn.call(globalThis.console, event.msg, event.ctx ?? {});
  }
  const endpoint = envStr("VITE_LOG_ENDPOINT");
  if (endpoint) {
    // Fire-and-forget. We swallow errors to avoid loop amplification.
    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // ignore
    }
  }
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: "debug", msg, ctx }),
  info: (msg: string, ctx?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: "info", msg, ctx }),
  warn: (msg: string, ctx?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: "warn", msg, ctx }),
  error: (msg: string, ctx?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: "error", msg, ctx }),
};
