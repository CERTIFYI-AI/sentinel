// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
//
// These assertions are the client-side half of the server-client
// contract. `permissionMatches()` MUST behave identically to the
// Postgres `auth.has_permission()` wildcard logic, otherwise UI gating
// and DB enforcement diverge and users see phantom buttons.

import { describe, expect, it } from "vitest";
import {
  PERMISSION_ACTIONS,
  RESOURCES,
  CANONICAL_ROLES,
  perm,
  permissionMatches,
  hasPermission,
  type PermissionAction,
  type ResourceId,
} from "@/lib/rbac";

describe("rbac catalog — shape", () => {
  it("exposes the 7 canonical actions", () => {
    expect(PERMISSION_ACTIONS).toEqual([
      "read",
      "create",
      "update",
      "delete",
      "approve",
      "export",
      "assign",
    ]);
  });

  it("every RESOURCES value equals its key (identity map)", () => {
    for (const [k, v] of Object.entries(RESOURCES)) {
      expect(v).toBe(k);
    }
  });

  it("declares exactly 12 canonical roles mirroring org_role_enum", () => {
    expect(CANONICAL_ROLES).toHaveLength(12);
    // Order matters — it must match the Postgres enum definition order
    // so migrations that compare ordinals remain stable.
    expect(CANONICAL_ROLES[0]).toBe("org_admin");
    expect(CANONICAL_ROLES[CANONICAL_ROLES.length - 1]).toBe("viewer");
  });
});

describe("perm() composer", () => {
  it("joins resource + action with a dot", () => {
    const r: ResourceId = RESOURCES.risk;
    const a: PermissionAction = "update";
    expect(perm(r, a)).toBe("risk.update");
  });

  it("round-trips against every (resource, action) pair", () => {
    for (const r of Object.values(RESOURCES)) {
      for (const a of PERMISSION_ACTIONS) {
        const p = perm(r, a);
        expect(p).toMatch(/^[a-z_]+\.(read|create|update|delete|approve|export|assign)$/);
      }
    }
  });
});

describe("permissionMatches() — wildcard semantics", () => {
  it("global wildcard matches anything", () => {
    expect(permissionMatches("*", "risk.update")).toBe(true);
    expect(permissionMatches("*", "anything.at.all")).toBe(true);
    expect(permissionMatches("*", "")).toBe(true);
  });

  it("exact match", () => {
    expect(permissionMatches("risk.update", "risk.update")).toBe(true);
    expect(permissionMatches("risk.update", "risk.read")).toBe(false);
  });

  it("resource wildcard matches any action on that resource", () => {
    expect(permissionMatches("iam.*", "iam.users.create")).toBe(true);
    expect(permissionMatches("iam.*", "iam.read")).toBe(true);
  });

  it("resource wildcard requires the trailing dot (prefix-scoped)", () => {
    // "iam.*" must NOT match "iama.read" — prevents iam_admin matching iamanything
    expect(permissionMatches("iam.*", "iama.read")).toBe(false);
    expect(permissionMatches("iam.*", "iamanything")).toBe(false);
  });

  it("resource wildcard does not cross resource boundaries", () => {
    expect(permissionMatches("iam.*", "risk.read")).toBe(false);
  });

  it("is case-sensitive (matches Postgres default collation on text)", () => {
    expect(permissionMatches("Risk.update", "risk.update")).toBe(false);
    expect(permissionMatches("risk.update", "Risk.update")).toBe(false);
  });

  it("empty granted string never grants anything (except via *)", () => {
    expect(permissionMatches("", "risk.read")).toBe(false);
  });
});

describe("hasPermission() — set-wise check", () => {
  it("returns true when any grant matches", () => {
    expect(hasPermission(["risk.*", "iam.read"], "risk.delete")).toBe(true);
  });

  it("returns true on empty required against global grant", () => {
    expect(hasPermission(["*"], "anything.goes")).toBe(true);
  });

  it("returns false when no grant matches", () => {
    expect(hasPermission(["risk.read"], "risk.delete")).toBe(false);
  });

  it("returns false for empty grants list", () => {
    expect(hasPermission([], "risk.read")).toBe(false);
  });
});
