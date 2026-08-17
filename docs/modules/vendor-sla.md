# Vendor SLA

**Route:** `/vendors/sla` ·
**Backing:** `vendor_slas` (org-scoped RLS), read through the derived view
`vendor_sla_status` ·
**Code:** `dashboard/src/pages/vendors/VendorSLA.tsx`,
`dashboard/src/services/vendorSlaService.ts`,
`dashboard/src/hooks/useVendorSlas.ts`

## Purpose

Service-level commitments for each vendor, expressed as numeric thresholds with
a unit and a direction, so breach can be evaluated rather than asserted.

## Why it exists

Supplier performance is a post-market monitoring obligation (EU AI Act Art. 72)
and an ISO/IEC 42001 A.10.4 control. Neither is satisfiable if the target is a
free-text string.

Before the rebuild the page sat on `vendorsla_table`, an anon-open
`(id, doc jsonb)` demo table, and stored targets as prose (`'P1: 1h / P2: 4h /
P3: 24h'`) alongside a hand-authored `status` literal. A record could — and did
— report `healthy` while its own current value breached its own target. New SLAs
were created with `status: 'healthy'` and `lastMeasuredAt` stamped to today, so
an SLA that had never been measured counted toward the "Healthy" KPI from the
moment it was created.

## How it works

- **Status is derived, never stored.** The page reads
  `public.vendor_sla_status`, a view over `vendor_slas` that computes
  `derived_status`:

  | `derived_status` | Condition |
  | --- | --- |
  | `unmeasured` | `current_value IS NULL` or `target_value IS NULL` |
  | `breached` | past `breach_value` (falling back to `target_value`) in the direction set by `higher_is_better` |
  | `at_risk` | past `target_value` but not yet past `breach_value` |
  | `healthy` | otherwise |

  An SLA that has never been measured reports `unmeasured` and renders `—`. It
  is never reported as `healthy`.
- `higher_is_better` carries the direction, so uptime (higher is better) and
  latency (lower is better) are both evaluated correctly against the same
  columns.
- `recordSlaMeasurement` is the only path that sets `current_value` and
  `last_measured_at`; creating an SLA leaves both NULL.
- Writes go to the base table (`vendor_slas`); `derived_status` is a view
  expression and is never written. `org_id` is filled by the DB default
  `current_user_org_id()`.
- Every create, measurement, update and delete calls `logAction`
  (EU AI Act Art. 12).
- `?vendor=<vendors.id>` filters with a dismissible chip;
  `?open=<vendor_slas.id>` opens the record.
- Null renders `—`, never `0`: an unrecorded `current_value` is not "0% uptime".

## Fields (`vendor_slas`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `sla_ref` | text | Human-readable ref (`VSLA-001`) |
| `vendor_id` | uuid → `vendors(id)` ON DELETE CASCADE | Resolved to the vendor name at render time |
| `metric` | text NOT NULL | `uptime` / `response_time` / `resolution_time` / `accuracy` |
| `unit` | text NOT NULL, default `percent` | `percent` / `hours` / `minutes` / `ms` |
| `target_value` | numeric | The commitment |
| `warning_value` | numeric | |
| `breach_value` | numeric | Threshold used by the derived status |
| `higher_is_better` | boolean NOT NULL, default true | Direction of the comparison |
| `current_value` | numeric | **NULL until actually measured** |
| `measurement_window` | text | `monthly` / `quarterly` / `rolling_30d` |
| `last_measured_at` | timestamptz | NULL until actually measured |
| `last_breach_at` | timestamptz | |
| `consecutive_breaches` | integer NOT NULL, default 0 | Recorded, not asserted |
| `service_credits` | text | Contractual remedy |
| `credit_claim_status` | text | e.g. `claim_submitted` |
| `contract_clause_ref` | text | e.g. `MSA §7.1 Service Levels` |
| `linked_incident_ids` | uuid[] NOT NULL, default `{}` | → `incidents.id` |
| `escalation_path` | text | Role labels only |
| `owner` | text | Role label |
| `notes` | text | |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

### Derived (view `vendor_sla_status`)

| Column | Type | Notes |
| --- | --- | --- |
| *(all `vendor_slas` columns)* | | The view selects `s.*` |
| `derived_status` | text | `unmeasured` / `breached` / `at_risk` / `healthy` — computed, read-only |

## Interlinks

Outbound:
- **Vendor** → `/vendors/<vendor_id>` (pill link; "Unavailable" when the id does
  not resolve).
- **Incidents** → each `linked_incident_ids` entry links to
  `/incidents?open=<id>`, so a supplier-caused incident is reachable from the
  SLA it breached.

Inbound:
- `?vendor=<vendors.id>` from [Vendor Registry](vendor-registry.md) and vendor
  detail, with a dismissible chip.
- `?open=<vendor_slas.id>` from the vendor detail SLA tab and from
  [TPRM Workspace](tprm-workspace.md).
- `vendorCascadeAgent` writes `vendors.sla_breach_flag` and
  `vendors.last_breach_at`, so a breach is visible on the vendor record.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 72 | Post-market monitoring of supplier performance; status derived from measurement, `unmeasured` never reported as `healthy` |
| EU AI Act Art. 73 | Serious-incident linkage via `linked_incident_ids` → `incidents.id` |
| EU AI Act Art. 12 | SLA lifecycle and measurements audit-logged via `logAction` |
| ISO/IEC 42001 A.10.3 | Supplier agreements — contract clause reference, service credits, claim status |
| ISO/IEC 42001 A.10.4 | Supplier performance monitoring — `consecutive_breaches`, `last_breach_at` |

Org isolation: RLS policy `vendor_slas_org_all` on `org_id`, filled by the DB
default; `GRANT SELECT` on the view only. Demo SLA `VSLA-003` is deliberately
seeded with `current_value = NULL` so the `unmeasured` path is exercised.

## Operations

- Service: `vendorSlaService.ts` — `fetchVendorSlas` and `fetchVendorSlaById`
  read the **view**; `createVendorSla`, `updateVendorSla`,
  `recordSlaMeasurement` and `deleteVendorSla` write the **base table**. All
  throw on error.
- Hook: `useVendorSlas.ts`, invalidating `['vendor-slas']`.
- Migration: `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`
  creates `vendor_slas` and `vendor_sla_status` and replaces `vendorsla_table`.
