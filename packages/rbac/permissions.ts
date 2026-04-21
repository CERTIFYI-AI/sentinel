// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * Canonical permission catalog — the single source of truth.
 *
 * Shape of a permission string: `<resource>.<action>`.
 *  - resource: lowercase dot-separated path (e.g. `frameworks`, `risk.register`)
 *  - action:   one of the enum values in `PermissionAction`
 *  - wildcards: `<resource>.*` granted to a role means "any action on
 *    resource", and `*` granted to a role means "all permissions".
 *
 * Both the server-side Postgres `auth.has_permission(text)` function and
 * the browser-side `<Can>` component read this catalog directly, so a
 * typo-safe client identifier always maps to a string the database
 * recognises.
 *
 * When you add a new resource:
 *   1. Add a key to `RESOURCES` here.
 *   2. Add the per-role grant rows to `supabase/migrations/<ts>_ws03_rbac_grants_<resource>.sql`.
 *   3. Add a Gherkin test to `dashboard/src/lib/__tests__/rbac-catalog.test.ts`.
 */

export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "assign",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Resource identifiers. Keep these stable — every grant in
 * `rbac_permissions` is keyed to one of these strings.
 *
 * Grouped loosely by module so the catalog is grep-able.
 */
export const RESOURCES = {
  // --- platform ---
  audit: "audit",
  iam: "iam",
  mfa: "mfa",
  sso: "sso",
  report: "report",
  settings: "settings",
  // --- governance ---
  frameworks: "frameworks",
  controls: "controls",
  evidence: "evidence",
  policy: "policy",
  attestations: "attestations",
  // --- risk ---
  risk: "risk",
  incidents: "incidents",
  threats: "threats",
  forensics: "forensics",
  // --- privacy ---
  privacy: "privacy",
  dsr: "dsr",
  ropa: "ropa",
  dpia: "dpia",
  // --- AI governance ---
  ai_risk: "ai_risk",
  ai_impact: "ai_impact",
  ai_bias: "ai_bias",
  ai_red_team: "ai_red_team",
  ai_models: "ai_models",
  // --- vendor management ---
  vendors: "vendors",
  contracts: "contracts",
  // --- readonly meta ---
  read: "read",
  findings: "findings",
} as const;

export type ResourceKey = keyof typeof RESOURCES;
export type ResourceId = (typeof RESOURCES)[ResourceKey];

/**
 * Build a permission string from a (resource, action) pair.
 * Strongly-typed: TS prevents referencing resources / actions that
 * aren't in the catalog.
 */
export function perm(resource: ResourceId, action: PermissionAction): string {
  return `${resource}.${action}`;
}

/**
 * Matches the Postgres wildcard logic in `auth.has_permission`:
 *   - `*`              — matches anything.
 *   - `<resource>.*`   — matches any action on that resource.
 *   - exact match      — matches verbatim.
 *
 * Must be kept in lockstep with `auth.has_permission()` so server and
 * client agree on access decisions.
 */
export function permissionMatches(granted: string, required: string): boolean {
  if (granted === "*") return true;
  if (granted === required) return true;
  if (granted.endsWith(".*")) {
    const prefix = granted.slice(0, -1); // keep trailing dot
    return required.startsWith(prefix);
  }
  return false;
}

/**
 * Check whether a set of granted permissions authorises a single target.
 * Used by `<Can>` on the client; never by itself trusted on the server.
 */
export function hasPermission(
  grants: readonly string[],
  required: string,
): boolean {
  for (const g of grants) if (permissionMatches(g, required)) return true;
  return false;
}

/**
 * Canonical role identifiers, mirroring the `org_role_enum` in Postgres
 * migration `20260421_ws04_rbac_depth.sql`.
 */
export const CANONICAL_ROLES = [
  "org_admin",
  "security_admin",
  "compliance_officer",
  "risk_manager",
  "privacy_officer",
  "auditor_internal",
  "auditor_external",
  "incident_responder",
  "control_owner",
  "policy_author",
  "vendor_manager",
  "viewer",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
