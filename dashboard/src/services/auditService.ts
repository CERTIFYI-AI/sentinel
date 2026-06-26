// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Replaces the legacy @ts-nocheck auditLogService.ts. Read-only:
// mutations go through the Worker's withAudit() path. Delete/update
// are impossible at the DB level (append-only RLS) so this module
// exposes only list/get/verify/export.

import { supabase } from "../lib/supabase";
import type { AppError } from "../types/errors";

export interface AuditEntry {
  readonly id: string;
  readonly org_id: string;
  readonly sequence_no: number;
  readonly occurred_at: string;
  readonly actor_id: string | null;
  readonly actor_type: string;
  readonly action: string;
  readonly resource_type: string;
  readonly resource_id: string | null;
  readonly outcome: "success" | "failure" | "denied";
  readonly severity: string;
  readonly metadata: Record<string, unknown>;
  readonly previous_hash: string | null;
  readonly row_hash: string;
  readonly ip_address: string | null;
  readonly user_agent: string | null;
  readonly trace_id: string | null;
  readonly created_at: string;
}

export interface AuditListParams {
  readonly limit?: number;
  readonly cursor?: { sequence_no: number } | null;
  readonly action?: string;
  readonly resourceType?: string;
  readonly actorId?: string;
  readonly outcome?: AuditEntry["outcome"];
  readonly from?: string; // ISO
  readonly to?: string;
}

export interface AuditPage {
  readonly items: readonly AuditEntry[];
  readonly nextCursor: { sequence_no: number } | null;
}

/**
 * List audit entries with cursor pagination. `sequence_no` is monotonic
 * per org so it's the natural cursor (stable under inserts).
 */
export async function listAuditEntries(
  params: AuditListParams = {},
): Promise<AuditPage> {
  const limit = Math.min(params.limit ?? 50, 500);
  let q = supabase
    .from("audit_log")
    .select("*")
    .order("sequence_no", { ascending: false })
    .limit(limit + 1);

  if (params.cursor) q = q.lt("sequence_no", params.cursor.sequence_no);
  if (params.action) q = q.eq("action", params.action);
  if (params.resourceType) q = q.eq("resource_type", params.resourceType);
  if (params.actorId) q = q.eq("actor_id", params.actorId);
  if (params.outcome) q = q.eq("outcome", params.outcome);
  if (params.from) q = q.gte("occurred_at", params.from);
  if (params.to) q = q.lte("occurred_at", params.to);

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as unknown as AuditEntry[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? { sequence_no: last.sequence_no } : null;
  return { items, nextCursor };
}

/**
 * Ask Postgres to verify a chain range. The verifier runs under
 * service_role via a SECURITY DEFINER function so clients with only
 * select rights can still call it.
 */
export async function verifyChain(
  orgId: string,
  fromSeq?: number,
  toSeq?: number,
): Promise<{ ok: boolean; failedAtSequence: number | null; failedReason: string | null }> {
  const { data, error } = await supabase.rpc("audit_log_verify_chain", {
    p_org_id: orgId,
    p_from_seq: fromSeq ?? null,
    p_to_seq: toSeq ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; failed_at_sequence: number | null; failed_reason: string | null }
    | null;
  return {
    ok: row?.ok ?? false,
    failedAtSequence: row?.failed_at_sequence ?? null,
    failedReason: row?.failed_reason ?? null,
  };
}

// --------------------------------------------------------------------------
// Exporters — CSV / JSON / NDJSON. PDF is produced by a server-side
// worker route (not shipped in-browser). Each exporter streams over the
// paged list to stay below memory limits.
// --------------------------------------------------------------------------

export type ExportFormat = "csv" | "json" | "ndjson";

const CSV_COLS = [
  "id",
  "sequence_no",
  "occurred_at",
  "actor_id",
  "actor_type",
  "action",
  "resource_type",
  "resource_id",
  "outcome",
  "severity",
  "row_hash",
] as const;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: readonly AuditEntry[]): string {
  const header = CSV_COLS.join(",");
  const lines = rows.map((r) =>
    CSV_COLS.map((c) => csvEscape((r as unknown as Record<string, unknown>)[c])).join(","),
  );
  return [header, ...lines].join("\n");
}

export function toNdjson(rows: readonly AuditEntry[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

export function toJson(rows: readonly AuditEntry[]): string {
  return JSON.stringify(rows, null, 2);
}

export function formatExport(
  rows: readonly AuditEntry[],
  fmt: ExportFormat,
): { body: string; mime: string; ext: string } {
  switch (fmt) {
    case "csv":
      return { body: toCsv(rows), mime: "text/csv; charset=utf-8", ext: "csv" };
    case "json":
      return { body: toJson(rows), mime: "application/json", ext: "json" };
    case "ndjson":
      return { body: toNdjson(rows), mime: "application/x-ndjson", ext: "ndjson" };
  }
}
