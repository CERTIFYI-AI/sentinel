// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// We never hard-import @sentry/browser — that would hoist a ~80 KB
// dependency into every page load. Instead, the SDK is loaded
// dynamically at runtime, gated by VITE_SENTRY_DSN. In development it
// is a no-op.

interface SentryLike {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, hint?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: string) => void;
  setUser: (user: { id?: string; org_id?: string } | null) => void;
  addBreadcrumb: (crumb: Record<string, unknown>) => void;
}

let client: SentryLike | null = null;
let initPromise: Promise<SentryLike | null> | null = null;

async function resolveSentry(): Promise<SentryLike | null> {
  if (client) return client;
  if (initPromise) return initPromise;

  const dsn = (import.meta.env as Record<string, string | undefined>).VITE_SENTRY_DSN;
  if (!dsn) return null;

  initPromise = (async () => {
    try {
      // Dynamic import so the SDK only costs bytes if the DSN is set.
      // Module specifier is computed to avoid a compile-time resolution
      // requirement; the package is optional in the devDeps tree.
      const spec = "@sentry/browser";
      const mod = (await import(/* @vite-ignore */ spec)) as unknown as SentryLike;
      mod.init({
        dsn,
        environment: (import.meta.env as Record<string, string | undefined>).MODE,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: 1.0,
      });
      client = mod;
      return mod;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

export async function captureException(err: unknown, hint?: Record<string, unknown>): Promise<void> {
  const s = await resolveSentry();
  if (s) s.captureException(err, hint);
}

export async function captureMessage(msg: string, level: "info" | "warning" | "error" = "info"): Promise<void> {
  const s = await resolveSentry();
  if (s) s.captureMessage(msg, level);
}

export async function identify(user: { id?: string; org_id?: string } | null): Promise<void> {
  const s = await resolveSentry();
  if (s) s.setUser(user);
}

export async function breadcrumb(data: Record<string, unknown>): Promise<void> {
  const s = await resolveSentry();
  if (s) s.addBreadcrumb(data);
}
