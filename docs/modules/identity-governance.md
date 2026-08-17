# Identity Governance

**Route:** `/iga` · **Tables:** `identities`, `sod_rules`, `sod_violations`, `access_reviews` · **Service:** `dashboard/src/services/resilienceService.ts` · **Hook:** `useIdentityGovernanceData` (`useAdminData.ts`)

## Purpose

Who — human, service account, or AI agent — can reach which registered AI
system, at what privilege, and when that access was last reviewed. Also the
segregation-of-duties rules and their violations, and access-review campaigns.

## Why it exists

ISO 27001 A.5.15–A.5.18 (access control, access review), SOC 2 CC6.1-CC6.3,
and the EU AI Act's Art. 14 expectation that human oversight roles are
identifiable. An identity register whose "AI systems: 7" figure cannot name
one system is unverifiable.

## How it works

The page (`pages/IGA.tsx`) reads the four org-scoped tables through
`resilienceService`; identity CRUD writes throw and audit via `logAction`.
Until 2026-08-23 it read the `iga_table` demo table with ten fictional
identities whose "AI systems access" strings resolved to nothing.

`ai_systems_access` (integer) is now kept in step with `linked_model_ids`
(uuid[]), which is **derived from privilege level** by
`20260823000001`: admin → every registered model, operator → production
models, viewer → none. This is a stated demo-tenant seeding rule — labelled
as such on the page — not an entitlement scan; what matters is the figure is
reproducible and every id resolves to a registry record.

Vocabularies are CHECK-constrained lowercase (identity_type: human / service /
agent; privilege_level: admin / operator / viewer; review_status: current /
due / overdue / revoked) and pinned to the service constants by
`dashboard/src/__tests__/adminRegisterVocabularies.test.ts`.

## Fields (`identities`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | DB default `current_user_org_id()` |
| `display_name` | text NOT NULL | |
| `email`, `role`, `department` | text | |
| `identity_type` | text | CHECK: human / service / agent |
| `privilege_level` | text | CHECK: admin / operator / viewer |
| `review_status` | text | CHECK: current / due / overdue / revoked |
| `ai_systems_access` | integer | Kept equal to `array_length(linked_model_ids)` |
| `linked_model_ids` | uuid[] | Derived reach into `ai_models` (GIN indexed) |

Supporting tables: `sod_rules(name, module_a/action_a × module_b/action_b,
severity, is_active)`, `sod_violations(conflicting_roles[], risk_level,
status, detected_at)`, `access_reviews(review_name, scope, status, due_date,
totals)` — read-only on this page today.

## Interlinks

- **Outbound:** `linked_model_ids` → `ai_models.id`, proven 104/104 resolving
  (2026-08-23); chips navigate to `/models/inventory/:id`.
- **Inbound:** none yet — an identity is not referenced by other modules.
  Candidate: HITL review assignments naming a reviewer identity (roadmap).

## Compliance

ISO 27001 A.5.15–A.5.18; SOC 2 CC6; EU AI Act Art. 14 (oversight roles).
`sod_rules.org_id` previously had no default, which rejected every insert
(fail-closed but unusable); fixed by `20260823000001` with `get_org_id()`.

## Operations

`identities` is part of the live baseline gap — migration statements touching
it are guarded with `to_regclass`. Access derivation reruns only when the
migration is re-applied; a real entitlement sync is roadmap.
