# AI Bill of Materials (AIBOM)

**Route:** `/aibom` ·
**Backing:** `aibom_records` + `aibom_components` + `aibom_vulnerabilities`
(all org-scoped RLS) ·
**Code:** `dashboard/src/pages/AibomRegistry.tsx`,
`dashboard/src/services/aibomService.ts`, `dashboard/src/hooks/useAibomData.ts`,
`dashboard/src/hooks/useSupplyChainEntities.ts` (name resolution)

## Purpose

The component manifest for each governed model: the libraries, frameworks,
datasets and services it is built from, their licences, the known
vulnerabilities against them, and the provenance of the model weights
themselves.

## Why it exists

EU AI Act Art. 13 and Annex IV require a provider to describe what a system is
made of; Art. 15 requires known weaknesses to be identified. Neither is possible
without a component inventory keyed to the model.

Before the 2026-08-16 rebuild this module asserted assurance nothing performed.
The record's "SHA-256" was generated with `Math.random()` and then consumed as
an integrity **PASS**. "Known CVEs" was a tally of the value a user picked in a
dropdown, displayed beside the caption *Scanner: Sentinel CVE Scanner +
OSV.dev* — no scan had ever run. The attestation signer was the hardcoded string
`'James Liu'`. The page sat on `aibomregistry_table`, a demo table granting
`anon` `USING (true)` — cross-tenant read and write. Records were keyed by
free-text model name, so no AIBOM could be reached from the model it described.

## How it works

- **Records, components and CVEs are three tables.** A vulnerability is a row
  with a CVE id, CVSS score, affected range, fixed version, source feed and
  `scanned_at` — not a count derived from a dropdown.
- **Never scanned is not zero.** `openCveCount` returns `null` when
  `last_scanned_at IS NULL`, and the UI renders `—`. A record that has never
  been scanned is never presented as "0 CVEs".
- **Declared is not verified.** `declared_digest` holds whatever the producer
  asserted and is evidence of nothing. `verification_status`, `verified_at`,
  `verified_by` and `verification_method` are written only by a verifier.
  **No verification is performed yet**, so every record reads `unverified` — see
  [TD-011](../reference/technical-debt.md). The signing columns (`signature`
  DSSE envelope, `signer_identity`, `rekor_log_index`, `signed_by`,
  `signed_at`) exist so real signing has somewhere to land; nothing writes a
  fabricated signature in the meantime.
- **Publishing is editorial.** `publishAibomRecord` stores the canonical
  serialized `document` and sets `status = 'published'`. It does not sign, hash
  or verify anything, and the UI does not describe it as assurance.
- **Export is honest about its format.** `buildAibomExport` serializes a
  CycloneDX record to a schema-valid CycloneDX 1.5 JSON BOM with a `urn:uuid:`
  serial number, real `components` (PURL and SPDX licence ids), a real
  `dependencies` graph and a `vulnerabilities` array built from
  `aibom_vulnerabilities`. Any other declared format has no serializer yet, so
  the export is emitted as a labelled Sentinel envelope with `schemaValid:
  false` rather than a document pretending to be SPDX.
- `org_id` is filled by the DB default `current_user_org_id()`.
- Create, update, delete on records and components all call `logAction`
  (EU AI Act Art. 12) — previously zero calls.
- `?model=<ai_models.id>` filters to that model with a dismissible chip;
  `?open=<aibom_records.id>` opens the record.

## Fields (`aibom_records`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `aibom_ref` | text | Human-readable ref (`AIBOM-001`) |
| `model_id` | uuid → `ai_models(id)` ON DELETE CASCADE | **The** model link; resolved to the model name at render time |
| `model_version` | text | |
| `vendor_id` | uuid → `vendors(id)` ON DELETE SET NULL | Supplier of the model |
| `format` | text NOT NULL, default `CycloneDX` | `CycloneDX` / `SPDX` |
| `spec_version` | text | |
| `serial_number` | text | `urn:uuid:…` for CycloneDX |
| `document` | jsonb | The canonical serialized BOM, stored on publish |
| `declared_digest` | text | **Self-declared** by the producer — evidence of nothing |
| `digest_alg` | text NOT NULL, default `sha256` | |
| `verification_status` | text NOT NULL, default `unverified` | `unverified` / `verified` / `failed` — written only by a verifier |
| `verified_at` | timestamptz | Written only by a verifier |
| `verified_by` | uuid | Written only by a verifier |
| `verification_method` | text | Written only by a verifier |
| `signature` | jsonb | DSSE envelope when signed; never fabricated |
| `signer_identity` | text | Fulcio subject / OIDC issuer |
| `rekor_log_index` | text | Sigstore transparency log index |
| `signed_by` | uuid | Authenticated signer, never a literal name |
| `signed_at` | timestamptz | |
| `weights_uri` / `weights_digest` | text | Provenance of the model weights |
| `training_run_ref` | text | |
| `fine_tune_parent_id` | uuid → `ai_models(id)` ON DELETE SET NULL | Fine-tune lineage |
| `model_card_ref` | text | |
| `annex_iv_doc_id` | uuid | → `documents.id` (EU AI Act Annex IV) |
| `country_of_origin` | text | |
| `export_control_class` | text | |
| `eol_at` | date | |
| `version` | integer NOT NULL, default 1 | |
| `supersedes_id` | uuid → `aibom_records(id)` ON DELETE SET NULL | Version chain |
| `status` | text NOT NULL, default `draft` | `draft` / `published` / `superseded` |
| `generated_at` | timestamptz NOT NULL, default `now()` | |
| `last_scanned_at` | timestamptz | **NULL means never scanned** — renders `—`, never `0` CVEs |
| `scanner_name` | text | Named only when a scan actually ran |
| `notes` | text | |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

