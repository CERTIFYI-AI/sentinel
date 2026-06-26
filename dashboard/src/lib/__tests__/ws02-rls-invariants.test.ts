// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
//
// These tests parse the WS0.2 migration SQL and assert structural
// invariants that give us confidence the sweep is complete without
// requiring a live Postgres. The live-DB integration test lives in
// `scripts/verify-ws02-rls.mjs` and runs against a Supabase branch in CI.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = resolve(
  HERE,
  "../../../../supabase/migrations/20260421_ws02_tenancy_sweep.sql",
);
const ROLLBACK = resolve(
  HERE,
  "../../../../supabase/migrations/20260421_ws02_tenancy_sweep.rollback.sql",
);

const sweep = readFileSync(MIGRATION, "utf8");
const rollback = readFileSync(ROLLBACK, "utf8");

describe("WS0.2 sweep migration — structural invariants", () => {
  it("has an Apache-2.0 header", () => {
    expect(sweep).toMatch(/Apache-2\.0/);
  });

  it("is wrapped in a single transaction", () => {
    const begins = sweep.match(/\bBEGIN;/g) ?? [];
    const commits = sweep.match(/\bCOMMIT;/g) ?? [];
    expect(begins.length).toBe(1);
    expect(commits.length).toBe(1);
  });

  it("creates the canonical 5 RLS policies per org-scoped table", () => {
    for (const p of [
      "ws01_org_read",
      "ws01_org_insert",
      "ws01_org_update",
      "ws01_org_delete",
      "ws01_service_all",
    ]) {
      expect(sweep).toContain(`CREATE POLICY ${p}`);
    }
  });

  it("backfills NULL org_id from tenant_id before NOT NULL", () => {
    const updateIdx = sweep.indexOf(
      "UPDATE public.%I SET org_id = public._ws02_cast_tenant",
    );
    const notNullIdx = sweep.indexOf(
      "ALTER COLUMN org_id SET NOT NULL",
    );
    expect(updateIdx).toBeGreaterThan(-1);
    expect(notNullIdx).toBeGreaterThan(updateIdx);
  });

  it("adds a `(org_id)` index on every swept table", () => {
    expect(sweep).toMatch(/CREATE INDEX IF NOT EXISTS .* ON public\.%I \(org_id\)/);
  });

  it("drops tenant_id only after backfill", () => {
    const backfillIdx = sweep.indexOf("public._ws02_cast_tenant");
    const dropIdx = sweep.indexOf("DROP COLUMN tenant_id");
    expect(backfillIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeGreaterThan(backfillIdx);
  });

  it("explicitly skips global catalog tables", () => {
    for (const t of [
      "framework_sections",
      "policy_templates",
      "maturity_dimensions",
      "observability_metrics",
    ]) {
      expect(sweep).toContain(t);
    }
    // Skip set is declared with `skip_tables` array variable.
    expect(sweep).toMatch(/skip_tables text\[\]/);
  });

  it("restricts catalog writes to service_role only", () => {
    expect(sweep).toContain("ws02_catalog_read");
    expect(sweep).toContain("ws02_catalog_svc");
    expect(sweep).toMatch(/CREATE POLICY ws02_catalog_read ON public\.%I FOR SELECT TO authenticated USING \(true\)/);
  });

  it("purges permissive USING(true) policies except service/catalog", () => {
    expect(sweep).toMatch(/policyname NOT LIKE 'ws01_%'/);
    expect(sweep).toMatch(/policyname NOT ILIKE '%service%'/);
  });

  it("drops one-shot helper functions at commit", () => {
    expect(sweep).toContain("DROP FUNCTION IF EXISTS public._ws02_cast_tenant");
    expect(sweep).toContain("DROP FUNCTION IF EXISTS public._ws02_apply_rls");
  });

  it("defines auth.current_org_id with both JWT and profile fallbacks", () => {
    expect(sweep).toContain("CREATE OR REPLACE FUNCTION auth.current_org_id()");
    expect(sweep).toContain("auth.jwt() ->> 'org_id'");
    expect(sweep).toContain("FROM public.user_profiles");
  });
});

describe("WS0.2 rollback migration — structural invariants", () => {
  it("has an Apache-2.0 header", () => {
    expect(rollback).toMatch(/Apache-2\.0/);
  });

  it("drops ws01 and ws02 policies", () => {
    expect(rollback).toMatch(/policyname LIKE 'ws01_%' OR policyname LIKE 'ws02_%'/);
  });

  it("drops idx_*_org_id indexes", () => {
    expect(rollback).toContain("idx\\_%\\_org\\_id");
    expect(rollback).toContain("ESCAPE '\\'");
  });

  it("does not recreate tenant_id (backfill is irreversible)", () => {
    expect(rollback).not.toMatch(/ADD COLUMN tenant_id/);
  });
});
