/**
 * Production-safe logger utility.
 *
 * - `debug` / `log` (info-level) are dev-only, to avoid leaking noisy
 *   internals via the browser console in production.
 * - `warn` / `error` ALWAYS emit, in every mode. Suppressing them in
 *   production blackholed real failures (auth errors, audit-trail outages)
 *   and made incidents undiagnosable from the field.
 * - An optional error sink (wired in main.tsx when VITE_SENTRY_DSN is set)
 *   forwards `error` calls to observability without adding a hard dependency.
 */
const isDev = import.meta.env.DEV;

type ErrorSink = (...args: unknown[]) => void;
let errorSink: ErrorSink | null = null;

/** Register a sink that receives every logger.error call (e.g. Sentry). */
export function setLoggerErrorSink(sink: ErrorSink | null): void {
  errorSink = sink;
}

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
  warn: (...args: unknown[]) => { console.warn(...args); },
  error: (...args: unknown[]) => {
    console.error(...args);
    if (errorSink) {
      try { errorSink(...args); } catch { /* observability must never break the app */ }
    }
  },
};

export default logger;
