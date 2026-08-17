# Platform interlink audit — is Sentinel one platform?

Read-only audit, 2026-08-17, against `main` @ `0428705` and Supabase project
`vhparvughsygyknblkzt`. Method: enumerate every link column that exists in the
database, prove `total = resolves` for each, and diff the tables the code reads
against the tables that exist.

**Verdict: the id-space is one, but the platform is not yet one system.** The
code reads a single canonical table per concept — no page reads a demo or
legacy table any more. Three things break the "one platform" claim: the live
database is 21 migrations behind `main`, 98 stored link references point at
nothing, and eight relationships exist as columns that were never populated.

---

## Finding 1 — the live database is 21 migrations behind `main` (P0)

The applied-migration ledger ends at `20260816161631`
(`privacy_retire_denormalised_system_names`). Every migration merged to `main`
after that date is **absent from this project**:

```
20260817_replay_repair                    20260820000005_risk_criticality
20260818000001_security_group_canonical   20260820000006_seed_risk_register_canonical
20260818000002_seed_security_group        20260821000001_compliance_write_path_repair
20260819000001_risk_incidents_canonical   20260821000002_policy_acknowledgments
20260819000002_seed_risk_incidents        20260821000003_seed_controls_canonical
20260819000003_audit_client_event         20260821000004_seed_interlink_repairs
20260819000004_telemetry_plane_repair     20260821000005_policies_framework_drift_heal
20260819000005_mesh_cron_activation       20260822000001_tprm_supply_esg_foundation
20260820000001_compliance_group_canonical 20260822000002_supply_chain_esg_canonical
20260820000002_seed_compliance_group      20260822000003_seed_tprm_supply_esg
                                          20260822000004_seed_vendor_model_attribution
```

Consequence: **35 tables the dashboard reads do not exist here.** Every page
backed by them renders an error or an empty state that looks like "no data yet".

```
aibom_components, aibom_records, aibom_vulnerabilities, approval_workflows,
approvals, automation_rules, automation_runs, control_evaluation_history,
control_tests, emission_factors, evidence_attachments, financial_risks,
governance_alerts, identity_providers, jit_elevations, knowledge_graph,
mesh_agent_state, mesh_model_fingerprints, policy_acknowledgments,
policy_versions, post_market_events, post_market_plans, profiles,
provenance_edges, provenance_nodes, realtime_alerts, security_report_runs,
security_reports, supply_chain_attestation_status, trust_traces,
user_org_memberships, vendor_assessments, vendor_documents, vendor_sla_status,
vendor_slas
```

34 of the 35 are created by migrations sitting in `supabase/migrations/`. This
is **not a code defect** — it is a deployment gap. The one genuine orphan is
`knowledge_graph`, which no migration creates at all.

**Fix:** apply the 21 migrations in order to this project. Nothing in the
dashboard needs to change.

---

## Finding 2 — 98 stored link references resolve to nothing (P0)

Seven link columns hold ids that point at no row. Six are **100% broken**,
which means the relationship has never worked, not that it drifted.

| Link | Stored | Resolve | Broken |
|---|---|---|---|
| `guardrail_events.policy_id` → `policies` | 36 | 0 | **36** |
| `evidence.linked_controls` → `controls` | 21 | 0 | **21** |
| `live_traces.policy_id` → `policies` | 12 | 0 | **12** |
| `evidence.linked_models` → `ai_models` | 10 | 0 | **10** |
| `mcp_tools.allowed_agent_ids` → `agent_registry` | 10 | 0 | **10** |
| `bias_audits.dataset_id` → `datasets` | 6 | 0 | **6** |
| `conformity_assessments.model_id` → `ai_models` | 4 | 1 | **3** |

The `policies` cases are the most consequential: `policies` holds **2 rows**
while the legacy `Policy` table holds 39 and `policyeditor_table` holds 9. The
36 guardrail events and 12 live traces were almost certainly seeded against the
legacy policy id-space and never re-keyed when `policies` became canonical. A
runtime guardrail event that cannot name the policy it enforced is not evidence
of anything.

`evidence` is the second: 21 control links and 10 model links, none resolving.
Evidence that cannot reach the control it satisfies is the failure mode the
whole evidence module exists to prevent.

**Fix:** re-key each against the canonical table, or null the column and show
"Unavailable". Both are honest; leaving a uuid that resolves to nothing is not.

---

## Finding 3 — eight relationships were built but never populated (P1)

These columns exist, are read by the UI, and resolve trivially because they
hold nothing. The module is wired; the relationship is theoretical.

