// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// The organisation record — the single source of truth for what this tenant is
// called.
//
// The org name is the most-shown string in the product: 28 pages put it in
// their subtitle, the board report prints it on every page, and the narrative
// engine writes it into prose an auditor reads. It used to come from a
// hardcoded default in a browser localStorage store, which meant every tenant
// saw the same demo company's name until somebody typed over it, and the value
// never left that one browser.
//
// `organizations` already carried every field Settings shows. This module
// reads and writes that row, under RLS: SELECT is scoped to the caller's own
// org (`ws02_org_self_read`), UPDATE additionally requires the
// `org.update` permission (`org_self_update`, migration 20260901000003) —
// renaming the organisation changes what every exported report says the
// company is called, so it is an administrative act, not a preference.
//
// Writes throw. A save that failed at the database must never look like it
// worked.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export interface Organization {
  /** The tenant id. Shown read-only in Settings; never editable. */
  id: string
  name: string
  domain: string | null
  industry: string | null
  companySize: string | null
  primaryContact: string | null
  timezone: string
  fiscalYearStart: string
  country: string | null
  createdAt: string | null
}

/** The editable subset. `id` is deliberately absent — a tenant cannot move. */
export type OrganizationPatch = Partial<
  Pick<Organization, 'name' | 'domain' | 'industry' | 'companySize'
    | 'primaryContact' | 'timezone' | 'fiscalYearStart' | 'country'>
>

function fromRow(r: Record<string, any>): Organization {
  return {
    id: r.id,
    name: r.name ?? '',
    domain: r.domain ?? null,
    industry: r.industry ?? null,
    // 006_core created `size`; 20260421000003 added `company_size`. Both
    // exist, and older rows carry the value in the first — read either rather
    // than showing a blank field over data that is present.
    companySize: r.company_size ?? r.size ?? null,
    primaryContact: r.primary_contact ?? null,
    timezone: r.timezone ?? 'UTC',
    fiscalYearStart: r.fiscal_year_start ?? 'January',
    country: r.country ?? null,
    createdAt: r.created_at ?? null,
  }
}

function toRow(p: OrganizationPatch): Record<string, any> {
  const row: Record<string, any> = {}
  if (p.name !== undefined) row.name = p.name
  if (p.domain !== undefined) row.domain = p.domain || null
  if (p.industry !== undefined) row.industry = p.industry || null
  if (p.companySize !== undefined) row.company_size = p.companySize || null
  if (p.primaryContact !== undefined) row.primary_contact = p.primaryContact || null
  if (p.timezone !== undefined) row.timezone = p.timezone
  if (p.fiscalYearStart !== undefined) row.fiscal_year_start = p.fiscalYearStart
  if (p.country !== undefined) row.country = p.country || null
  return row
}

/**
 * The caller's organisation, or null when there is none to read.
 *
 * RLS makes this at most one row, so no filter is needed and none is applied —
 * adding a client-side `.eq('id', …)` would imply the browser knows the tenant
 * boundary, which is exactly the assumption the policy exists to remove.
 *
 * Returns null rather than throwing when Supabase is not configured or the
 * account is not linked to an organisation: "no organisation" is a state the
 * UI must render honestly, not an error to retry.
 */
export async function fetchOrganization(): Promise<Organization | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

/**
 * Update the organisation record.
 *
 * Throws on failure — including the RLS refusal a user without `org.update`
 * gets — so the form shows a real error instead of a success the database
 * never saw. The audit entry carries a real actor, which the row itself cannot
 * (EU AI Act Art. 12).
 */
export async function updateOrganization(
  id: string,
  patch: OrganizationPatch,
  previous?: Organization,
): Promise<Organization> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot change organisation settings.')
  }
  const row = toRow(patch)
  if (Object.keys(row).length === 0) {
    throw new Error('Nothing to save.')
  }
  const { data, error } = await supabase
    .from('organizations')
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  // An UPDATE the policy refuses returns no error and no row. Reporting that
  // as success is precisely the fake-success failure mode; say what happened.
  if (!data) {
    throw new Error(
      'The change was not saved. Only an organisation administrator can edit these settings.',
    )
  }
  const updated = fromRow(data)
  await logAction({
    module: 'settings',
    entityType: 'organization',
    entityId: updated.id,
    entityName: updated.name,
    action: 'update',
    oldValues: previous
      ? Object.fromEntries(
        Object.keys(patch).map(k => [k, (previous as any)[k]]),
      )
      : undefined,
    newValues: patch,
  })
  return updated
}

/**
 * What to show where the organisation's name goes.
 *
 * An unresolved name renders as a neutral phrase, never as a blank subtitle
 * and never as a placeholder company. The platform genuinely does not know the
 * name until somebody sets it, and saying so is the honest rendering.
 */
export const UNNAMED_ORGANIZATION = 'Your organisation'

export function organizationDisplayName(org: Organization | null | undefined): string {
  const name = org?.name?.trim()
  return name || UNNAMED_ORGANIZATION
}
