// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS3 — CRUD completeness & quality audit.
//
// Walks every service under dashboard/src/services/ and scores it
// against the Fortune 500 quality bar:
//
//   CRUD signals (function-name heuristic):
//     C — create|insert|add|submit|upsert
//     R — list|get|fetch|read|search|find|subscribe|load|count
//     U — update|edit|patch|save|set|toggle|upsert|approve|reject|publish
//     D — delete|remove|destroy|purge
//     S — softDelete|archive|deactivate|restore|unpublish|close
//
//   Quality red-flags (grep):
//     - uses `any` type explicitly
//     - uses `console.log|warn|error`
//     - missing `AbortSignal`/abortSignal parameter
//     - uses legacy `tenant_id` (should be org_id via RLS)
//     - missing zod validation import
//     - swallows errors with empty `catch` or `return []`
//     - missing `org_id` mention entirely
//
// Append-only services (auditLog, evidence chain-of-custody entries) are
// flagged in an allowlist so they don't report as missing U/D.
//
// Output: docs/crud-audit/REPORT.md and REPORT.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVICES = path.join(ROOT, "dashboard/src/services");
const OUT_DIR = path.join(ROOT, "docs/crud-audit");

const APPEND_ONLY = new Set([
  "auditLogService",
  // Evidence custody entries are append-only; the top-level evidence
  // record is mutable, so evidenceService is not in this list.
]);

const CRUD = {
  create: /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(create|insert|add|submit|upsert)\w*/i,
  read: /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(list|get|fetch|read|search|find|subscribe|load|count)\w*/i,
  update: /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(update|edit|patch|save|set|toggle|upsert|approve|reject|publish)\w*/i,
  delete: /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(delete|remove|destroy|purge)\w*/i,
  soft: /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(softDelete|archive|deactivate|restore|unpublish|close)\w*/i,
};

// Permissively detect explicit `any` but not `Partial<any>` inside generics
// we don't care about — the cost of a few false positives is low.
const ANY_RE = /:\s*any\b|<any\b|\bany\[\]/;
const CONSOLE_RE = /\bconsole\.(log|warn|error|info|debug)\b/;
const ABORT_RE = /AbortSignal|abortSignal/;
const LEGACY_TENANT_RE = /tenant_id/;
const ZOD_RE = /from\s+['"]zod['"]/;
const SWALLOW_RE = /catch\s*(?:\(\s*\)?\s*\))?\s*\{\s*return\s+(\[\]|null|false|undefined|{})/;
const ORG_ID_RE = /org_id/;

function scanFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const signals = {};
  for (const [k, re] of Object.entries(CRUD)) signals[k] = re.test(src);
  signals.anyType = ANY_RE.test(src);
  signals.consoleUse = CONSOLE_RE.test(src);
  signals.abortSignal = ABORT_RE.test(src);
  signals.legacyTenant = LEGACY_TENANT_RE.test(src);
  signals.zodValidation = ZOD_RE.test(src);
  signals.swallowsErrors = SWALLOW_RE.test(src);
  signals.orgIdAware = ORG_ID_RE.test(src);
  signals.lines = src.split("\n").length;
  return signals;
}

function gapsFor(name, s) {
  const g = [];
  if (!s.create) g.push("create");
  if (!s.read) g.push("read");
  if (!APPEND_ONLY.has(name)) {
    if (!s.update) g.push("update");
    if (!s.delete && !s.soft) g.push("delete/soft");
  }
  return g;
}

function qualityRisks(s) {
  const r = [];
  if (s.anyType) r.push("any");
  if (s.consoleUse) r.push("console");
  if (!s.abortSignal) r.push("no-abort");
  if (s.legacyTenant && !s.orgIdAware) r.push("legacy-tenant");
  if (!s.zodValidation) r.push("no-zod");
  if (s.swallowsErrors) r.push("swallows");
  return r;
}

const report = [];
for (const f of fs.readdirSync(SERVICES)) {
  if (!f.endsWith(".ts") || f.endsWith(".d.ts")) continue;
  const name = f.replace(/\.ts$/, "");
  const full = path.join(SERVICES, f);
  const s = scanFile(full);
  report.push({
    service: name,
    appendOnly: APPEND_ONLY.has(name),
    crud: {
      create: s.create,
      read: s.read,
      update: s.update,
      delete: s.delete,
      soft: s.soft,
    },
    quality: {
      anyType: s.anyType,
      consoleUse: s.consoleUse,
      abortSignal: s.abortSignal,
      legacyTenant: s.legacyTenant,
      zodValidation: s.zodValidation,
      swallowsErrors: s.swallowsErrors,
      orgIdAware: s.orgIdAware,
    },
    lines: s.lines,
    gaps: gapsFor(name, s),
    risks: qualityRisks(s),
    crudComplete: gapsFor(name, s).length === 0,
  });
}

