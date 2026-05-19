# Schema Delta — live production → §2.3 spec

**Source DB:** Supabase project `vhparvughsygyknblkzt` (region `ap-southeast-1`).
**Snapshot:** 28 April 2026, post-commit `c6ebb92`.
**Target:** §2.3 schema in the Principal Architect QA/QC + Full Build Prompt.

This document maps every live table to the spec, classifies the change, and quantifies blast radius. **No DDL is executed by reading this file.** It is the prerequisite plan that any conform-migration PR must reference.

## Legend

- **KEEP** — table exists in spec under same name and structure ≈ matches.
- **RENAME** — table needs to be renamed (e.g. `user_profiles` → `org_members`).
- **SPLIT** — one live table needs to become two in spec (e.g. `controls` → `controls` (templates) + `org_controls` (instances)).
- **DROP** — table not in spec; legacy duplicate or out-of-scope feature.
- **ALTER** — table stays, columns change.
- **TENANCY** — change tenant column from `tenant_id` → `org_id`.
- **N/A** — spec doesn't address this; out-of-scope feature, leave as-is.

## Spec scope check

§2.3 defines **11 tables**: `organizations`, `org_members`, `frameworks`, `org_frameworks`, `controls`, `org_controls`, `evidence`, `control_evidence`, `risks`, `tasks`, `ai_systems`, `audit_logs`. The live DB has **144 tables**. The conform target is therefore a **strict subset** of the live system. The other 133 live tables are either:

- Modern snake_case duplicates of legacy CamelCase tables (drop the legacy)
- Feature tables for modules not enumerated in §2.3 (security scans, red team, ESG, vendors, training, BCP, ethics, supply chain, …) — these are **product features** the team has built; they should not be dropped just because §2.3 omits them.

**Recommendation:** treat §2.3 as the *core compliance kernel* schema. Conform that core. Leave everything else alone unless the user explicitly says "drop this feature."

## Per-table mapping

### Tier A — In §2.3, must conform exactly

| Live table | Spec table | Action | Blast radius |
|---|---|---|---|
| `organizations` (4 rows) | `organizations` | **ALTER** — add `slug` (UNIQUE), confirm `size` CHECK, `plan` defaults to 'starter'. Add `name CHECK`. | Low — 4 rows, additive. Update `Settings.tsx` org form to expose new columns. |
| `user_profiles` (2 rows) | `org_members` | **RENAME + RESTRUCTURE** — Spec separates `auth.users` from membership (`org_members` is a join). Live `user_profiles` mixes profile fields (name) with org membership. **Plan:** keep `user_profiles` as profile-only; create new `org_members` join table; backfill from `user_profiles.org_id`; drop `user_profiles.org_id` last. | **HIGH.** ~80 services/hooks/pages query `user_profiles` directly. Every join needs to be rewritten. |
| `frameworks` (10 rows, uuid PK) | `frameworks` (TEXT PK like `'soc2'`) | **ALTER PK type** | **CRITICAL.** Every FK in 10+ tables breaks on PK type change. Multi-day. Stage on dev branch. |
| (none) | `org_frameworks` | **CREATE** — Doesn't exist; live `frameworks` carries org_id directly. **Plan:** create `org_frameworks(org_id, framework_id, status, target_date, compliance_score)`, populate from existing `frameworks` rows, then strip `org_id` from `frameworks`. | High — services/hooks need rewiring to join through `org_frameworks`. |
| `controls` (385 rows, has org_id+framework_id+status+owner) | `controls` (template only) + `org_controls` (instance) | **SPLIT** — Move org-instance fields (`status`, `implementation_notes`, `owner_id`, `next_review_date`) into new `org_controls`; leave template fields (`control_id`, `domain`, `title`, `description`, `guidance`, `test_procedures`) in `controls`. | **CRITICAL.** Live data has 385 rows mixing templates and instances. Splitting requires deduping templates per framework first. ~30 service files reference `controls` directly. |
| `evidence` (10 rows, has tenant_id) | `evidence` (org_id) | **TENANCY** + ALTER columns to match enum spec | High — `evidence` powers EvidenceVault, EvidenceHub. ~15 files. |
| (none) | `control_evidence` | **CREATE** join table | Low — additive. |
| `risks` (12 rows, tenant_id) | `risks` (org_id, GENERATED `risk_score`) | **TENANCY** + add GENERATED column + change column names (`likelihood`, `impact`) | High — `RiskRegister.tsx`, `RiskMatrix.tsx`, ~6 services. |
| `tasks` (8 rows, tenant_id) | `tasks` (org_id) | **TENANCY** + spec adds `framework_id`, `control_id`, `evidence_id` FKs | Medium — `Tasks.tsx`, `tasks` Kanban. |
| `ai_models` (6 rows, org_id) | `ai_systems` | **RENAME + ALTER** — spec uses `ai_systems`, adds `eu_ai_act_risk_class`, `nist_profile`, `human_oversight`. | Medium — ModelInventory, ai-governance hooks. |
| `audit_log` + `audit_logs` (both exist) | `audit_logs` | **MERGE** — keep `audit_logs`, drop `audit_log`. Add `actor_email`, `changes` JSONB, `ip_address INET` if missing. | Medium — audit pages. |

### Tier B — Legacy CamelCase tables, drop after verification

