// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Read service for the live, org-scoped `audit_log` table
// (supabase/migrations/006_core.sql):
//   id uuid, org_id uuid (default current_user_org_id()), actor_id, actor_name,
//   actor_role, module, entity_type, entity_id uuid, entity_name, action,
//   old_values jsonb, new_values jsonb, created_at
//
// RLS: select is org-scoped; insert requires org match; update/delete are not
// granted — the trail is append-only. All writes flow through
// lib/auditLogger.logAction(); this module is read-only.
//
// NOTE: services/auditService.ts targets a different (hash-chained) audit
// schema that is not deployed to this project — do not use it for reads.

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type AuditLogRecord = {
  id: string;
  orgId?: string | null;
  actorId?: string | null;
  actorName: string;
  actorRole?: string | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt: string;
};

// audit_log carries two writer shapes: lib/auditLogger fills module /
// entity_type / entity_id, while audit_client_event rows fill action /
// resource_type / resource_id instead. Prefer the classic columns and fall
// back to the client-event ones so both shapes render with a real module and
// entity instead of 'general' / '—'.
function mapRow(row: any): AuditLogRecord {
  const action: string = row.action ?? '';
  return {
    id: row.id,
    orgId: row.org_id ?? null,
    actorId: row.actor_id ?? null,
    actorName: row.actor_name ?? 'User',
    actorRole: row.actor_role ?? null,
    module: row.module ?? (action.includes('.') ? action.split('.')[0] : ''),
    entityType: row.entity_type ?? row.resource_type ?? '',
    entityId: row.entity_id ?? row.resource_id ?? null,
    // audit_client_event rows carry the human-readable name in
    // metadata.entity_name (withAudit's 6th param) — fall back to it so the
    // trail shows a real label instead of "Unavailable".
    entityName: row.entity_name
      ?? (typeof row.metadata?.entity_name === 'string' ? row.metadata.entity_name : null),
    action,
    oldValues: row.old_values ?? null,
    newValues: row.new_values ?? null,
    createdAt: row.created_at,
  };
}

export interface AuditLogFilters {
  module?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string; // ISO timestamp lower bound on created_at
}

/** Reads throw on failure so callers render a real error state. */
export async function fetchAuditLogs(
  limit = 500,
  filters: AuditLogFilters = {},
): Promise<AuditLogRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let q = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filters.module) q = q.eq('module', filters.module);
  if (filters.action) q = q.eq('action', filters.action);
  if (filters.entityType) q = q.eq('entity_type', filters.entityType);
  if (filters.entityId) q = q.eq('entity_id', filters.entityId);
  if (filters.from) q = q.gte('created_at', filters.from);
  const { data, error } = await q;
  if (error) {
    console.warn('[auditLogService] fetch:', error.message);
    throw new Error(error.message);
  }
  return (data ?? []).map(mapRow);
}