report.sort((a, b) => a.service.localeCompare(b.service));

const sum = {
  total: report.length,
  crudComplete: report.filter((r) => r.crudComplete).length,
  withAnyType: report.filter((r) => r.quality.anyType).length,
  withConsole: report.filter((r) => r.quality.consoleUse).length,
  withoutAbort: report.filter((r) => !r.quality.abortSignal).length,
  withLegacyTenant: report.filter((r) => r.quality.legacyTenant).length,
  withZod: report.filter((r) => r.quality.zodValidation).length,
  swallowingErrors: report.filter((r) => r.quality.swallowsErrors).length,
  orgIdAware: report.filter((r) => r.quality.orgIdAware).length,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "REPORT.json"),
  JSON.stringify({ summary: sum, services: report }, null, 2)
);

const md = [];
md.push("# WS3 — CRUD & Service-Quality Audit");
md.push("");
md.push(`Generated from \`scripts/ws3-crud-audit.mjs\`. ${sum.total} services scanned.`);
md.push("");
md.push("## Summary");
md.push("");
md.push(`- **Total services**: ${sum.total}`);
md.push(`- **CRUD-complete** (ignoring append-only): ${sum.crudComplete}`);
md.push(`- **Using \`any\` type**: ${sum.withAnyType}`);
md.push(`- **Using \`console.*\`**: ${sum.withConsole}`);
md.push(`- **Missing AbortSignal support**: ${sum.withoutAbort}`);
md.push(`- **Using legacy \`tenant_id\`**: ${sum.withLegacyTenant}`);
md.push(`- **With zod validation**: ${sum.withZod}`);
md.push(`- **Swallowing errors silently**: ${sum.swallowingErrors}`);
md.push(`- **Explicit \`org_id\` awareness**: ${sum.orgIdAware}`);
md.push("");
md.push("## Per-service matrix");
md.push("");
md.push("| Service | C | R | U | D | Soft | Gaps | Quality risks |");
md.push("|---|:-:|:-:|:-:|:-:|:-:|---|---|");
for (const r of report) {
  md.push(
    `| \`${r.service}\`${r.appendOnly ? " _(append-only)_" : ""} | ${r.crud.create ? "✅" : "⬜"} | ${r.crud.read ? "✅" : "⬜"} | ${r.crud.update ? "✅" : "⬜"} | ${r.crud.delete ? "✅" : "⬜"} | ${r.crud.soft ? "✅" : "⬜"} | ${r.gaps.length ? r.gaps.join(", ") : "—"} | ${r.risks.length ? r.risks.join(", ") : "—"} |`
  );
}
md.push("");
md.push("## Remediation plan");
md.push("");
md.push("This audit is wired into CI as a soft check (fails on new regressions, tracked via `scripts/ws3-crud-audit.mjs` diff). Hard gates land in WS6.");
md.push("");
md.push("### Short-term (this PR)");
md.push("");
md.push("1. **Hardened service factory** — `dashboard/src/lib/serviceFactory.ts` emits a typed CRUD client with AbortSignal, zod validation, org_id-aware RLS reads, and structured error telemetry.");
md.push("2. **Two exemplar services migrated** — `consentRecordsService` and `incidentService` ported to the factory as reference implementations.");
md.push("3. **`any`-free helper** — `dashboard/src/lib/supabaseTyped.ts` exposes a typed `fromTable<Name>` wrapper usable by legacy services for incremental migration.");
md.push("");
md.push("### Medium-term (WS6)");
md.push("");
md.push("- Migrate remaining services to `serviceFactory`.");
md.push("- Strip `console.*` in favour of `@/lib/telemetry` calls.");
md.push("- Remove `tenant_id` fallback once all tables confirm org_id via `auth.current_org_id()`.");
md.push("");
md.push("### Append-only allowlist");
md.push("");
md.push("Services in the allowlist below are **intentionally** missing U/D — their backing tables enforce `RLS UPDATE/DELETE USING (false)` and all writes flow through SECURITY DEFINER `*_append()` RPCs (WS0.3).");
md.push("");
md.push("- `auditLogService`");

fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), md.join("\n"));
console.log(JSON.stringify(sum, null, 2));
console.log(`\nWrote ${path.relative(ROOT, path.join(OUT_DIR, "REPORT.md"))}`);
