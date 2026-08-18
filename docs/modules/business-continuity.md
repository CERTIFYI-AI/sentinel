# Business Continuity & Resilience

**Route:** `/continuity` ·
**Backing:** `bcp_plans` (org-scoped, `org_id` DB default) ·
**Service:** `dashboard/src/services/bcpPlansService.ts` ·
**Hook:** `dashboard/src/hooks/useBcpPlansData.ts` ·
**Code:** `dashboard/src/pages/continuity/BusinessContinuity.tsx`

Reached from two menu entries — **Resilience** and **Business Continuity** —
which are the same screen.

## Purpose

The register of business continuity plans: what each plan covers, its current
standby/active state, which incident activated it, and when.

## Why it exists

When an AI system that a business depends on fails, the question is not whether
somebody wrote a continuity plan but whether the current one can be produced,
shows an owner, and has been tested. Holding plans as records — rather than as
documents in a drive — is what makes activation auditable after the fact.

## How it works

- The list reads `bcp_plans` through `useBcpPlansData`, with search and filters
  by status and type, and renders skeleton / empty / error states.
- A plan's detail opens in a sheet with **Overview**, **Recovery**,
  **Dependencies**, **Contacts** and **Tests** tabs.
- `status` defaults to `STANDBY` at the database. `activated_by_incident` and
  `activated_at` record an activation against the incident that caused it.
- Reads and writes throw on failure; an empty table renders an honest empty
  state rather than seeded example plans. (An earlier version returned
  fabricated `MDL-00x` plans whenever the table was empty or the query failed —
  removed.)

## Fields

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `org_id` | uuid | NOT NULL, DB default `current_user_org_id()` |
| `plan_code` | text | Human-facing reference; unique per org with `org_id` |
| `name` | text | Plan name |
| `status` | text | NOT NULL, DB default `'STANDBY'` |
| `activated_by_incident` | text | Incident reference that activated the plan |
| `activated_at` | timestamptz | Activation time |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` |

## Interlinks

- **→ Incidents.** `activated_by_incident` names the incident that triggered
  activation.
- **→ Business Impact Analysis.** BIA (`/bia`, `bia_records`) establishes the
  impact and recovery targets that a plan exists to meet.
- **→ Tabletop Exercises.** Tabletops are how a plan gets tested.

## Compliance

- **ISO/IEC 42001 §8.1** — operational planning and control for AI systems the
  business depends on.
- **ISO/IEC 27001:2022 A.5.29 / A.5.30** — information security during
  disruption, and ICT readiness for business continuity.
- **EU AI Act Art. 15** — robustness, including resilience to failure.

### Known gaps

Two, recorded rather than papered over:

1. **No audit logging.** `logAction` does not appear in this module's page or
   service, so activating a plan is not written to the audit trail. Activation
   is a material governance event and should be traceable (EU AI Act Art. 12).
2. **RTO/RPO are not backed by the schema.** The page reads `plan.rto` /
   `plan.rto_hours` (and the RPO equivalents), and `bcp_plans` has none of those
   columns — so those cells always fall back to `N/A`. The degradation is honest
   (no invented recovery targets are shown), but the fields are unusable until
   the columns exist. Closing this means adding `rto_hours` / `rpo_hours` to
   `bcp_plans` in a migration and populating them from the BIA.

## Operations

- `org_id` is filled by the database. The client must never send a scoping
  column (CLAUDE.md First principle #3).
- Historical note: `upsertBcpPlans` used to send `tenant_id`, a column
  `bcp_plans` does not have. PostgREST rejects a row containing an unknown
  column, so **every save failed** until this was removed
  (`20260827000001_org_scoping_defaults_repair.sql` and the service fix).
- `ux_bcp_plans_org_code` makes `plan_code` unique per org — an upsert with a
  duplicate code updates rather than inserts.
