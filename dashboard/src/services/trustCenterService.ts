// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Trust center configuration (`trust_center_config`, one row per org) — the
// org's AI transparency page: sections with independent visibility toggles,
// compliance badges (curated catalog, honestly labelled when not backed by a
// framework record), resources bound to real documents / published
// transparency reports, subprocessors drawn from the vendor registry, a live
// published-policies section, and a contact block. Org-scoped via RLS; writes
// throw. published_at records the FIRST draft→published transition and is
// preserved across republishes and unpublishes.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export interface TrustBadge {
  key: string
  label: string
  enabled: boolean
  /**
   * True only when the claim is backed by a conformity/framework record.
   * Unverified badges render with an explicit "self-declared" label — the
   * page never implies third-party attestation it does not have.
   */
  verified?: boolean
}

/** Curated badge catalog — the only badges that can be added. */
export const BADGE_CATALOG: { key: string; label: string; frameworkMatch: RegExp }[] = [
  { key: 'iso-42001', label: 'ISO/IEC 42001', frameworkMatch: /42001/i },
  { key: 'eu-ai-act-conformity', label: 'EU AI Act Conformity', frameworkMatch: /EU AI Act/i },
  { key: 'soc2', label: 'SOC 2', frameworkMatch: /SOC\s*2/i },
  { key: 'iso-27001', label: 'ISO 27001', frameworkMatch: /27001/i },
]

export type TrustResourceKind = 'pdf' | 'page' | 'link' | 'document' | 'transparency_report'

export interface TrustResource {
  id: string
  title: string
  kind: TrustResourceKind
  /** Plain URL for pdf/page/link resources. */
  uri: string
  /**
   * For kind 'document' | 'transparency_report': the bound record's uuid
   * (documents.id / transparency_reports.id). Title and link resolve at
   * render time from the record — "Unavailable" when unresolvable.
   */
  refId?: string
}

export interface TrustSubprocessorExtra { name: string; purpose?: string; location?: string; website?: string }

export interface TrustCenterDoc {
  info: { orgName: string; tagline?: string; heroStatement?: string }
  intro: { visible: boolean; body?: string }
  company: { visible: boolean; body?: string }
  badges: { visible: boolean; items: TrustBadge[] }
  resources: { visible: boolean; items: TrustResource[] }
  subprocessors: { visible: boolean; vendorIds: string[]; extra: TrustSubprocessorExtra[] }
  /** Published-policy visibility: the preview lists real published policies live. */
  policies: { visible: boolean }
  contact: { visible: boolean; email?: string; termsNote?: string }
}

export interface TrustCenterConfig {
  doc: TrustCenterDoc
  published: boolean
  publishedAt?: string | null
  updatedAt?: string
}

export const EMPTY_TRUST_DOC: TrustCenterDoc = {
  info: { orgName: '' },
  intro: { visible: true },
  company: { visible: false },
  badges: { visible: true, items: [] },
  resources: { visible: true, items: [] },
  subprocessors: { visible: true, vendorIds: [], extra: [] },
  policies: { visible: false },
  contact: { visible: true },
}

/** Tolerant normalization so a partial stored doc never crashes the editor. */
function normalizeDoc(d: any): TrustCenterDoc {
  return {
    info: { orgName: d?.info?.orgName ?? '', tagline: d?.info?.tagline, heroStatement: d?.info?.heroStatement },
    intro: { visible: d?.intro?.visible ?? true, body: d?.intro?.body },
    company: { visible: d?.company?.visible ?? false, body: d?.company?.body },
    badges: { visible: d?.badges?.visible ?? true, items: Array.isArray(d?.badges?.items) ? d.badges.items : [] },
    resources: { visible: d?.resources?.visible ?? true, items: Array.isArray(d?.resources?.items) ? d.resources.items : [] },
    subprocessors: {
      visible: d?.subprocessors?.visible ?? true,
      vendorIds: Array.isArray(d?.subprocessors?.vendorIds) ? d.subprocessors.vendorIds : [],
      extra: Array.isArray(d?.subprocessors?.extra) ? d.subprocessors.extra : [],
    },
    policies: { visible: d?.policies?.visible ?? false },
    contact: { visible: d?.contact?.visible ?? true, email: d?.contact?.email, termsNote: d?.contact?.termsNote },
  }
}

export async function fetchTrustCenter(): Promise<TrustCenterConfig | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase.from('trust_center_config').select('*').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    doc: normalizeDoc(data.doc),
    published: !!data.published,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
  }
}

/** Upsert the org's single config row (org_id fills in DB-side). */
export async function saveTrustCenter(doc: TrustCenterDoc, published: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data: existing, error: readErr } = await supabase
    .from('trust_center_config').select('org_id, published, published_at').maybeSingle()
  if (readErr) throw new Error(readErr.message)
  // published_at is the FIRST publish timestamp: set it only on the
  // draft→published transition, and preserve it across saves, republishes
  // and unpublishes — the historical record of when the page first went live.
  const publishedAt = existing?.published_at
    ?? (published ? new Date().toISOString() : null)
  const payload = {
    doc,
    published,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  }
  const q = existing
    ? supabase.from('trust_center_config').update(payload).eq('org_id', existing.org_id)
    : supabase.from('trust_center_config').insert(payload)
  const { error } = await q
  if (error) throw new Error(error.message)
  const transition = published && !existing?.published ? 'publish'
    : !published && existing?.published ? 'unpublish'
    : existing ? 'update' : 'create'
  void logAction({ module: 'trust-center', entityType: 'trust_center_config', entityId: 'org', action: transition })
}
