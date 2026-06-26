// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// The server is the source of truth. These client maps are used only
// for UI gating (hiding buttons users can't use); any real mutation
// is enforced server-side via RLS + SECURITY DEFINER functions.

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

export type OrgRole = (typeof CANONICAL_ROLES)[number];

export const ROLE_DISPLAY: Record<OrgRole, { label: string; description: string }> = {
  org_admin: { label: "Organization Admin", description: "Full tenant control. Break-glass only." },
  security_admin: { label: "Security Admin", description: "IAM, MFA, SSO configuration." },
  compliance_officer: { label: "Compliance Officer", description: "Frameworks, controls, attestations." },
  risk_manager: { label: "Risk Manager", description: "Risk register, KRIs, treatment plans." },
  privacy_officer: { label: "Privacy Officer", description: "DSRs, RoPA, DPIA." },
  auditor_internal: { label: "Internal Auditor", description: "Read all. Write findings." },
  auditor_external: { label: "External Auditor", description: "Read-only, scoped access." },
  incident_responder: { label: "Incident Responder", description: "Incidents and forensics." },
  control_owner: { label: "Control Owner", description: "Controls and evidence uploads." },
  policy_author: { label: "Policy Author", description: "Governance content writes." },
  vendor_manager: { label: "Vendor Manager", description: "Third-party reviews." },
  viewer: { label: "Viewer", description: "Read-only dashboards." },
};

// Permission matrix mirrors the server rbac_permissions table. Wildcards:
//   "*"        → every permission
//   "iam.*"    → any permission prefixed iam.
//   "read.*"   → any permission prefixed read.
//
// Keep in sync with supabase/migrations/20260421_ws04_rbac_depth.sql.
export const ROLE_PERMISSIONS: Record<OrgRole, readonly string[]> = {
  org_admin: ["*"],
  security_admin: ["iam.*", "mfa.*", "sso.*", "audit.read", "audit.export"],
  compliance_officer: ["frameworks.*", "controls.*", "evidence.*", "policy.read", "policy.approve"],
  risk_manager: ["risk.*", "controls.read", "evidence.read", "report.export"],
  privacy_officer: ["privacy.*", "dsr.*", "ropa.*", "dpia.*"],
  auditor_internal: ["read.*", "findings.create", "findings.update", "report.export"],
  auditor_external: ["read.*", "report.export"],
  incident_responder: ["incidents.*", "forensics.*", "threats.read"],
  control_owner: ["controls.update", "evidence.create", "evidence.update", "controls.read"],
  policy_author: ["policy.*", "controls.read"],
  vendor_manager: ["vendors.*", "contracts.read", "risk.read"],
  viewer: ["read.*"],
};

export function matchesWildcard(pattern: string, candidate: string): boolean {
  if (pattern === "*") return true;
  if (pattern === candidate) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1); // keep the dot
    return candidate.startsWith(prefix);
  }
  return false;
}

export function roleHasPermission(role: OrgRole, permission: string): boolean {
  const grants = ROLE_PERMISSIONS[role];
  return grants.some((g) => matchesWildcard(g, permission));
}

export function anyRoleHasPermission(roles: readonly OrgRole[], permission: string): boolean {
  return roles.some((r) => roleHasPermission(r, permission));
}
