// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// frameworkCatalogService — read access to `public.framework_controls`, the
// authoritative, org-scoped catalog of each framework's *published* controls
// (what the framework requires). This is reference material, distinct from the
// org's implementation state, which lives in the `controls` register. The two
// are interlinked by the pure matchers below (framework resolution + clause
// citation), so a catalog control can surface the org controls that implement
// it, and an org control can surface the catalog entry it satisfies.
//
// Reads only — the catalog rows are seeded by migrations, never written here.
// A real query failure THROWS so callers render a true error state; it never
// resolves to a fake-empty catalog (the safeSource discipline: an error
// surfaces, it does not masquerade as "no controls").

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** One published control from a framework's authoritative catalog. */
export interface CatalogControl {
  id: string
  frameworkId: string | null
  controlRef: string
  domain: string | null
  title: string
  description: string | null
  controlType: string | null
  priority: string | null
  status: string | null
  owner: string | null
  evidenceCount: number | null
  maturityLevel: number | null
  lastAssessed: string | null
}

/** Minimal shape needed to resolve an org control to a framework. */
export interface FrameworkIdentity {
  id: string
  name?: string | null
  code?: string | null
  shortName?: string | null
}

const mapCatalogControl = (r: Record<string, any>): CatalogControl => ({
  id: String(r.id),
  frameworkId: r.framework_id ?? null,
  controlRef: r.control_ref ?? '',
  domain: r.domain ?? null,
  title: r.title ?? '',
  description: r.description ?? null,
  controlType: r.control_type ?? null,
  priority: r.priority ?? null,
  status: r.status ?? null,
  owner: r.owner ?? null,
  evidenceCount: r.evidence_count ?? null,
  maturityLevel: r.maturity_level ?? null,
  lastAssessed: r.last_assessed ?? null,
})

/**
 * Fetch a framework's published catalog controls (org-scoped by RLS), ordered
 * by domain then control_ref. Throws on a real query failure so the caller
 * shows an error state — never a fake-empty catalog.
 */
export async function fetchFrameworkCatalog(frameworkId: string): Promise<CatalogControl[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('framework_controls')
    .select(
      'id, framework_id, control_ref, domain, title, description, control_type, priority, status, owner, evidence_count, maturity_level, last_assessed',
    )
    .eq('framework_id', frameworkId)
    .order('domain', { ascending: true })
    .order('control_ref', { ascending: true })
  if (error) {
    console.warn('[frameworkCatalogService] fetch:', error.message)
    throw new Error(error.message)
  }
  return (data ?? []).map(mapCatalogControl)
}

// ── Pure interlink matchers (no I/O; safe to unit-test) ──────────────────────

const norm = (s?: string | null) => (s ?? '').toLowerCase().trim()
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Does an org control belong to this framework? Mirrors the Frameworks page
 * matcher: an explicit framework_id match wins; otherwise the control's
 * free-text `framework` label must equal the framework's name / short name /
 * code, tolerating a version suffix in either direction
 * ("ISO/IEC 42001" ↔ "ISO/IEC 42001:2023"). No fuzzy guessing beyond that.
 */
export function orgControlInFramework(
  c: { framework?: string | null; frameworkId?: string | null; framework_id?: string | null },
  fw: FrameworkIdentity,
): boolean {
  const fid = c.frameworkId ?? c.framework_id ?? null
  if (fid && fid === fw.id) return true
  const cf = norm(c.framework)
  if (!cf) return false
  const names = [norm(fw.name), norm(fw.shortName), norm(fw.code)].filter(Boolean)
  return names.some(
    (n) =>
      cf === n ||
      n.startsWith(`${cf}:`) || n.startsWith(`${cf} `) ||
      cf.startsWith(`${n}:`) || cf.startsWith(`${n} `),
  )
}

/**
 * Does a clause reference cite this catalog control_ref? The catalog ref
 * (e.g. "A.5.2", "Art. 10", "Clause 6.1") must appear as a whole token inside
 * the org control's clause text, with boundaries so "A.5.2" does not match
 * "A.5.24" and "Art. 10" does not match "Art. 100". Only a resolvable citation
 * counts — anything else is treated as "not yet implemented", never a guess.
 */
export function clauseCitesRef(clauseText: string | null | undefined, catalogRef: string): boolean {
  const ref = norm(catalogRef)
  const hay = norm(clauseText)
  if (!ref || !hay) return false
  const re = new RegExp(`(^|[^a-z0-9.])${escapeRe(ref)}([^a-z0-9.]|$)`)
  return re.test(hay)
}
