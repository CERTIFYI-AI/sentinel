// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS6 — Cloudflare Worker Durable Object rate limiter.
//
// Authoritative server-side rate limits per (org_id, endpoint).
// Client-side buckets are a courtesy; this is the gate. Limits:
//
//   list        100 req/minute per user  (per-user bucket)
//   mutation     30 req/minute per user
//   export        5 req/minute per org   (per-org bucket, expensive)
//
// Backed by a Durable Object so tokens are consistent across colos.

export interface Env {
  RATE_LIMITER: DurableObjectNamespace;
}

export class RateLimiter {
  private state: DurableObjectState;
  private tokens: Map<string, { tokens: number; last: number }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.tokens = new Map();
    // Reference state storage to satisfy tsc unused checks
    void this.state.storage;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") ?? "default";
    const capacity = Number(url.searchParams.get("capacity") ?? "30");
    const refillPerSecond = Number(url.searchParams.get("refill") ?? "0.5");
    const cost = Number(url.searchParams.get("cost") ?? "1");

    let bucket = this.tokens.get(key);
    if (!bucket) bucket = { tokens: capacity, last: Date.now() };

    const now = Date.now();
    const elapsed = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
    bucket.last = now;

    const allowed = bucket.tokens >= cost;
    if (allowed) bucket.tokens -= cost;
    this.tokens.set(key, bucket);

    return new Response(
      JSON.stringify({
        allowed,
        remaining: Math.floor(bucket.tokens),
        retryAfter: allowed ? 0 : Math.ceil((cost - bucket.tokens) / refillPerSecond),
      }),
      {
        status: allowed ? 200 : 429,
        headers: {
          "content-type": "application/json",
          "x-rate-limit-remaining": String(Math.floor(bucket.tokens)),
          ...(allowed ? {} : { "retry-after": String(Math.ceil((cost - bucket.tokens) / refillPerSecond)) }),
        },
      }
    );
  }
}

/**
 * Helper for the gateway Worker. Calls the Durable Object and returns
 * a 429 Response with appropriate headers if the caller is over limit.
 */
export async function enforceRateLimit(
  env: Env,
  key: string,
  opts: { capacity: number; refillPerSecond: number; cost?: number }
): Promise<{ allowed: boolean; retryAfter: number; remaining: number }> {
  const id = env.RATE_LIMITER.idFromName(key);
  const stub = env.RATE_LIMITER.get(id);
  const url = new URL("https://rl/");
  url.searchParams.set("key", key);
  url.searchParams.set("capacity", String(opts.capacity));
  url.searchParams.set("refill", String(opts.refillPerSecond));
  url.searchParams.set("cost", String(opts.cost ?? 1));
  const resp = await stub.fetch(url.toString());
  return (await resp.json()) as { allowed: boolean; retryAfter: number; remaining: number };
}

// Durable Object types (subset; keep in sync with workers-types).
type DurableObjectState = {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
  };
};
type DurableObjectNamespace = {
  idFromName(name: string): { toString(): string };
  get(id: { toString(): string }): { fetch(url: string): Promise<Response> };
};
