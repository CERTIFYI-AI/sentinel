// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS6 — Client-side token bucket rate limiter.
//
// Used to throttle UI-triggered bursts against the Supabase API
// (e.g. infinite-scroll fetches, accidental double-clicks). The server
// enforces the authoritative limits in the Cloudflare Worker; this
// bucket is a courteous client-side guard.

export interface TokenBucketOptions {
  capacity: number; // max tokens in bucket
  refillPerSecond: number; // tokens added per second
}

export interface TokenBucket {
  take(cost?: number): boolean;
  available(): number;
}

export function createTokenBucket(opts: TokenBucketOptions): TokenBucket {
  let tokens = opts.capacity;
  let last = Date.now();

  function refill(): void {
    const now = Date.now();
    const elapsed = (now - last) / 1000;
    if (elapsed <= 0) return;
    tokens = Math.min(opts.capacity, tokens + elapsed * opts.refillPerSecond);
    last = now;
  }

  return {
    take(cost = 1): boolean {
      refill();
      if (tokens >= cost) {
        tokens -= cost;
        return true;
      }
      return false;
    },
    available(): number {
      refill();
      return tokens;
    },
  };
}

// Shared buckets for common paths. Tuning lives here so UI code can
// import a stable handle.
export const globalBuckets = {
  list: createTokenBucket({ capacity: 30, refillPerSecond: 10 }),
  mutation: createTokenBucket({ capacity: 10, refillPerSecond: 2 }),
  export: createTokenBucket({ capacity: 3, refillPerSecond: 0.1 }),
};
