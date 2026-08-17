#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Generate supabase/migrations/<ts>_ws09_seed.sql with >500 demo records:
// 1 org, 12 users (one per RBAC role), 22 framework bindings, 150 controls,
// 120 evidence rows, 60 incidents, 80 risks, 40 vendors, 40 training assignments.
// Total: 525 domain rows + 12 users.
//
// All rows scoped to the "Acme Industries" demo org. SOFT-DELETE safe:
// created_by/updated_by/created_at/updated_at populated; deleted_at NULL.
// Idempotent: uses ON CONFLICT DO NOTHING against stable UUIDs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "supabase", "migrations");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Stable v5-like UUID derived from a namespace + name.
function uuid(ns, name) {
  const h = createHash("sha1").update(`${ns}:${name}`).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const ORG_ID = uuid("ws9", "org:acme");

const ROLES = [
  "org_admin", "security_admin", "compliance_officer", "risk_manager",
  "privacy_officer", "auditor_internal", "auditor_external",
  "incident_responder", "control_owner", "policy_author",
  "vendor_manager", "viewer",
];

const FRAMEWORKS = [
  ["soc2",        "SOC 2 Trust Services Criteria"],
  ["iso27001",    "ISO/IEC 27001:2022"],
  ["iso27701",    "ISO/IEC 27701:2019"],
  ["iso42001",    "ISO/IEC 42001:2023"],
  ["nist_csf2",   "NIST CSF 2.0"],
  ["nist80053r5", "NIST SP 800-53 Rev. 5"],
  ["nist800171r3","NIST SP 800-171 Rev. 3"],
  ["nist_airmf",  "NIST AI RMF 1.0"],
  ["pci_dss_v4",  "PCI DSS 4.0"],
  ["hipaa",       "HIPAA Security Rule"],
  ["hitrust",     "HITRUST CSF v11"],
  ["gdpr",        "GDPR"],
  ["ccpa_cpra",   "CCPA / CPRA"],
  ["pipeda",      "PIPEDA"],
  ["lgpd",        "LGPD"],
  ["eu_ai_act",   "EU AI Act"],
  ["cis_v8",      "CIS Controls v8"],
  ["sox_itgc",    "SOX ITGC"],
  ["cmmc_2_0",    "CMMC 2.0"],
  ["fedramp_r5",  "FedRAMP Rev 5"],
  ["dora",        "DORA"],
  ["ffiec_cat",   "FFIEC CAT"],
];

const SEVERITY = ["sev1", "sev2", "sev3", "sev4"];
const STATUS_INCIDENT = ["open", "contained", "resolved", "post_mortem"];
const TIER = ["critical", "high", "medium", "low"];

function esc(s) { return s.replace(/'/g, "''"); }

const lines = [];
lines.push(`-- SPDX-License-Identifier: Apache-2.0`);
lines.push(`-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.`);
lines.push(`-- WS9 — Admin seed. Idempotent via ON CONFLICT DO NOTHING.`);
lines.push(`BEGIN;`);
lines.push("");
lines.push(`-- ============================================================`);
lines.push(`-- Demo tenant`);
lines.push(`-- ============================================================`);
lines.push(`INSERT INTO organizations (id, name, slug, created_at, updated_at)`);
lines.push(`  VALUES ('${ORG_ID}', 'Acme Industries', 'acme-industries', NOW(), NOW())`);
lines.push(`  ON CONFLICT (id) DO NOTHING;`);
lines.push("");

// Users
lines.push(`-- ============================================================`);
lines.push(`-- 12 demo users, one per canonical RBAC role`);
lines.push(`-- ============================================================`);
const userIds = [];
for (const role of ROLES) {
  const uid = uuid("ws9", `user:${role}`);
  userIds.push([uid, role]);
  lines.push(`INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)`);
  lines.push(`  VALUES ('${uid}', '${ORG_ID}', '${role}@acme.demo', '${esc(role.replace(/_/g, " "))} (Demo)', '${role}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${uuid("ws9", `urb:${role}`)}', '${uid}', '${ORG_ID}', '${role}', '${userIds[0][0]}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
const adminUid = userIds[0][0];
lines.push("");

// Frameworks
lines.push(`-- ============================================================`);
lines.push(`-- 22 framework org-bindings`);
lines.push(`-- ============================================================`);
for (const [slug, name] of FRAMEWORKS) {
  const fid = uuid("ws9", `fwk:${slug}`);
  lines.push(`INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${fid}', '${ORG_ID}', '${slug}', '${esc(name)}', 'in_scope', '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
lines.push("");

// Controls — 150 (roughly 7 per framework)
lines.push(`-- ============================================================`);
lines.push(`-- 150 controls (≈7 per framework)`);
lines.push(`-- ============================================================`);
let controlCount = 0;
const controlIds = [];
const statuses = ["not_implemented", "partial", "implemented", "verified"];
for (const [slug] of FRAMEWORKS) {
  for (let j = 1; j <= 7; j++) {
    if (controlCount >= 150) break;
    controlCount++;
    const cid = uuid("ws9", `ctl:${slug}:${j}`);
    controlIds.push(cid);
    const owner = userIds[controlCount % userIds.length][0];
    const status = statuses[controlCount % statuses.length];
    lines.push(`INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)`);
    lines.push(`  VALUES ('${cid}', '${ORG_ID}', '${slug}', '${slug.toUpperCase()}-${String(j).padStart(2, "0")}', 'Control ${j} for ${slug}', '${status}', '${owner}', '${adminUid}', '${adminUid}', NOW(), NOW())`);
    lines.push(`  ON CONFLICT (id) DO NOTHING;`);
  }
}
lines.push("");

// Evidence — 120
lines.push(`-- ============================================================`);
lines.push(`-- 120 evidence artifacts`);
lines.push(`-- ============================================================`);
for (let i = 1; i <= 120; i++) {
  const eid = uuid("ws9", `ev:${i}`);
  const sha = createHash("sha256").update(`evidence:${i}`).digest("hex");
  const owner = userIds[i % userIds.length][0];
  lines.push(`INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${eid}', '${ORG_ID}', 'evidence-${String(i).padStart(3, "0")}.pdf', 'application/pdf', ${10000 + i * 17}, '${sha}', '${owner}', '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
lines.push("");

// Incidents — 60
lines.push(`-- ============================================================`);
lines.push(`-- 60 incidents across severities`);
lines.push(`-- ============================================================`);
for (let i = 1; i <= 60; i++) {
  const iid = uuid("ws9", `inc:${i}`);
  const sev = SEVERITY[i % SEVERITY.length];
  const st = STATUS_INCIDENT[i % STATUS_INCIDENT.length];
  const owner = userIds[i % userIds.length][0];
  lines.push(`INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${iid}', '${ORG_ID}', 'Incident ${i}: simulated ${sev}', '${sev}', '${st}', NOW() - (interval '1 day' * ${i}), '${owner}', '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
lines.push("");

// Risks — 80
lines.push(`-- ============================================================`);
lines.push(`-- 80 risks`);
lines.push(`-- ============================================================`);
for (let i = 1; i <= 80; i++) {
  const rid = uuid("ws9", `risk:${i}`);
  const likelihood = ((i - 1) % 5) + 1;
  const impact = ((i * 3) % 5) + 1;
  const owner = userIds[i % userIds.length][0];
  lines.push(`INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${rid}', '${ORG_ID}', 'Risk ${i}: enterprise scenario', ${likelihood}, ${impact}, 'assessed', '${owner}', '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
lines.push("");

// Vendors — 40
lines.push(`-- ============================================================`);
lines.push(`-- 40 vendors`);
lines.push(`-- ============================================================`);
for (let i = 1; i <= 40; i++) {
  const vid = uuid("ws9", `vendor:${i}`);
  const tier = TIER[i % TIER.length];
  lines.push(`INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${vid}', '${ORG_ID}', 'Vendor Co. ${String(i).padStart(2, "0")}', '${tier}', 'in_review', '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
}
lines.push("");

// Training assignments — 40
lines.push(`-- ============================================================`);
lines.push(`-- 40 training assignments (users × courses)`);
lines.push(`-- ============================================================`);
const COURSES = ["security-foundations", "privacy-gdpr", "secure-coding", "incident-response"];
let assignCount = 0;
for (let i = 0; i < 40; i++) {
  const user = userIds[i % userIds.length][0];
  const course = COURSES[i % COURSES.length];
  const tid = uuid("ws9", `train:${i}`);
  const done = i % 3 === 0;
  lines.push(`INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)`);
  lines.push(`  VALUES ('${tid}', '${ORG_ID}', '${user}', '${course}', '${done ? "completed" : "in_progress"}', NOW() - interval '${i} day', ${done ? "NOW()" : "NULL"}, '${adminUid}', '${adminUid}', NOW(), NOW())`);
  lines.push(`  ON CONFLICT (id) DO NOTHING;`);
  assignCount++;
}
lines.push("");

lines.push(`COMMIT;`);
lines.push(`-- Summary: 1 org + 12 users + 22 frameworks + 150 controls + 120 evidence + 60 incidents + 80 risks + 40 vendors + ${assignCount} training = ${12 + 22 + 150 + 120 + 60 + 80 + 40 + assignCount} rows (+1 org).`);

const outPath = path.join(OUT_DIR, "20260421000020_ws09_seed.sql");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

const total = 12 + 22 + 150 + 120 + 60 + 80 + 40 + assignCount;
console.log(`Wrote ${outPath}`);
console.log(`Total demo rows: ${total} (+ 1 org)`);
