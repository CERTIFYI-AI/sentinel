# Asset Registry

**Route:** `/assets` ·
**Backing:** `assets` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/AssetManagement.tsx`,
`dashboard/src/services/assetService.ts`, `dashboard/src/hooks/useAssetsData.ts`,
`dashboard/src/hooks/useSupplyChainEntities.ts` (name resolution)

## Purpose

The authoritative inventory of every AI system, dataset, endpoint and piece of
infrastructure the organisation runs — each entry linked to the model or dataset
it *is*, its supplier, and its recovery objectives. The asset is the anchor
object risks, BIA processes and vendors point back to.

## Why it exists

ISO/IEC 27001 A.5.9 requires an inventory of information and associated assets;
an AI asset register additionally has to answer "which model is this, and what
breaks if it goes down?". Before the 2026-08-25 rebuild the page could answer
neither: it read `assetmanagement_table (id, doc jsonb)` — a demo table with no
`org_id` column and an `_authenticated_all USING(true)` policy (cross-tenant
read/write) — and rendered a hardcoded ten-row `SEED` array. Every KPI
("Unclassified", "High-Value", "Assets Without Owner") was computed over that
fiction, saves were `setTimeout(700)` writes to local state, and the "Import
Assets" flow toasted success without importing. The invented audit history
("Pass — 2 minor findings", named auditors) was removed, not relabelled.

## How it works

- **Real table, org-scoped.** `assetService` reads and writes `public.assets`.
  `org_id` is never sent from the client — the column default
  `get_org_id()` fills it. Writes throw on failure; the page shows a real error
  toast and the dialog stays open. Reads throw so a backend failure renders an
  `ErrorState`, never an empty state.
- **Every mutation is audited.** create / update / delete call `logAction`
  (EU AI Act Art. 12) with the real actor — previously zero calls.
- **`null` renders `—`, never `0`.** RTO/RPO inherited from the BIA render an
  em-dash when unrecorded. Counts (e.g. "Without owner") are genuine counts, so
  a real 0 is shown as 0.
- **Interlinks resolve at render.** `entity_id`/`entity_type` and `vendor_id`
  are resolved to names via `useSupplyChainEntities`; an id that does not
  resolve renders "Unavailable", never a raw uuid.
- `?model=<ai_models.id>` filters to that model's assets with a dismissible
  chip; `?open=<assets.id>` opens a record (applied-once `useRef`).

## Fields (`assets`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid, default `get_org_id()` | Tenant scope (DB-filled) |
| `asset_ref` | text | Human-readable ref (`AST-001`) — display only |
| `name` | text NOT NULL | |
| `type` | text CHECK | `ai_model` / `dataset` / `agent` / `api_endpoint` / `code_repo` / `saas_app` / `infrastructure` / `prompt` / `llm_gateway` / `container` |
| `owner_id` | uuid → `user_profiles(id)` | Resolved to a name; "Unavailable" if unresolvable |
| `department` | text | |
| `criticality` | text CHECK | `critical` / `high` / `medium` / `low` |
| `data_classification` | text CHECK | `public` / `internal` / `confidential` / `restricted` / `pii` |
| `lifecycle_stage` | text CHECK | `planned` / `active` / `decommissioning` / `decommissioned` |
| `entity_type` | text | `ai_model` or `dataset` — what registry the asset *is* |
| `entity_id` | uuid | ai_models.id **or** datasets.id (per `entity_type`) |
| `vendor_id` | uuid → `vendors(id)` | Supplier (added 2026-08-25); legacy `vendor` text is display-only |
| `bia_rto_hours` / `bia_rpo_hours` | numeric | Inherited from the BIA; `—` when null |
| `hostname` / `version` | text | |
| `tags` | text[] | |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks (both directions)

- **Outbound:** `entity_id` → the model detail page (`/models/inventory/:id`)
  or dataset (`/datasets/:id`); `vendor_id` → the vendor record (`/vendors/:id`);
  a button deep-links to the asset's BIA dependencies (`/bia?asset=<id>`).
- **Inbound:** `bia_records.linked_asset_ids` and `risks.linked_asset_ids`
  (uuid[]) reach an asset; a model's detail page links here via `?model=<id>`;
  `?open=<id>` opens a specific asset.

## Compliance

- ISO/IEC 27001:2022 A.5.9 (asset inventory), A.5.12 (classification).
- ISO/IEC 42001:2023 A.4.3 (AI system resources).
- EU AI Act Art. 11 + Annex IV §1(a) — the asset register is part of the
  technical documentation of the AI system; Art. 12 audit logging via
  `logAction`.

## Operations

CSV export mirrors the resolved view (registry entity, vendor, RTO/RPO). No
auto-discovery connectors yet — assets are entered or imported by hand; the
removed fake importer is a genuine gap, not a shipped feature.
