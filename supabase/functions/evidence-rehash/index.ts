// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.4 — Nightly evidence re-hash worker.
//
// Drains `public.evidence_rehash_queue`, downloads each Storage object,
// recomputes SHA-256, compares to the authoritative `sha256_hex` recorded at
// upload, writes an append-only custody event (`rehash_ok` / `rehash_failed`)
// via `evidence_append_custody_event`, and updates the artifact's
// `last_verified_at` / `last_verified_ok` fields.
//
// Security:
//   - Requires `X-Cron-Secret` header matching CRON_SECRET env.
//   - Uses service_role client — custody RPC runs SECURITY DEFINER so chain
//     stays intact.
//   - Never trusts the queue row's recorded hash; always reads artifact.
//
// Scheduling: wire via Supabase Cron / GitHub Actions nightly (02:00 UTC).

// @ts-expect-error runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// eslint-disable-next-line
declare const Deno: { env: { get(k: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const BATCH_LIMIT = Number(Deno.env.get("REHASH_BATCH_LIMIT") ?? "100");
const MAX_DURATION_MS = Number(Deno.env.get("REHASH_MAX_MS") ?? "240000");

interface QueueRow {
  id: string;
  org_id: string;
  artifact_id: string;
  storage_bucket: string;
  storage_path: string;
  sha256_hex: string;
  enqueued_at: string;
  attempts: number;
}

interface RehashResult {
  artifact_id: string;
  ok: boolean;
  reason: string | null;
  actual_hash: string | null;
}

async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function processOne(
  supabase: ReturnType<typeof createClient>,
  row: QueueRow,
): Promise<RehashResult> {
  const result: RehashResult = {
    artifact_id: row.artifact_id,
    ok: false,
    reason: null,
    actual_hash: null,
  };

  try {
    const dl = await supabase.storage
      .from(row.storage_bucket)
      .download(row.storage_path);
    if (dl.error || !dl.data) {
      result.reason = `storage_download_failed:${dl.error?.message ?? "no_data"}`;
      return result;
    }
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    const actual = await sha256HexOfBytes(buf);
    result.actual_hash = actual;
    result.ok = timingSafeEqualStr(actual, row.sha256_hex);
    if (!result.ok) result.reason = "hash_mismatch";
    return result;
  } catch (err) {
    result.reason = `exception:${String(err)}`;
    return result;
  }
}

async function recordOutcome(
  supabase: ReturnType<typeof createClient>,
  row: QueueRow,
  r: RehashResult,
): Promise<void> {
  const eventType = r.ok ? "rehash_ok" : "rehash_failed";
  const { error: rpcErr } = await supabase.rpc("evidence_append_custody_event", {
    p_artifact_id: row.artifact_id,
    p_org_id: row.org_id,
    p_event_type: eventType,
    p_observed_sha256: r.actual_hash,
    p_actor_kind: "system",
    p_actor_id: null,
    p_details: r.reason ? { reason: r.reason } : {},
  });
  if (rpcErr) {
    // Even if the append fails, surface the error; do NOT swallow — chain must
    // be preserved, and we prefer loud failure.
    // eslint-disable-next-line no-console
    throw new Error(`custody_append_failed:${rpcErr.message}`);
  }

  const { error: updErr } = await supabase
    .from("evidence_artifacts")
    .update({
      last_verified_at: new Date().toISOString(),
      last_verified_ok: r.ok,
    })
    .eq("id", row.artifact_id)
    .eq("org_id", row.org_id);
  if (updErr) throw new Error(`artifact_update_failed:${updErr.message}`);

  if (r.ok) {
    await supabase.from("evidence_rehash_queue").delete().eq("id", row.id);
  } else {
    await supabase
      .from("evidence_rehash_queue")
      .update({
        attempts: row.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        last_error: r.reason,
      })
      .eq("id", row.id);
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!CRON_SECRET || !timingSafeEqualStr(secret, CRON_SECRET)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const started = Date.now();
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("evidence_rehash_queue")
    .select(
      "id, org_id, artifact_id, storage_bucket, storage_path, sha256_hex, enqueued_at, attempts",
    )
    .order("enqueued_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return jsonResponse({ error: error.message }, 500);
  const queue = (rows ?? []) as QueueRow[];

  let ok = 0;
  let failed = 0;
  const failures: Array<{ artifact_id: string; reason: string | null }> = [];

  for (const row of queue) {
    if (Date.now() - started > MAX_DURATION_MS) break;
    const r = await processOne(supabase, row);
    try {
      await recordOutcome(supabase, row, r);
    } catch (err) {
      failed += 1;
      failures.push({ artifact_id: row.artifact_id, reason: String(err) });
      continue;
    }
    if (r.ok) ok += 1;
    else {
      failed += 1;
      failures.push({ artifact_id: row.artifact_id, reason: r.reason });
    }
  }

  return jsonResponse({
    processed: ok + failed,
    ok,
    failed,
    duration_ms: Date.now() - started,
    failures: failures.slice(0, 25),
  });
});
