# Asset Registry

**Route:** `/asset-management` · **Table:** `assets` · **Service:** `dashboard/src/services/assetService.ts` · **Hook:** `useAssetsData` (`useAdminData.ts`)

## Purpose

The authoritative inventory of the AI estate — models, datasets, infrastructure,
applications, APIs, devices — with ownership, classification, criticality and
lifecycle state. The register's distinguishing capability is that an asset can
say **which governed record it represents**: an `ai_model` asset resolves to a
row in `ai_models`, a `dataset` asset to `datasets`. That link is what lets an
impact question ("what breaks?") land on a real registry entity.

## Why it exists

ISO/IEC 27001 A.5.9 requires an inventory of information and associated assets;
ISO/IEC 42001 6.1.2/A.4.3 extends that to AI system resources; EU AI Act
Annex IV §1(a) wants the system's components documented. An inventory that
cannot connect an entry to the model registry is a list, not a control.

## How it works

The page (`pages/AssetManagement.tsx`) reads and writes the org-scoped
`assets` table through `assetService` (writes throw; `logAction` on every
mutation). Until 2026-08-23 it read the `assetmanagement_table` demo table and
faked all persistence (TD-001); the rewrite removed the fabricated seed data,
the setTimeout fake-success saves, and a decorative "Import Assets" dialog.

`criticality` is **derived from `risk_level`** at write time (service) and was
backfilled by `20260817000001`; the two columns cannot disagree again.
`tenant_id` is filled by the DB default `current_user_org_id()`
(`20260823000001`) — the client never sends it.

## Fields

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `org_id` / `tenant_id` | uuid | DB default `current_user_org_id()`; never client-supplied |
| `asset_ref` | text | Citable reference (`AST-NNN`); the uuid is never shown |
| `name`, `type` | text | `type` ∈ ai_model, dataset, infrastructure, application, api, device |
| `criticality` | text | Derived from `risk_level`; lowercase vocabulary |
| `risk_level`, `data_classification`, `lifecycle_stage` | text | |
| `department`, `location`, `hostname`, `version`, `tags[]` | | |
| `entity_type`, `entity_id` | text, uuid | The registry record this asset represents; null for infrastructure (honest state, not an omission) |
| `bia_rto_hours`, `bia_rpo_hours` | numeric | Sourced from `bia_processes` by department; edited in the BIA, displayed here |
| `auto_discovered`, `last_scanned_at` | | |

## Interlinks

- **Outbound:** `entity_id` → `ai_models.id` / `datasets.id` (chip navigates to
  `/models/inventory/:id` or the dataset record). Proven 6/6 resolving
  (2026-08-23).
- **Inbound:** `risks.linked_asset_ids` references `assets.id` (proven 6/6);
  `bia_processes.linked_asset_ids` references `assets.id` (proven 8/8).
  Deep link: `/asset-management?model=<uuid>` filters to assets representing
  that model, with a dismissible chip.

## Compliance

ISO 27001 A.5.9/A.5.12; ISO 42001 6.1.2, A.4.3; NIST AI RMF MAP 1.1; EU AI Act
Annex IV §1(a). Mapped in `docs/compliance/iso-42001-mapping.md` and
`eu-ai-act-mapping.md`. Mutations write to the audit log via `logAction`
(module `asset-registry`).

## Operations

No scheduled jobs. Auto-discovery connectors remain roadmap (see
`docs/reference/technical-debt.md` for the registry's open items).
