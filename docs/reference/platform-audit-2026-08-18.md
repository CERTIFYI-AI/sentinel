# Platform audit — modules, features, database, interlinks

Read-only audit, 2026-08-18, against `claude/agentic-mesh-architecture-d6y5re`
@ `c3746f3` (which contains `main` @ `4caa2c8`).

**Method.** Every migration in `supabase/migrations/` was applied, in
lexicographic order, to a **real PostgreSQL 16** behind a shim that supplies
only what the Supabase platform provides (`auth` schema and its three
accessors, the four platform roles, `pgcrypto`, a `cron` stub, the
`supabase_realtime` publication). Nothing in the shim creates an application
table. The resulting schema is the ground truth every claim below is checked
against, so this audit can verify all **253** tables — not just the 187 with a
literal `CREATE TABLE` that the static checker can see (the blind spot recorded
as TD-015).

The code side was measured by parsing `dashboard/src`: 468 files, the router's
157 route→component bindings, and the 134 menu destinations in
`data/navigation.ts`.

**What this audit does *not* cover.** The live Supabase project — no
credentials in this environment. Where the repo and the live database are known
to differ, that is itself a finding (F1, F3), not an omission. Row-level data
quality (the "98 references resolve to nothing" measurement in the 2026-08-17
audit) needs live access and is not repeated here.

---

## Verdict

The platform's *shape* is sound: one id-space, 913 RLS policies over 250 of 253
tables, no page reading a demo `<name>_table`, 134/134 menu destinations
documented. What the audit found instead is a **gap between what the repo
declares and what it actually does**, and it shows up four ways.

1. **Seven tenant tables are readable across organisations.** Reproduced: a
   user signed into Org A reads Org B's rows. This is TD-000's exact pattern,
   left behind on seven tables when one sibling was fixed.
2. **The repo cannot build its own database.** A from-zero replay halts at
   migration **97 of 146**. Eight migrations fail; 50 never get the chance to
   run under `supabase db push`.
3. **Thirteen create paths are rejected by the platform's own RLS.** Not
   suspected — reproduced. `Create use case` and `Create dataset` fail with
   *"new row violates row-level security policy"* every time.
4. **The most governed entity in an AI-governance product is not audit-logged.**
   Registering, editing or deleting an AI model leaves no audit record by
   either of the platform's two audit mechanisms.

Findings are ordered by severity, each with the evidence that produced it.

---

## F0 · Seven tenant tables are readable by every organisation — **P0 (security)**

`20260421000014_ws02_tenancy_sweep.sql` classifies eleven tables as *"tables
[that] serve every tenant"* and gives each one:

```sql
CREATE POLICY ws02_catalog_read ON public.%I FOR SELECT TO authenticated USING (true);
```

Three of the eleven really are global reference data (`framework_sections`,
`policy_templates`, `maturity_dimensions`). **Eight are not.** One of the eight,
`audit_findings`, was caught later — `20260821000001` drops the policy with the
comment *"ws02_catalog_read had qual `true` — every tenant could read every
other tenant's audit findings."* The other **seven were never revisited**:

| Table | What a competitor tenant can read |
|---|---|
| `document_versions` | every organisation's document version history |
| `event_cascade_links` | every organisation's governance cascade graph |
| `incident_workflow_steps` | every organisation's incident response steps |
| `observability_metrics` | every organisation's model latency, error rate, drift, cost |
| `vendor_questionnaires` | every organisation's vendor due-diligence answers |
| `workflow_step_actions` | every organisation's workflow actions |
| `module_health` | every organisation's module health signals |

All seven carry `org_id` and all seven also carry a correct org-scoped policy.
That does not help: **Postgres OR-combines permissive policies**, so
`USING (true)` widens access past the org predicate sitting next to it. This is
verbatim the lesson TD-000 was written to preserve — *"'RLS is on' is not a
sufficient assurance statement, and neither is 'an isolation policy exists'"* —
and it regressed on seven tables because the check was never made routine.

