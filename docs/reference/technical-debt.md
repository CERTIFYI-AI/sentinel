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

## TD-001 — Modules still reading generic demo tables (P0, 19 modules)

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

> **Cross-tenant exposure contained (2026-08-16, migration
> `20260822000002_supply_chain_esg_canonical.sql` §9).** The exposure above was
> live, not theoretical: `20260813000006_close_anon_rls.sql` revoked `anon` but,
> because these tables have no `org_id` column, fell through to
> `FOR ALL TO authenticated USING (true)`.
>
> **CORRECTION (2026-08-17).** The first attempt
> (`20260822000002` §9) added `org_id uuid NOT NULL DEFAULT
> current_user_org_id()` in one statement. Under a migration role `auth.uid()`
> is NULL, so the default evaluates to NULL — and adding a NOT NULL column with
> a NULL default to a table **that has rows** aborts with *"column contains null
> values"*. A from-zero replay has no rows, so CI passed and this entry was
> marked closed; but the demo tables are populated **at runtime** by the demo
> hook, so on the live database the ALTER failed and the permissive policies
> survived. The 53/53 verification was run against a fresh replay and therefore
> proved nothing about the database that matters.
> `20260823000002_reaudit_critical_fixes.sql` re-applies containment in a form
> that works on a populated table (add nullable → backfill → constrain), wraps
> each table so one failure cannot abort the sweep, and leaves genuinely
> unattributable rows NULL — excluded by the policy rather than assigned to an
> arbitrary tenant. **Containment is not remediation** — the modules below still render seeded fiction through
> `useSupabaseTable`, whose writes are fire-and-forget with both callbacks empty
> and which silently falls back to the in-file `SEED` when a load fails. They
> still need real tables and throwing services.

For a product used as the system of record for AI Act and ISO/IEC 42001
conformity, the third point is the serious one: a regulator may rely on a number
that has no provenance.

### Affected modules

| Module | Page | Demo table |
|---|---|---|
| Asset Management | `pages/AssetManagement.tsx` | `assetmanagement_table` |
| Business Impact Analysis | `pages/BIA.tsx` | `bia_table` |
| DPIA | `pages/DPIA.tsx` | `dpia_table` |
| Identity Governance (IGA) | `pages/IGA.tsx` | `iga_table` |
| Model Risk Committee | `pages/ModelRiskCommittee.tsx` | `modelriskcommittee_table` |
| Regulator Filings | `pages/RegulatorFilings.tsx` | `regulatorfilings_table` |
| Tabletop Exercises | `pages/TabletopExercises.tsx` | `tabletopexercises_table` |
| Transparency Reports | `pages/TransparencyReports.tsx` | `transparencyreports_table` |
| Committee Management | `pages/committee/CommitteeManagement.tsx` | `committeemanagement_table` |
| Regulatory Radar | `pages/governance/RegRadar.tsx` | `regradar_table` |
| HITL Review Center | `pages/hitl/HITLReviewCenter.tsx` | `hitlreviewcenter_table` |
| Reporting | `pages/reporting/Reporting.tsx` | `reporting_table` |
| Attack Surface | `pages/security/AttackSurface.tsx` | `attacksurface_table` |
| Keys Vault | `pages/security/KeysVault.tsx` | `keysvault_table` |
| Policy Firewall | `pages/security/PolicyFirewall.tsx` | `policyfirewall_table` |
| Red Team Lab | `pages/security/RedTeamLab.tsx` | `redteamlab_table` |
| Report Generator | `pages/security/ReportGenerator.tsx` | `reportgenerator_table` |
| ~~Vendor Assessments~~ | ~~`pages/vendors/VendorAssessments.tsx`~~ | **migrated** → `vendor_assessments` (2026-08-16) |
| ~~Vendor SLA~~ | ~~`pages/vendors/VendorSLA.tsx`~~ | **migrated** → `vendor_slas` (2026-08-16) |
| ~~AIBOM Registry~~ | ~~`pages/AibomRegistry.tsx`~~ | **migrated** → `aibom_records` (2026-08-16) |
| ~~Supply Chain Attestations~~ | ~~`pages/SupplyChainAttestations.tsx`~~ | **migrated** → `supply_chain_attestations` (2026-08-16) |

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
`Model Risk Committee`, `Committee Management`, `Vendor Assessments`,
`Vendor SLA`, `BIA`, `Tabletop Exercises`, `Transparency Reports`.

**Tier 3 — operational surfaces**
`Asset Management`, `IGA`, `Reporting`, `Report Generator`, `Regulatory Radar`,
`Attack Surface`, `Keys Vault`, `Policy Firewall`, `Red Team Lab`.

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

## TD-009 — Main Overview still carries fabricated dashboard sections

**Status:** Open · **Severity:** P2 · **Owner:** Platform team

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

## Closed

| ID | Item | Closed |
|---|---|---|
| — | AIBOM Registry / Supply Chain Attestations absent from the TD-001 register | 2026-08-16 |
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
