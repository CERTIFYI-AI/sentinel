// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// useControlAssurance — the reverse-interlink footprint of one control across
// the assurance-bearing modules: Evidence Vault (`evidence.linked_controls`),
// Supply Chain attestations (`supply_chain_attestations.framework_control_ids`),
// Vendor Upload documents (`vendor_documents.satisfies_control_ids`) and the
// legacy `control_evidence` table. EvidenceVault already links evidence →
// control; this hook makes the control side of that edge visible, so a
// control's assurance is auditable from the control itself.
//
// Same contract as useModelBacklinks: every source is queried independently
// and tolerates failure — an errored query reports `count: null`
// ("Unavailable") instead of throwing the whole hook. Counts and items come
// straight from the tenant-scoped tables (RLS applies); nothing is invented
// client-side.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AssuranceItem {
  /** Row uuid (primary key) — used for per-record deep links. */
  id: string;
  /** Business reference (e.g. ATT-001, VDOC-2026-01) — may be absent. */
  ref: string | null;
  title: string;
  status: string | null;
  /** Extra display note (e.g. doc type, attestation type). */
  note: string | null;
}

export interface AssuranceSource {
  /** Total matching rows; null means the query for this source failed. */
  count: number | null;
  /** Up to 3 most recent matching rows. */
  items: AssuranceItem[];
}

export interface ControlAssurance {
  evidence: AssuranceSource;
  attestations: AssuranceSource;
  vendorDocuments: AssuranceSource;
  controlEvidence: AssuranceSource;
}

const UNAVAILABLE: AssuranceSource = { count: null, items: [] };

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);

/** Run one source query; a thrown/errored query resolves to `count: null`. */
async function safeSource(
  run: () => PromiseLike<{ data: Row[] | null; count: number | null; error: unknown }>,
  map: (row: Row) => AssuranceItem,
): Promise<AssuranceSource> {
  try {
    const { data, count, error } = await run();
    if (error) return UNAVAILABLE;
    const rows = data ?? [];
    return { count: count ?? rows.length, items: rows.map(map) };
  } catch {
    return UNAVAILABLE;
  }
}

const mapEvidenceRow = (r: Row): AssuranceItem => ({
  id: String(r.id),
  ref: null,
  title: str(r.title) ?? 'Untitled evidence',
  status: str(r.freshness_status),
  note: null,
});

/**
 * evidence.linked_controls is text[] of control uuids, so `.contains` matches
 * the uuid as a string. Some environments carry the column as jsonb, where
 * contains fails type-wise — fall back to a bounded client-side filter over
 * (id, title, linked_controls) instead of reporting the source unavailable.
 * (Same handling as useModelBacklinks's evidenceSource.)
 */
async function evidenceSource(controlId: string): Promise<AssuranceSource> {
  const primary = await safeSource(
    () => supabase.from('evidence')
      .select('id,title,freshness_status', { count: 'exact' })
      .contains('linked_controls', [controlId])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(3),
    mapEvidenceRow,
  );
  if (primary.count !== null) return primary;
  try {
    const { data, error } = await supabase.from('evidence')
      .select('id,title,freshness_status,linked_controls,is_deleted')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return UNAVAILABLE;
    const rows = (data ?? []).filter((r: Row) =>
      !r.is_deleted && Array.isArray(r.linked_controls) && (r.linked_controls as unknown[]).includes(controlId));
    return { count: rows.length, items: rows.slice(0, 3).map(mapEvidenceRow) };
  } catch {
    return UNAVAILABLE;
  }
}

async function fetchControlAssurance(controlId: string): Promise<ControlAssurance> {
  const [evidence, attestations, vendorDocuments, controlEvidence] = await Promise.all([
    evidenceSource(controlId),
    // framework_control_ids is text[] — the uuid is matched as a string.
    safeSource(
      () => supabase.from('supply_chain_attestations')
        .select('id,attestation_ref,title,name,attestation_type,verification_status', { count: 'exact' })
        .contains('framework_control_ids', [controlId])
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): AssuranceItem => ({
        id: String(r.id),
        ref: str(r.attestation_ref),
        title: str(r.title) ?? str(r.name) ?? 'Untitled attestation',
        status: str(r.verification_status),
        note: str(r.attestation_type),
      }),
    ),
    // satisfies_control_ids is text[] — the uuid is matched as a string.
    safeSource(
      () => supabase.from('vendor_documents')
        .select('id,document_ref,title,file_name,doc_type,status', { count: 'exact' })
        .contains('satisfies_control_ids', [controlId])
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): AssuranceItem => ({
        id: String(r.id),
        ref: str(r.document_ref),
        title: str(r.title) ?? str(r.file_name) ?? 'Untitled document',
        status: str(r.status),
        note: str(r.doc_type),
      }),
    ),
    // Legacy control_evidence rows (frameworks era). control_id is text, so
    // the uuid matches as a string where the table carries canonical ids.
    safeSource(
      () => supabase.from('control_evidence')
        .select('id,title,evidence_type,status', { count: 'exact' })
        .eq('control_id', controlId)
        .order('collected_at', { ascending: false })
        .limit(3),
      (r: Row): AssuranceItem => ({
        id: String(r.id),
        ref: null,
        title: str(r.title) ?? 'Untitled evidence',
        status: str(r.status),
        note: str(r.evidence_type),
      }),
    ),
  ]);

  return { evidence, attestations, vendorDocuments, controlEvidence };
}

export function useControlAssurance(controlId: string | undefined) {
  return useQuery<ControlAssurance>({
    queryKey: ['control-assurance', controlId],
    queryFn: () => fetchControlAssurance(controlId as string),
    enabled: !!controlId,
    staleTime: 60_000,
  });
}