These tables have RLS enabled but no policies (Supabase advisor flag #1). Their snake_case modern equivalents exist with real data. Verify zero application reads, then drop:

`Tenant`, `User`, `Framework`, `Policy`, `Control`, `Model`, `Dataset`, `Agent`, `Vendor`, `BiasAudit`, `Evidence`, `HitlItem`, `RiskEntry`, `Regulation`, `GuardrailRule`, `TrustTrace`, `AuditLog`, `ComplianceEvent`, `Notification`, `PolicyVersion`, `ShadowAIFinding`, `RBACRole`, `RBACUser`, `ModelTrustConfig`, `VendorQuestionnaire`, `ObservabilityMetric`.

**Verification command per table:**
```sql
SELECT 'public.User' AS t, count(*) AS rows FROM public."User"
UNION ALL SELECT 'public.user_profiles', count(*) FROM public.user_profiles;
```

If the CamelCase table is empty or mirrors the snake_case one, drop it after a 2-week observability window.

### Tier C — Out of §2.3 scope, KEEP

These power live features and have data; spec §2.3 does not address them but the user has not asked to remove them:

`vendors`, `bias_audits`, `incidents`, `guardrails`, `model_inventory`, `compliance_calendar`, `maturity_assessments`, `data_assets`, `explainability_reports`, `conformity_assessments`, `security_scans`, `security_vulnerabilities`, `security_threats`, `red_team_campaigns`, `red_team_findings`, `attack_surface_assets`, `policy_firewall_rules`, `keys_vault`, `model_arena_runs`, `consent_records`, `carbon_records`, `esg_reports`, `energy_metrics`, `model_efficiency`, `ethics_reports`, `supply_chain_attestations`, `transparency_reports`, `policy_templates`, `assets`, `access_reviews`, `entitlements`, `sod_violations`, `ropa_records`, `transfer_impact_assessments`, `tabletop_exercises`, `regulator_filings`, `bia_records`, `bia_processes`, `custom_roles`, `sod_rules`, `tenants`, `committees`, `identities`, `sso_config`, `data_retention_policies`, `notification_prefs`, `audit_trail_config`, `appearance_config`, `agent_executions`, `event_cascade_links`, `governance_event_dlq`, `module_health`, `sentinel_roles`, `user_role_assignments`, `jit_elevation_requests`, `executive_digests`, `webhook_endpoints`, `dsar_requests`, `documents`, `document_versions`, `agent_registry`, `evidence_chain`, `policies` (snake), `notifications` (snake), `training_courses`, `training_assignments`, `bcp_plans`, `compliance_scores`, `dashboard_snapshots`, `audits`, `audit_findings`, `ai_impact_assessments`, `exceptions`, `workflow_templates`, `workflow_instances`, `workflow_step_actions`, `framework_sections`, `use_cases`, `datasets`, `vendor_questionnaire(s)`, `compliance_events`, `guardrail_rules`, `shadow_ai_findings`, `regulation_entries`, `rbac_users`, `observability_metrics`, `api_keys`, `dataset_registry`, `model_dataset_links`, `departments`, `roles`, `user_roles`, `user_departments`, `audit_events`, `governance_events`, `models` (alt), `agents` (snake), `trust_policies`, `guardrail_events`, `live_traces`, `model_versions`, `model_trust_configs`, `org_invitations`, `report_schedules`, `hitl_reviews`, `remediation_items`, `remediation_plans`.

For Tier C tables: continue applying §3.2 hygiene fixes (RLS policies, FK indexes, search_path on functions) but **do not rename `tenant_id` → `org_id` unless the user explicitly approves the multi-week effort**.

## Total blast radius if literal §2.3 conform is executed

| Surface | File count | LOC affected (est.) |
|---|---|---|
| Pages directly querying live tables | ~40 / 241 | ~6 000 |
| Hooks (`hooks/use*Data.ts`) | ~30 / 99 | ~2 000 |
| Services (`services/*Service.ts`) | ~25 / 60 | ~3 000 |
| Migration SQL | new files | ~1 000 |
| Tests | 100 % rewrite | ~2 000 |
| **Total** | **~95 files** | **~14 000 LOC** |

At Stripe/Datadog velocity (1 senior eng), this is **3–4 weeks** including review. Compressing into a single autonomous-agent session = high probability of leaving the app in a broken state.

## Recommended execution path

1. **PR 1 — Audit deliverables only** (this commit). Land report and delta. Zero schema changes. Zero application changes.
2. **PR 2 — P0 RLS fixes.** Replace 52 `rls_policy_always_true` policies with proper org-scoped policies. Drop `users_with_details` SECURITY DEFINER view; rebuild without DEFINER. Lock function search_paths. Revoke EXECUTE on SECURITY DEFINER functions from `anon`/`authenticated`. Enable HIBP. ~3 days, includes test pass.
3. **PR 3 — Token refresh + global error boundary + supabase.ts fail-fast.** ~1 day.
4. **PR 4 — Drop Tier B legacy tables** (after 1-week observability window + verification queries). ~1 day.
5. **PR 5..N — Tier A conform on a Supabase development branch.** Spawn branch, apply migrations, rewrite dependent code in parallel feature branches, merge into main only after typecheck + E2E passes on the dev branch. Multi-week.

Use the Supabase MCP `create_branch` tool (cost-confirmed first) for PR 5. Do not run destructive DDL on the production project until the dev branch has run a full suite of pgTAP tests proving multi-tenant isolation and front-end smoke tests against the new schema.

---

*— Sentinel Engineering · Certifyi AI · audit@certifyi.ai*