| Link | Rows in source | Links stored |
|---|---|---|
| `risks.linked_control_ids` → `controls` | 12 | 0 |
| `risks.linked_incident_ids` → `incidents` | 12 | 0 |
| `incidents.linked_risk_id` → `risks` | 9 | 0 |
| `vendors.linked_models` → `ai_models` | 8 | 0 |
| `supply_chain_attestations.vendor_id` → `vendors` | 4 | 0 |
| `exceptions.control_id` → `controls` | 5 | 0 |
| `evidence.linked_use_cases` → `use_cases` | 10 | 0 |
| `carbon_records.model_id` → `ai_models` | 5 | 0 |

The risk↔incident pair matters most: a risk register that cannot say which
incidents realised a risk, and an incident log that cannot say which risk it
proved, are two lists rather than one governance story. `20260821000004_seed_interlink_repairs`
(unapplied — see Finding 1) may populate some of these; that should be checked
after the migrations land rather than assumed.

---

## Finding 4 — the model backbone is genuinely sound (PASS)

Every module that hangs off the model registry resolves. 25 of 27 `model_id`
links pass at `total = resolves`, the other two hold no links:

```
PASS  agent_gov_registry, ai_impact_assessments, bias_audits, cost_token_usage(84),
      data_quality_assessments, dataset_catalog_entries, explainability_profiles,
      guardrail_events(36), live_traces(165), metric_profiles, model_activity,
      model_dna, model_efficiency, model_explanations, model_lifecycle_stages,
      model_performance_metrics(16), model_trust_configs, mrc_agenda_items,
      mrc_votes, scenario_campaigns, scenario_templates, session_traces,
      tool_call_logs(28), validation_runs
EMPTY agent_gov_credentials, carbon_records
```

Array links pass too: `use_cases`, `eval_techniques`, `prompt_registry`,
`trust_policies` (18), `ai_trainings`, plus the whole privacy group (17/17 from
the previous pass). `ai_models.id` is a real single id-space and the platform
uses it.

---

## Finding 5 — ~74 legacy tables still hold data, but nothing reads them (P2)

No page reads a `*_table` demo table or a PascalCase Prisma-era table — verified
by grepping every `.from('…')` call in `dashboard/src`. The canonical migration
work succeeded.

What remains is **dead data that still answers questions**:

| Concept | Canonical (read) | Legacy (unread, still populated) |
|---|---|---|
| Controls | `controls` = 385 | `compliancecontrols_table` = 530, `Control` = 331 |
| Policies | `policies` = 2 | `Policy` = 39, `policyeditor_table` = 9 |
| Models | `ai_models` = 16 | `modelinventory_table` = 16 |
| RoPA | `ropa_records` = 7 | `ropa_table` = 8 |
| DPIA | `dpia_assessments` = 4 | `dpia_table` = 6 |
| TIA | `transfer_impact_assessments` = 4 | `tia_table` = 6 |
| Audit log | `audit_log` = 2 | `AuditLog` = 15 |

"How many controls do you have?" has three answers in this database (385 / 530 /
331). The application is consistent; the database is not. An auditor with read
access — exactly the person these registers exist for — would find the
contradiction before we did.

**Fix:** drop the legacy tables once their data is confirmed superseded. This is
destructive and should be a deliberate, separately reviewed change.

---

## What "one platform" currently means, honestly

| Dimension | State |
|---|---|
| One id-space in code | **Yes** — every concept reads one canonical table |
| Link resolution | **No** — 98 references resolve to nothing |
| Link coverage | **Partial** — 8 relationships built but empty |
| Model backbone | **Yes** — 25/27 pass, all array links pass |
| Privacy group | **Yes** — 17/17 pass |
| DB matches code | **No** — 21 migrations unapplied, 35 tables missing |
| One answer per question in the DB | **No** — ~74 legacy tables still populated |

## Recommended order

1. **Apply the 21 unapplied migrations** (Finding 1). Cheapest, highest impact;
   it may also resolve some of Finding 3. Re-run this audit afterwards — several
   findings could change.
2. **Re-key or null the 98 broken references** (Finding 2), policies first.
3. **Populate risk↔incident and vendor→model** (Finding 3).
4. **Retire the legacy tables** (Finding 5) as a separate reviewed change.

Nothing in this document was inferred; every number came from a query against
the live database or a grep over `dashboard/src`. Where a cause is uncertain —
notably whether `seed_interlink_repairs` fills the empty links — that is stated
rather than assumed.
