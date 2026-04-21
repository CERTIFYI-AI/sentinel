// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// DEPRECATED — maintained only for legacy callers. New code must use
// `./auditService` which is typed, read-only, and cursor-paginated.
// The mutating helpers below are now no-ops: the DB denies UPDATE/DELETE
// at the RLS layer and inserts must go through the Worker's withAudit()
// path.

import { listAuditEntries, type AuditEntry } from "./auditService";

export type { AuditEntry };

export async function fetchAllAuditEntrys(limit = 200): Promise<readonly AuditEntry[]> {
  const { items } = await listAuditEntries({ limit });
  return items;
}

// Legacy aliases. Kept so existing imports compile; they now route to
// the read-only typed service.
export const fetchAuditEntrys = fetchAllAuditEntrys;
export function fetchAuditLogs(limit = 200): Promise<readonly AuditEntry[]> {
  return fetchAllAuditEntrys(limit);
}

// Mutations are forbidden by RLS. These shims exist so old imports
// don't crash builds; they resolve to the input without writing.
export async function upsertAuditEntry<T>(record: T): Promise<T> {
  return record;
}
export const saveAuditEntry = upsertAuditEntry;

/** Delete is explicitly a no-op. */
export async function deleteAuditEntry(_id: string): Promise<false> {
  return false;
}
