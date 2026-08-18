# Technical Debt Register

> Debt that is not written down does not exist, and will be rediscovered by an
> auditor instead of by us. Every accepted shortcut belongs here with an owner
> and a reason — see [`../contributing/review-process.md`](../contributing/review-process.md).

Last reviewed: 2026-08-16

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

## TD-001 — Modules still reading generic demo tables (P0, 12 remaining of 19)

**Status:** Open · **Severity:** P0 · **Owner:** Platform team

### What

Nineteen modules still read a generic `<name>_table (id, doc jsonb)` demo
table via `useSupabaseTable(...)`, seeded from a hardcoded in-file array. This
violates the platform's first-principle contract (*"Never wire a page to a
generic `<name>_table (id, doc jsonb)` demo table"*) in `CLAUDE.md`.

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
| DPIA | `pages/DPIA.tsx` | `dpia_table` |
| ~~Identity Governance (IGA)~~ | ~~`pages/IGA.tsx`~~ | **migrated** → `identities` + `sod_*` + `access_reviews` (2026-08-23) |
| ~~Model Risk Committee~~ | ~~`pages/ModelRiskCommittee.tsx`~~ | **migrated** → `mrc_meetings` / `mrc_agenda_items` / `mrc_votes` / `mrc_committee_members` (2026-08-25) |
| Regulator Filings | `pages/RegulatorFilings.tsx` | `regulatorfilings_table` |
| Tabletop Exercises | `pages/TabletopExercises.tsx` | `tabletopexercises_table` |
| Transparency Reports | `pages/TransparencyReports.tsx` | `transparencyreports_table` |
| Committee Management | `pages/committee/CommitteeManagement.tsx` | `committeemanagement_table` |
| Regulatory Radar | `pages/governance/RegRadar.tsx` | `regradar_table` |
| HITL Review Center | `pages/hitl/HITLReviewCenter.tsx` | `hitlreviewcenter_table` |
| ~~Reporting~~ | ~~`pages/reporting/Reporting.tsx`~~ | **migrated** → `security_reports` / `security_report_runs` (2026-08-25) |
| Attack Surface | `pages/security/AttackSurface.tsx` | `attacksurface_table` |
| Keys Vault | `pages/security/KeysVault.tsx` | `keysvault_table` |
| Policy Firewall | `pages/security/PolicyFirewall.tsx` | `policyfirewall_table` |
| Red Team Lab | `pages/security/RedTeamLab.tsx` | `redteamlab_table` |
| Report Generator | `pages/security/ReportGenerator.tsx` | `reportgenerator_table` |
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

**Tier 1 — statutory records (do first)**
Remaining: `DPIA`, `Regulator Filings`, `HITL Review Center`.
(`RoPA`, `TIA` and `Compliance Controls` migrated 2026-08-16.) These are named artefacts under GDPR Arts. 30/35, the AI
Act's Art. 14 oversight record, and conformity evidence. A seeded row here is the
highest-consequence defect in the register.

**Tier 2 — governance process records**
Remaining: `Committee Management`, `Tabletop Exercises`, `Transparency Reports`.
(`Model Risk Committee` migrated 2026-08-25; `BIA` migrated 2026-08-23;
`Vendor Assessments` and `Vendor SLA` migrated 2026-08-16.)

**Tier 3 — operational surfaces**
Remaining: `Report Generator`, `Regulatory Radar`, `Attack Surface`,
`Keys Vault`, `Policy Firewall`, `Red Team Lab`.
(`Asset Management` and `IGA` migrated 2026-08-23; `Reporting` migrated 2026-08-25.)

> **Remaining after the 2026-08-23/25 waves (12 modules):** `DPIA`,
> `Regulator Filings`, `HITL Review Center` (Tier 1); `Committee Management`,
> `Tabletop Exercises`, `Transparency Reports` (Tier 2); `Report Generator`,
> `Regulatory Radar`, `Attack Surface`, `Keys Vault`, `Policy Firewall`,
> `Red Team Lab` (Tier 3). TD-001 is **not** closed — these still render seeded
> fiction through `useSupabaseTable`. Asset Management, BIA and IGA were
> migrated on main (2026-08-23, ADMIN registers wave); Model Risk Committee and
> Reporting in the 2026-08-25 wave — the last ones whose real tables already
> existed and sat unread.

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

## TD-014 — From-zero replay is red on the `incidents.id` type split

**Owner:** Risk & Incidents team · **Raised:** 2026-08-26 · **Severity:** P1 ·
**Status:** Open. **Not caused by the framework-catalog change** — surfaced by
it, because that branch runs a full replay locally that CI cannot currently run.

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

> **Scope note.** The framework-catalog migrations (`20260826000001`–`000020`)
> and this branch's own migrations replay cleanly; they run *after* the failing
> files, so a from-zero replay stops before reaching them. Their correctness was
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

## TD-015 — `frameworks` exists in two incompatible schemas (slug-keyed vs uuid-keyed)

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
