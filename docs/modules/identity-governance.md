# Identity Governance — Access Reviews

**Route:** `/iga` ·
**Backing:** `access_reviews` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/IGA.tsx`,
`dashboard/src/services/accessReviewService.ts`,
`dashboard/src/hooks/useAccessReviews.ts`

## Purpose

Periodic certification of who may act on which AI system or asset — the
access-review record (reviewer, subject, system, decision) that SOC 2 CC6.3 and
ISO 27001 A.5.18 require as evidence.

## Why it exists

Before the 2026-08-25 rebuild the page read `iga_table (id, doc jsonb)` — a demo
table with no tenant column — and rendered a hardcoded ten-person directory. It
invented "risk flags" presented as measured findings ("Orphaned account — no
login 102 days", "Immediate revocation recommended"), an "avgReviewCompletion
78%" KPI over the seeded array, a `MOCK_CAMPAIGNS` tab with fabricated progress
bars, and approve/revoke buttons that toasted success without writing anything.
All removed.

The rebuild governs the access-**review** record, which is what `access_reviews`
actually models. Identity CRUD itself lives in Access Control
(`user_profiles`); a review points at those records rather than duplicating
them, so there is one id-space for people.

## How it works

- **Real table, org-scoped.** `accessReviewService` reads/writes
  `public.access_reviews`; `org_id` filled by the DB default. Writes throw;
  reads throw (a failed query renders an `ErrorState`).
- **Recording a decision is a real write.** `recordReviewDecision` sets
  `decision`, `status='completed'` and `completed_at`, then invalidates — the
  toast fires only after the write resolves. `logAction` on every mutation
  (Art. 12).
- **System reviewed is the interlink.** `linked_model_id` / `linked_asset_id`
  name what the review certified; reviewer/subject resolve against the org
  directory. An unresolvable id renders "Unavailable"; a review with no system
  named shows an honest prompt to link one, because a certification that cannot
  say what it certified is not audit evidence.
- `?model=<ai_models.id>` filters to a model's reviews with a dismissible chip;
  `?open=<access_reviews.id>` opens a record.

## Fields (`access_reviews`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid, default `get_org_id()` | Tenant scope (DB-filled) |
| `review_ref` | text | Human-readable ref (`AR-001`) |
| `name` | text NOT NULL | |
| `type` | text CHECK | `user_access` / `role_certification` / `entitlement` / `sod_check` / `privileged` |
| `status` | text CHECK | `pending` / `in_progress` / `completed` / `cancelled` / `overdue` |
| `reviewer_id` | uuid → `user_profiles(id)` | Resolved to a name |
| `subject_user_id` | uuid → `user_profiles(id)` | The identity certified |
| `scope` / `risk_level` | text | |
| `due_date` / `completed_at` | date / timestamptz | |
| `decision` | text CHECK | `approved` / `revoked` / `modified` / `deferred` |
| `decision_notes` / `framework_ref` | text | |
| `linked_model_id` | uuid → `ai_models(id)` | System reviewed (added 2026-08-25) |
| `linked_asset_id` | uuid → `assets(id)` | Asset reviewed (added 2026-08-25) |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks (both directions)

- **Outbound:** `linked_model_id` → the model detail page; `linked_asset_id` →
  the asset (`/assets?open=<id>`); reviewer/subject → the org directory.
- **Inbound:** a model's detail page links here via `?model=<id>`;
  `?open=<id>` opens a specific review.

## Compliance

- SOC 2 CC6.3 (periodic access review); ISO/IEC 27001:2022 A.5.18.
- NIST SP 800-53 AC-2 / AC-5 / AC-6; EU AI Act Art. 14 (human-oversight role
  integrity). Art. 12 audit logging via `logAction`.

## Operations

CSV export includes the resolved reviewer, subject, model and asset. Entitlement
catalog and SoD-conflict detection are a genuine gap (the old page faked them);
they are not represented as shipped.