## Fields (`aibom_components`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `aibom_id` | uuid → `aibom_records(id)` ON DELETE CASCADE | Parent record |
| `component_type` | text | `library` / `model` / `dataset` / `framework` / `service` |
| `name` | text NOT NULL | |
| `version` | text | |
| `purl` | text | e.g. `pkg:pypi/torch@2.2.0` — required for CVE matching |
| `cpe` | text | |
| `supplier` | text | |
| `vendor_id` | uuid → `vendors(id)` ON DELETE SET NULL | |
| `dataset_id` | uuid | → `dataset_catalog_entries.id` |
| `license_spdx` | text | SPDX identifier, not free text |
| `license_risk` | text | `permissive` / `weak_copyleft` / `strong_copyleft` / `commercial` / `unknown` |
| `digest` | text | |
| `is_direct` | boolean NOT NULL, default true | Direct vs transitive dependency |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` | timestamptz NOT NULL, default `now()` | |

## Fields (`aibom_vulnerabilities`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `aibom_id` | uuid → `aibom_records(id)` ON DELETE CASCADE | |
| `component_id` | uuid → `aibom_components(id)` ON DELETE CASCADE | The affected component |
| `cve_id` | text NOT NULL | |
| `cvss_score` | numeric | |
| `severity` | text | |
| `affected_version_range` | text | |
| `fixed_version` | text | |
| `exploit_known` | boolean NOT NULL, default false | |
| `source` | text | `osv.dev` / `nvd` / `vendor` — the feed the row came from |
| `scanned_at` | timestamptz | |
| `status` | text NOT NULL, default `open` | `open` / `remediated` / `accepted` / `false_positive` |
| `created_at` | timestamptz NOT NULL, default `now()` | |

## Interlinks

Outbound (all by uuid, names resolved through `useSupplyChainEntities`):
- **Model** → `/models/inventory/<model_id>`; "Unavailable" when the id does not
  resolve.
- **Fine-tune parent** → `/models/inventory/<fine_tune_parent_id>`.
- **Vendor** → `/vendors/<vendor_id>` (record- and component-level).
- **Provenance** → `/provenance?model=<model_id>`.
- **Attestations** → `/supply-chain?model=<model_id>`.
- **Supply chain graph** → `/supply-chain/graph?model=<model_id>`.
- **Annex IV document** → `annex_iv_doc_id` → `documents.id`.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from
  [Attestations](supply-chain-attestations.md),
  [Provenance](provenance.md) and the
  [Supply Chain Graph](supply-chain-graph.md).
- `?open=<aibom_records.id>` for a specific record.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 13 + Annex IV | Provider information about the system — components, licences, model-card and Annex IV document reference |
| EU AI Act Art. 15 | Known weaknesses recorded as CVE rows with source and scan date |
| EU AI Act Art. 12 | Record and component lifecycle audit-logged via `logAction` |
| ISO/IEC 42001 A.7.3 | Acquisition of AI components — PURL/CPE, SPDX licence id, licence-risk class |
| CycloneDX 1.5 / SPDX | Machine-readable export; non-CycloneDX formats are exported as a labelled envelope, not a pretend SPDX document |

**Not implemented:** cryptographic verification. `verification_status` is
`unverified` for every record, and the UI must never present an unverified
record as verified. Tracked as TD-011 in
[`../reference/technical-debt.md`](../reference/technical-debt.md).

Org isolation: RLS policies `aibom_records_org_all`, `aibom_components_org_all`
and `aibom_vulnerabilities_org_all` on `org_id`, filled by the DB default. Demo
records belong to the fictional demo tenant; `AIBOM-002` is deliberately seeded
with `last_scanned_at` NULL so the never-scanned path is exercised.

## Operations

- Service: `aibomService.ts` — `fetchAibomRecords`, `fetchAibomRecord`,
  `fetchAibomComponents`, `fetchAibomVulnerabilities`, `createAibomRecord`,
  `updateAibomRecord`, `deleteAibomRecord`, `createAibomComponent`,
  `deleteAibomComponent`, `publishAibomRecord`, `buildAibomExport`,
  `openCveCount`. All writes throw on error.
- Hook: `useAibomData.ts`, invalidating the record, component and vulnerability
  query keys together on mutation.
- Migration:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql` creates
  the three tables; `…000003_seed_tprm_supply_esg.sql` seeds them against real
  `ai_models.id` values.
