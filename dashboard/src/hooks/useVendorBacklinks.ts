// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// useVendorBacklinks — reverse-interlink footprint of one vendor across the
// supply-chain cluster (AIBOM records, attestations, provenance nodes) and the
// risk & security spine (risks, incidents, security threats), so the vendor
// detail page can see what points at it. Before this hook the vendor was a
// write-only hub: eleven modules referenced a vendor and the vendor record
// could reach none of them back.
//
// Mirrors useModelBacklinks exactly: every source is queried independently and
// tolerates failure — a source whose query errors reports `count: null`
// ("unavailable") instead of throwing the whole hook, so one missing table
// never blanks the rest of the panel. Counts and items come straight from the
// tenant-scoped tables/views (RLS applies); nothing is invented client-side.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BacklinkItem, BacklinkSource } from './useModelBacklinks';

export interface VendorBacklinks {
  aibomRecords: BacklinkSource;
  attestations: BacklinkSource;
  provenanceNodes: BacklinkSource;
  risks: BacklinkSource;
  incidents: BacklinkSource;
  securityThreats: BacklinkSource;
}

const UNAVAILABLE: BacklinkSource = { count: null, items: [] };

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);

/** Run one source query; a thrown/errored query resolves to `count: null`. */
async function safeSource(
  run: () => PromiseLike<{ data: Row[] | null; count: number | null; error: unknown }>,
  map: (row: Row) => BacklinkItem,
): Promise<BacklinkSource> {
  try {
    const { data, count, error } = await run();
    if (error) return UNAVAILABLE;
    const rows = data ?? [];
    return { count: count ?? rows.length, items: rows.map(map) };
  } catch {
    return UNAVAILABLE;
  }
}

async function fetchVendorBacklinks(vendorId: string): Promise<VendorBacklinks> {
  const [
    aibomRecords, attestations, provenanceNodes,
    risks, incidents, securityThreats,
  ] = await Promise.all([
    // aibom_records.vendor_id is uuid.
    safeSource(
      () => supabase.from('aibom_records')
        .select('id,aibom_ref,model_version,status,verification_status', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('generated_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: str(r.aibom_ref),
        title: str(r.model_version) ? `AIBOM ${str(r.model_version)}` : 'AI bill of materials',
        severity: null,
        status: str(r.status),
        // Verification is never implied: an unverified record says so here.
        note: str(r.verification_status),
      }),
    ),
    // The status VIEW, not the base table — validity is the derived value
    // computed from revoked_at/valid_until, never an authored status literal.
    safeSource(
      () => supabase.from('supply_chain_attestation_status')
        .select('id,attestation_ref,title,attestation_type,derived_validity', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('issued_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: str(r.attestation_ref),
        title: str(r.title) ?? str(r.attestation_type) ?? 'Attestation',
        severity: null,
        status: str(r.derived_validity),
        note: str(r.attestation_type),
      }),
    ),
    // provenance_nodes.vendor_id is uuid.
    safeSource(
      () => supabase.from('provenance_nodes')
        .select('id,label,node_type,verification_status', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: null,
        title: str(r.label) ?? 'Provenance node',
        severity: null,
        status: str(r.verification_status),
        note: str(r.node_type),
      }),
    ),
    // risks.linked_vendor_ids is uuid[] — array containment on the one id-space.
    safeSource(
      () => supabase.from('risks')
        .select('id,risk_id,title', { count: 'exact' })
        .contains('linked_vendor_ids', [vendorId])
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: str(r.risk_id),
        title: str(r.title) ?? 'Untitled risk',
        severity: null,
        status: null,
        note: null,
      }),
    ),
    // incidents.vendor_id is uuid.
    safeSource(
      () => supabase.from('incidents')
        .select('id,incident_id,title,severity,status', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: str(r.incident_id),
        title: str(r.title) ?? 'Untitled incident',
        severity: str(r.severity),
        status: str(r.status),
        note: null,
      }),
    ),
    // security_threats.vendor_id is uuid.
    safeSource(
      () => supabase.from('security_threats')
        .select('id,threat_id,title,severity,status', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(3),
      (r: Row): BacklinkItem => ({
        id: String(r.id),
        ref: str(r.threat_id),
        title: str(r.title) ?? 'Untitled threat',
        severity: str(r.severity),
        status: str(r.status),
        note: null,
      }),
    ),
  ]);

  return { aibomRecords, attestations, provenanceNodes, risks, incidents, securityThreats };
}

export function useVendorBacklinks(vendorId: string | undefined) {
  return useQuery<VendorBacklinks>({
    queryKey: ['vendor-backlinks', vendorId],
    queryFn: () => fetchVendorBacklinks(vendorId as string),
    enabled: !!vendorId,
    staleTime: 60_000,
  });
}