### Reproduced

Two organisations, one `document_versions` row each, read as a user belonging
to Org A:

```sql
set local role authenticated;
set local "request.jwt.claim.sub" = '…0a1';
select auth.current_org_id();     -- 00000000-0000-0000-0000-00000000000a  (Org A)

select org_id, count(*) from public.document_versions group by org_id;
                org_id                | count
--------------------------------------+-------
 00000000-0000-0000-0000-00000000000a |     1   ← own
 00000000-0000-0000-0000-00000000000b |     1   ← ANOTHER ORGANISATION
```

`event_cascade_links` additionally carries `cascade_org_insert` —
`FOR INSERT TO authenticated WITH CHECK (true)` — so a user can also **write** a
cascade link into another organisation.

**Fixed in this change.** `20260830000003_close_ws02_catalog_read_cross_tenant.sql`
drops the two `ws02_catalog_*` policies on the seven tables — exactly as
`20260821000001` did for `audit_findings` — and narrows
`event_cascade_links.cascade_org_insert` to `org_id = auth.current_org_id()`
rather than dropping it, since the governance event bus writes through it. It
refuses to run if any of the seven would be left without an org-scoped read or
without its service-role policy, so it cannot lock a tenant out of its own
rows, and it re-runs TD-000's regression query over the seven tables before it
finishes.

The same probe after the migration:

```
                org_id                | rows_visible
--------------------------------------+--------------
 00000000-0000-0000-0000-00000000000a |     1        ← own only
```

Whole-schema recheck: the only permissive `USING (true)` policies left for
`authenticated` are `emission_factors`, `integration_catalog` and
`policy_templates` — all three genuinely global, none of which has an `org_id`
column at all.

**Still open:** TD-000's regression query is a one-off sweep, not a gate. This
is the second time the defect has shipped; the third will happen unless the
query runs on every migration.

---

## F1 · From-zero replay halts at migration 97 of 146 — **P0**

`scripts/check_migration_replay.py` reports **clean**, and CI agrees. Against a
real Postgres, **8 migrations fail**:

| # | Migration | Error |
|---|---|---|
| 97 | `20260817000000_replay_repair.sql` | FK `regulator_filings.linked_incident_id`(uuid) → `incidents.id`(text) — *cannot be implemented* |
| 98 | `20260817000001_admin_group_asset_bia_interlinks.sql` | `column "linked_asset_ids" of relation "risks" does not exist` |
| 103 | `20260819000002_seed_risk_incidents.sql` | `operator does not exist: text = uuid` |
| 108 | `20260820000006_seed_risk_register_canonical.sql` | `column "kri_metric" of relation "risks" does not exist` |
| 110 | `20260821000001_compliance_write_path_repair.sql` | FK `post_market_events.incident_id`(uuid) → `incidents.id`(text) |
| 123 | `20260823000005_admin_registers_and_demo_table_lockdown.sql` | `column "tenant_id" of relation "assets" does not exist` |
| 133 | `20260825000004_unify_model_id_space.sql` | FK `ai_apps.vendor_id`(uuid) → `vendors.id`(text) |
| 141 | `20260826000021_framework_controls_bind_to_live_uuid_id_space.sql` | `invalid input syntax for type uuid: "eu-ai-act"` |

