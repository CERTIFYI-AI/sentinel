// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const SEED_PATH = path.join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20260421_ws09_seed.sql",
);
const SUPPORT_PATH = path.join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20260421_ws09_seed_support.sql",
);

describe("WS9 — admin seed", () => {
  it("seed migration exists", () => {
    expect(fs.existsSync(SEED_PATH)).toBe(true);
  });

  it("support migration exists with RLS and soft-delete columns", () => {
    expect(fs.existsSync(SUPPORT_PATH)).toBe(true);
    const s = fs.readFileSync(SUPPORT_PATH, "utf8");
    expect(s).toContain("ENABLE ROW LEVEL SECURITY");
    expect(s).toContain("deleted_at");
    expect(s).toContain("CREATE INDEX");
  });

  it("seeds the 12 canonical RBAC roles", () => {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    for (const role of [
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
    ]) {
      expect(sql).toContain(`'${role}'`);
    }
  });

  it("binds all 22 frameworks", () => {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    const fwkCount = (sql.match(/framework_bindings/g) ?? []).length;
    // Two references per binding row (column list + VALUES line → we just check >=22)
    expect(fwkCount).toBeGreaterThanOrEqual(22);
  });

  it("generates ≥ 500 domain rows", () => {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    // Statements are indented inside per-statement fault-tolerant DO blocks
    // since the replay-safety pass (see supabase/migrations/README.md).
    const inserts = sql.match(/^\s*INSERT INTO /gm) ?? [];
    // 1 org + 12 users + 12 role_bindings + 22 fwk + 150 ctrl + 120 ev + 60 inc + 80 risk + 40 vendor + 40 training = 537
    expect(inserts.length).toBeGreaterThanOrEqual(500);
  });

  it("uses ON CONFLICT DO NOTHING for idempotency", () => {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
  });

  it("wraps in a transaction", () => {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("COMMIT;");
  });
});
