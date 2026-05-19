// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.

import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROLES,
  ROLE_PERMISSIONS,
  matchesWildcard,
  roleHasPermission,
  anyRoleHasPermission,
  type OrgRole,
} from "@/lib/rbac";

describe("rbac", () => {
  it("defines exactly 12 canonical roles", () => {
    expect(CANONICAL_ROLES.length).toBe(12);
  });

  it("every role has at least one permission", () => {
    for (const role of CANONICAL_ROLES) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it("org_admin inherits everything via *", () => {
    expect(roleHasPermission("org_admin", "risk.delete")).toBe(true);
    expect(roleHasPermission("org_admin", "any.random.perm")).toBe(true);
  });

  it("wildcard matching is prefix-scoped", () => {
    expect(matchesWildcard("iam.*", "iam.users.create")).toBe(true);
    expect(matchesWildcard("iam.*", "iam.roles")).toBe(true);
    expect(matchesWildcard("iam.*", "iama")).toBe(false); // must have the dot
    expect(matchesWildcard("iam.*", "risk.read")).toBe(false);
  });

  it("viewer cannot write", () => {
    expect(roleHasPermission("viewer", "read.dashboards")).toBe(true);
    expect(roleHasPermission("viewer", "risk.create")).toBe(false);
  });

  it("auditor_external is read-only + export", () => {
    expect(roleHasPermission("auditor_external", "read.controls")).toBe(true);
    expect(roleHasPermission("auditor_external", "report.export")).toBe(true);
    expect(roleHasPermission("auditor_external", "controls.update")).toBe(false);
  });

  it("anyRoleHasPermission reduces across multiple roles", () => {
    const userRoles: OrgRole[] = ["viewer", "control_owner"];
    expect(anyRoleHasPermission(userRoles, "controls.update")).toBe(true);
    expect(anyRoleHasPermission(userRoles, "iam.users.create")).toBe(false);
  });
});