**TD-014 records two of these and says the rest are unreachable** ("a from-zero
replay stops before reaching them"). That is true of `supabase db push`, which
aborts — and it is exactly why this matters: **50 migrations after #97 never
run at all.** It is not true of a replay that continues, which is how the other
six were found.

### One root cause, one cascade

Five of the eight are the same defect: four core tables declare a **text**
primary key in this repo while the columns and seed variables that reference
them are **uuid**.

```
incidents.id   text     ← 20260418000002_core_grc_tables.sql:132
risks.id       text
vendors.id     text
frameworks.id  text     ← holds slugs: 'eu-ai-act', …
```

The live database evolved to uuid; the repo did not follow. So migrations
written against the live shape abort on a fresh one.

The cascade is the expensive part. `20260817000000_replay_repair.sql` exists
*specifically* to re-apply the early migrations that had to be guarded
(`040`, `050`, `052`) once their tables exist. Its **first** statement is the
`incidents` FK. It fails, the rest of the file is skipped, and so
`risks.kri_metric`, `risks.linked_asset_ids` and the whole of risk-schema-v2
never land — which is why #98 and #108 fail in turn. One type mismatch silently
strips a repair migration of its entire purpose.

Two failures are not type-related and are simpler to fix:

* **`assets.tenant_id`** — `20260823000005` line 36 runs
  `alter table public.assets alter column tenant_id set default …` unguarded.
  The same migration *does* guard `bia_processes` and `identities` with
  `to_regclass` for exactly this reason; `assets` was missed. `assets` has no
  `tenant_id` column in this repo (verified: 29 columns, none named
  `tenant_id`).
* **`realtime_alerts`** is created at line 225 of `20260821000001`, which fails
  at line 185 — so the table the Control Drift page reads is never created.

### Why the static checker cannot see any of it

`check_migration_replay.py` parses top-level `CREATE`/`ALTER` and flags forward
references. Every one of these eight failures is a **type** mismatch, a
PL/pgSQL comparison, or a statement inside `DO $$ … $$`. The checker reports
clean on precisely the files that abort. Its output line —
*"replay check clean: 145 migrations, 268 tables tracked"* — is easy to read as
a guarantee it does not make.

---

## F2 · Thirteen create paths are rejected by RLS — **P0**

CLAUDE.md First principle #3: *"never leave the scoping column to the client —
let the DB default (`current_user_org_id()`) fill it."* For 13 tables, **neither
side does it**: no DB default, no trigger, and the service does not send
`org_id` — while the table's own `INSERT` policy requires
`org_id = auth.current_org_id()`.

| Table | `org_id` | Writer |
|---|---|---|
| `use_cases` | nullable | `useCaseService.ts` |
| `datasets` | nullable | `datasetService.ts` |
| `ai_impact_assessments` | nullable | `impactAssessmentService.ts` |
| `guardrail_rules` | nullable | `guardrailService.ts` |
| `model_dna` | nullable | `modelDnaService.ts` |
| `model_lifecycle_stages` | nullable | `lifecycleService.ts` |
| `prompt_registry` | nullable | `promptService.ts` |
| `trust_policies` | nullable | `trustPolicyService.ts` |
| `webhook_endpoints` | nullable | `integrationsService.ts` |
| `api_keys` | **NOT NULL** | `securityService.ts` |
| `consent_records` | **NOT NULL** | `consentRecordsService.ts` |
| `eval_techniques` | **NOT NULL** | `evalTechniqueService.ts` |
| `maturity_assessments` | **NOT NULL** | `maturityService.ts` |

The only triggers on these tables are `set_updated_at`; no trigger anywhere in
the schema assigns `org_id`.

### Reproduced, not inferred

Run as the `authenticated` role with a resolved organisation:

```sql
set local role authenticated;
set local "request.jwt.claim.sub" = '…0bb';
select auth.current_org_id();          -- 00000000-0000-0000-0000-0000000000aa

-- A) exactly what useCaseService sends
insert into public.use_cases (name) values ('probe A');
   ERROR:  new row violates row-level security policy for table "use_cases"

-- B) the same insert with org_id supplied
insert into public.use_cases (name, org_id) values ('probe B','…0aa');
   INSERT 0 1                                            -- succeeds

-- C) exactly what datasetService sends
insert into public.datasets (name) values ('probe C');
   ERROR:  new row violates row-level security policy for table "datasets"
```

This is the same bug class as TD-015 and the seven write paths repaired in
`20260827000001` and `20260829000000`, found by a different route: those were
caught by *sending a column that does not exist*; these send **too little** and
are stopped by the policy instead. Both fail at the API boundary, and both are
invisible to a typecheck.

**Fix shape** (as used for the previous seven): add
`DEFAULT current_user_org_id()` to the 13 columns in one migration and let the
database fill them. No service change is required, and it is the pattern
`ai_models` already follows.

---

## F3 · Model, use-case and dataset changes are not audit-logged — **P0**

The platform has **two** audit mechanisms, and nobody has reconciled them:

* `logAction` — application-level, used by 55 of 93 write-capable destinations;
* `fn_audit_trigger` — database-level, attached to **13 tables**:
  `approvals, bias_audits, controls, evidence, guardrails, incidents,
  model_inventory, policies, policy_acknowledgments, policy_versions,
  red_team_findings, remediation_plans, risks`.

Cross-referencing the two against every destination that writes:

| Coverage | Destinations |
|---|---|
| `logAction` only | 40 |
| DB trigger only | 15 |
| both | 15 |
| **neither** | **23** |

The 23 include the platform's core registries:

```
/models/inventory   → ai_models    — 0 triggers, modelService.ts has 0 logAction calls
/use-cases          → use_cases    — 0 triggers, useCaseService.ts has 0 logAction calls
/datasets           → datasets     — 0 triggers, datasetService.ts has 0 logAction calls
```

Note the trap: `model_inventory` **is** audited, `ai_models` is **not** — and
`ai_models` is the canonical model table CLAUDE.md names as the one id-space.
`modelService.upsertModel` emits a `MODEL_REGISTERED` governance event, which
drives the agent mesh; it is not an audit record and carries no actor.

**Consequence.** Registering, re-tiering or deleting an AI model produces no
entry an auditor can read. For a product that sells EU AI Act Art. 12
alignment, and whose own review gate requires *"state-changing actions write to
the audit log with a real actor"*, this is the most serious functional gap in
the audit.

Two of the 23 (`/bias-audits`, `/tasks`) are **probable false positives** — the
scan resolved no table for them, so their writes were not attributable. The
three above were each confirmed by hand.

---

## F4 · Live admin pages read tables no migration creates — **P1**

`dashboard/src/lib/supabase-access-control.ts` backs three menu destinations —
**Users Registry**, **Roles Management**, **Departments** — and queries five
tables:

```
departments     ✔ exists
user_profiles   ✔ exists
user_roles      ✔ exists
roles           ✘ no migration creates it   (the real table is rbac_roles / custom_roles)
user_departments ✘ no migration creates it
```

Eleven tables are read by the dashboard and absent from a from-zero replay:

| Table | Read by | Status |
|---|---|---|
| `roles` | `supabase-access-control.ts` | **live admin page**, no migration |
| `user_departments` | `supabase-access-control.ts` | **live admin page**, no migration |
| `realtime_alerts` | `useControlDriftAlerts.ts` → `/compliance/drift` | cascade of F1 (created in the migration that aborts) |
| `bia_processes` | `resilienceService.ts` | known baseline gap, guarded elsewhere |
| `identities` | `resilienceService.ts` | known baseline gap, guarded elsewhere |
| `user_org_memberships` | `OrgSwitcher.tsx` | switcher is commented out of `TopHeader` |
| `governance_alerts` | `ContextualAlert.tsx` | component not mounted |
| `evidence_attachments` | `EvidenceAttachments.tsx` | component not mounted |
| `committees` | `useCommitteesData.ts` | hook imported by nothing |
| `sentinel_roles` | `ViewAsRole.tsx` | component imported by nothing |
| `profiles` | `auth.ts` `getProfile()` | function called by nothing; the real table is `user_profiles` |

`supabase/migrations/README.md` already documents this honestly as *"the
baseline gap"* — `007_replay_baseline.sql` is an approximation of a live schema
that was never dumped. This finding names the specific residue, and separates
the two rows that matter (a live admin surface) from the nine that are dead
code or already-known gaps.

---

## F5 · Three tables carry no row-level security — **P1**

```
rbac_permissions              2 columns, no org_id  — reference data, defensible
regulatory_change_events     10 columns, no org_id
regulatory_source_monitors    6 columns, no org_id
```

All other 250 tables have RLS enabled, and **every** RLS-enabled table has at
least one policy — no table is locked out by RLS-without-policy.

The two `regulatory_*` tables have no scoping column at all, so today they are
global reference data by construction rather than by decision. That is fine for
a shared regulatory feed and wrong the moment a tenant's own monitor is stored
there. Either state it in the module doc as deliberate global reference data
(as `integration_catalog` and `framework_controls` do) or scope them.

---

## F6 · 40 entity links exist as columns with no foreign key — **P1**

The database enforces 233 foreign keys, but **44 columns named
`<entity>_id` have none** — 4 of which are self-referential business codes
(`incidents.incident_id`, `controls.control_id`, `policies.policy_id`,
`risks.risk_id`), leaving **40 genuine cross-entity links the database does not
enforce**:

```
ai_impact_assessments.model_id      ai_impact_assessments.use_case_id
bias_audit_records.model_id         bias_audits.dataset_id
conformity_assessments.model_id     conformity_assessments.framework_id
evidence.control_id                 guardrail_events.policy_id
guardrail_rules.model_id            hitl_reviews.model_id
live_traces.policy_id               model_versions.model_id
post_market_events.incident_id      post_market_plans.model_id
provenance_nodes.dataset_id         provenance_nodes.use_case_id
red_team_findings.model_id          remediation_plans.risk_id
transparency_reports.model_id       trust_traces.model_id      … and 20 more
```

This is the mechanism behind the previous audit's empirical finding that **98
stored references resolved to nothing**, including
`guardrail_events.policy_id` (36/36 broken) and `live_traces.policy_id` (12/12
broken) — both on this list. Without a constraint, an id pointing at no row is
not an anomaly the database can refuse.

Inbound FK counts on the governed entities show where enforcement actually
exists:

```
organizations 113 · ai_models 30 · vendors 13 · policies 4 · frameworks 3
risks 2 · use_cases 2 · incidents 2 · controls 1 · datasets 1 · evidence 0
```

`ai_models` is genuinely well-connected (30 inbound FKs — the model id-space
work landed). `evidence`, `controls` and `datasets` are held together by
convention alone.

---

## F7 · Twelve modules are isolated from the rest of the platform — **P2**

CLAUDE.md First principle #1: *"A module that cannot be reached from, and
cannot reach, the rest of the platform is unfinished."* Measuring the
cross-module link graph over each page **plus its co-located components and the
components it imports**:

| | Count |
|---|---|
| destinations analysed | 120 |
| no outbound cross-module link | 24 |
| no inbound cross-module link | 53 |
| **isolated both ways** | **12** |

Isolated: `/compliance/drift`, `/continuity`, `/documents`, `/exceptions`,
`/explainability`, `/incidents/playbooks`, `/maturity`, `/mcp-gateway`,
`/mcp-gateway/servers`, `/mcp-gateway/tools`, `/model-validation`, `/training`.

Dead ends (reachable, but link nowhere): `/access-control/users`, `/ai-apps`,
`/ai-literacy`, `/audits`, `/bias-audits`, `/calendar`,
`/compliance/controls`, `/data-governance`, `/evals/dataset-preview`, `/hitl`,
`/trust-center`, `/use-cases`.

`/use-cases` deserves attention: `use_cases.id` is one of the two shared
id-spaces CLAUDE.md names, and 2 tables carry a `use_case_id` — yet the Use
Cases screen offers no link back to anything.

---

## F8 · Error states are missing on 64 of 120 destinations — **P2**

Against the UI/UX gate (*"all three of skeleton/empty/error"*):

| State | Present |
|---|---|
| loading / skeleton | 115/120 (95%) |
| empty state | 105/120 (87%) |
| **error state** | **56/120 (46%)** |

Loading and empty are close to universal; error handling is the outlier. Among
those with no detectable error branch: `/access-control` (all four screens),
`/aiia`, `/audit-trail`, `/audits`, `/automation-studio`, `/autopilot`,
`/calendar`, `/ai-risk-tiering`, `/ai-gateway/playground`.

A page with no error branch and a service that throws renders a blank region or
a crashed boundary where it should say what failed — the same defect class as
F2 seen from the user's side, since an RLS rejection arrives as a thrown error.

*Method note: this is a regex heuristic over the page plus its direct services
and hooks (`ErrorState`, `isError`). A page handling errors under a different
name will read as missing. Treat the list as a triage queue, not a verdict.*

---

## F9 · Smaller items — **P3**

* **A menu entry that leads to another module's screen.** "Narrative Engine"
  (`/narrative-engine`) is a `<Navigate to="/ciso/report">`; its own component
  import is commented out. `/ciso/report` is also in the menu, so two entries
  land on one screen and one of them promises a module that no longer exists.
* **Dead code reading tables that do not exist** — `useCommitteesData.ts`,
  `ViewAsRole.tsx`, `auth.ts::getProfile` (see F4). Each is imported by
  nothing; deleting them removes three false signals about the schema.
* **Dual scoping.** 53 tables carry both `org_id` and `tenant_id`; 244 carry
  `org_id`, 55 carry `tenant_id`. Policies are inconsistent about which they
  use — `maturity_assessments` has policies on **both**
  (`tenant_id = current_user_org_id()::text` *and*
  `org_id = auth.current_org_id()`). Two scoping columns with two accessor
  functions is one more than anyone can keep correct.
* **The debt register has two TD-015s.** One records the replay checker's
  column-verification blind spot, the other records `frameworks` existing in
  two incompatible schemas. A register whose identifiers collide cannot be
  cited unambiguously; renumber the later one.
* **Two org accessors.** `public.current_user_org_id()` and
  `auth.current_org_id()` have identical bodies and are used in different
  policies. Converge on one.

---

## What to fix first

1. **F0 — done in this change** (`20260830000003`), verified before and after
   on a real replay. What remains is making TD-000's regression query a
   standing gate rather than a sweep somebody remembers to run.
2. **F1 + F2 together, in one migration.** They share a cause — the database
   cannot be built from the repo, and columns that should default do not.
   Decide `incidents.id` is text (TD-014 already argues it is entrenched), align
   the five referencing sites, guard the `assets.tenant_id` statement, and add
   `DEFAULT current_user_org_id()` to the 13 columns in F2. Prove it with a
   from-zero replay, not the static check.
3. **F3.** Attach `fn_audit_trigger` to `ai_models`, `use_cases` and `datasets`
   — a three-line migration that closes the Art. 12 gap on the core registries
   without touching any service — then work the remaining 20.
4. **F4.** Point `supabase-access-control.ts` at `rbac_roles` and whatever the
   live `user_departments` really is, or commit the missing DDL. Three admin
   screens depend on it.
5. **F6.** Add the 40 foreign keys behind a data clean-up. The constraint is
   what stops the "98 broken references" measurement from recurring.
6. **Teach the checker what it missed.** `check_migration_replay.py` should
   flag FK type mismatches inside `DO` blocks (TD-014 suggests this too) and
   should say what it did *not* verify — it already prints its 81-table blind
   spot, and this audit shows a second one: it verifies references, never types.

## Reproducing this audit

```bash
# Postgres 16, no Docker needed
initdb -D "$PGDATA" --auth=trust && pg_ctl -D "$PGDATA" -o "-k /tmp -p 5433" start
psql -h /tmp -p 5433 -U postgres -f <shim.sql>          # auth schema, roles, cron stub
for f in supabase/migrations/*.sql; do psql -h /tmp -p 5433 -U postgres \
  -v ON_ERROR_STOP=1 -f "$f"; done                      # 138 apply, 8 fail
```

The shim is a harness, not a proposed change: it creates no application table
and no application function.
