// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * Webhook delivery service.
 *
 * Contract:
 * - HMAC-SHA256 signature over (timestamp + "." + body) using the
 *   subscription's shared secret. Header: X-Sentinel-Signature: t=<ts>,v1=<hex>
 * - At-least-once delivery with exponential backoff:
 *   attempts 1..8 at 0s, 30s, 5m, 30m, 2h, 6h, 12h, 24h.
 * - Failed deliveries past the final attempt move to a dead-letter table.
 * - Receivers MUST respond 2xx within 10s to be considered delivered.
 */

export interface WebhookEvent {
  readonly id: string;
  readonly type: string;
  readonly org_id: string;
  readonly created_at: string; // ISO-8601 UTC
  readonly data: Record<string, unknown>;
}

export interface WebhookSubscription {
  readonly id: string;
  readonly org_id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly secret: string;
  readonly active: boolean;
}

export const RETRY_SCHEDULE_SECONDS = [
  0, 30, 300, 1_800, 7_200, 21_600, 43_200, 86_400,
] as const;

export const DELIVERY_TIMEOUT_MS = 10_000;

async function sign(
  timestamp: number,
  body: string,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${timestamp}.${body}`),
  );
  const bytes = new Uint8Array(mac);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildSignatureHeader(
  body: string,
  secret: string,
  nowMs: number = Date.now(),
): Promise<string> {
  const ts = Math.floor(nowMs / 1000);
  const v1 = await sign(ts, body, secret);
  return `t=${ts},v1=${v1}`;
}

export interface DeliveryAttempt {
  readonly ok: boolean;
  readonly status: number;
  readonly responseTimeMs: number;
  readonly error?: string;
}

export async function deliverOnce(
  sub: WebhookSubscription,
  event: WebhookEvent,
): Promise<DeliveryAttempt> {
  const body = JSON.stringify(event);
  const signature = await buildSignatureHeader(body, sub.secret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentinel-Signature": signature,
        "X-Sentinel-Event-Id": event.id,
        "X-Sentinel-Event-Type": event.type,
        "User-Agent": "Sentinel-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      responseTimeMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      responseTimeMs: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function nextRetryDelaySeconds(attempt: number): number | null {
  if (attempt < 0 || attempt >= RETRY_SCHEDULE_SECONDS.length) return null;
  return RETRY_SCHEDULE_SECONDS[attempt] ?? null;
}
