# Supply Chain Attestations

**Route:** `/supply-chain` ·
**Backing:** `supply_chain_attestations` (org-scoped RLS), read through the
derived view `supply_chain_attestation_status` ·
**Code:** `dashboard/src/pages/SupplyChainAttestations.tsx`,
`dashboard/src/services/attestationService.ts`,
`dashboard/src/hooks/useAttestationsData.ts`,
`dashboard/src/hooks/useSupplyChainEntities.ts` (name resolution)

## Purpose

The register of attestations made about a governed subject — bias audits, model
integrity statements, vendor security reviews — with the attestor's identity,
the validity window, the revocation state and the evidence behind each one.

## Why it exists

This is the evidence register that bias audits, DPIAs and vendor reliance
decisions point at. If an attestation cannot be found from the model it
describes, or reports itself valid after it has expired, the modules that cite
it inherit that defect.

Before the rebuild the page used `supplychainattestations_table`, an
anon-writable `(id, doc jsonb)` demo table, while the real org-scoped table sat
unread. Under a heading reading *Cryptographic Verification*, "Signature Valid"
was implemented as `sigHash !== 'PENDING' && sigHash !== 'sha256:STALE'` over a
free-text input. "Within Validity Period: PASS" was `status === 'Valid'` — it
never compared `validUntil` to the current date, so nothing ever expired.
Findings were fabricated precise metrics ("Equalized odds: 91.2%"), the subject
was free text with no foreign key, and "Renew" was a toast that closed a drawer.

## How it works

- **Validity is derived, never stored.** The page reads
  `public.supply_chain_attestation_status`, a view over the table that computes
  `derived_validity` from `revoked_at` and `valid_until`:

  | `derived_validity` | Condition |
  | --- | --- |
  | `revoked` | `revoked_at IS NOT NULL` |
  | `unknown` | `valid_until IS NULL` |
  | `expired` | `valid_until < CURRENT_DATE` |
  | `expiring_soon` | `valid_until < CURRENT_DATE + 30` |
  | `valid` | otherwise |

  Writes go to the base table; `derived_validity` is a view expression and is
  never written.
- **Declared is not verified.** `declared_digest` holds whatever the producer
  supplied and is evidence of nothing. `verification_status`, `verified_at`,
  `verified_by` and `verification_method` are written only by a verifier. **No
  verification is performed yet**, so every record reads `unverified` — see
  [TD-011](../reference/technical-debt.md). The `signature` (DSSE),
  `signer_identity` and `rekor_log_index` columns exist so real signing has
  somewhere to land; nothing fabricates a signature meanwhile, and no page
  claims cryptographic verification.
- **The subject resolves.** `subject_type` + `subject_id` sit on the one
  id-space (`model` → `ai_models.id`, `vendor` → `vendors.id`, plus `dataset`
  and `pipeline`), with `model_id` and `vendor_id` as typed foreign keys for
  querying. An attestation is therefore reachable *from* the thing it describes.
- **Revocation and renewal are records.** `revokeAttestation` writes
  `revoked_at` and `revocation_reason` — the view reports `revoked` immediately.
  `renewAttestation` creates a new record and links the previous one through
  `superseded_by`, rather than mutating a validity date in place.
- `org_id` is filled by the DB default `current_user_org_id()`.
- Create, update, revoke, renew and delete all call `logAction`
  (EU AI Act Art. 12).
- `?model=<ai_models.id>` filters with a dismissible chip;
  `?open=<supply_chain_attestations.id>` opens the record.

## Fields (`supply_chain_attestations`)

The table was created by the `functional_integration` generic shell and extended
by `20260822000002`. `tenant_id` was dropped by the ws01 tenancy unification.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `name` / `title` / `description` | text | Shell columns; the page uses `title` |
| `status` | text, default `active` | Editorial state — **not** validity |
| `type` / `severity` / `owner` | text | Shell columns |
| `assignee_id` | uuid | |
| `attestation_ref` | text | Human-readable ref (`ATT-001`) |
| `attestation_type` | text | e.g. Bias Audit, Model Integrity, Vendor Security Review |
| `subject_type` | text | `model` / `dataset` / `vendor` / `pipeline` |
| `subject_id` | uuid | The subject on the one id-space |
| `model_id` | uuid → `ai_models(id)` ON DELETE SET NULL | Typed link for model subjects |
| `vendor_id` | uuid → `vendors(id)` ON DELETE SET NULL | Typed link for vendor subjects |
| `scope` | text | What the attestation covers |
| `findings` | text | Qualitative statement; no invented precise metrics |
| `attested_by` | text | Role label |
| `attestor_user_id` | uuid | Authenticated attestor when internal |
| `attestor_org` | text | |
| `attestor_is_independent` | boolean | |
| `attestor_accreditation` | text | |
| `issued_at` | date | |
| `valid_until` | date | **Drives `derived_validity`** |
| `declared_digest` | text | **Self-declared** — evidence of nothing |
| `verification_status` | text NOT NULL, default `unverified` | Written only by a verifier |
| `verified_at` | timestamptz | Written only by a verifier |
| `verified_by` | uuid | Written only by a verifier |
| `verification_method` | text | Written only by a verifier |
| `signature` | jsonb | DSSE envelope when signed; never fabricated |
| `signer_identity` | text | Fulcio subject / OIDC issuer |
| `rekor_log_index` | text | Sigstore transparency log index |
| `revoked_at` | timestamptz | |
| `revocation_reason` | text | |
| `superseded_by` | uuid | The renewing attestation |
| `renewal_task_id` | uuid | → `tasks.id` |
| `framework_control_ids` | text[] NOT NULL, default `{}` | → `controls.id` |
| `evidence_ids` | uuid[] NOT NULL, default `{}` | → `evidence.id` |
| `review_notes` | text | |
| `metadata` / `payload` | jsonb NOT NULL, default `{}` | Shell columns |
| `tags` | text[], default `{}` | |
| `created_by` / `updated_by` | uuid | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

### Derived (view `supply_chain_attestation_status`)

| Column | Type | Notes |
| --- | --- | --- |
| *(all `supply_chain_attestations` columns)* | | The view selects `a.*` |
| `derived_validity` | text | `revoked` / `unknown` / `expired` / `expiring_soon` / `valid` — computed, read-only |

## Interlinks

Outbound (all by uuid; "Unavailable" when an id does not resolve):
- **Model** → `/models/inventory/<model_id>`.
- **Vendor** → `/vendors/<vendor_id>`.
- **AIBOM** → `/aibom?model=<model_id>`.
- **Provenance** → `/provenance?model=<model_id>`.
- **Supply chain graph** → `/supply-chain/graph?model=<model_id>`.
- **Evidence** → each `evidence_ids` entry links to `/evidence-vault?open=<id>`
  with the evidence title as the label — the previous unlinked filename strings
  are gone.
- **Controls** → each `framework_control_ids` entry links to the control it
  supports.
- **Renewal task** → `renewal_task_id` links to `/tasks?open=<id>`.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from [AIBOM](aibom.md),
  [Provenance](provenance.md) and the
  [Supply Chain Graph](supply-chain-graph.md).
- `?open=<supply_chain_attestations.id>` for a specific record.
- Because `subject_id`/`model_id`/`vendor_id` are real foreign keys, the model
  and vendor records can query their own attestations rather than relying on a
  name match.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 25 | Value-chain attestations resolving to a `subject_id` on the one id-space |
| EU AI Act Art. 12 | Create, update, revoke, renew and delete audit-logged via `logAction` |
| ISO/IEC 42001 A.6.2.4 | AI system verification and validation — attestor identity, independence, accreditation, revocation and supersession. **Partial:** the attestation is recorded; cryptographic verification is not performed (TD-011) |

**Not implemented:** signature verification. Every record reads `unverified`,
and no view claims otherwise. Tracked as TD-011 in
[`../reference/technical-debt.md`](../reference/technical-debt.md).

Org isolation: the table's RLS is org-scoped and `org_id` is filled by the DB
default; `GRANT SELECT` on the status view only. Demo attestations are
fictional; attestors are role labels ("Independent Assurance Partner",
"Third-Party Risk Analyst"), never named individuals. `ATT-002` is deliberately
seeded past its `valid_until` so the `expired` path is exercised.

## Operations

- Service: `attestationService.ts` — `fetchAttestations` and `fetchAttestation`
  read the **view**; `createAttestation`, `updateAttestation`,
  `revokeAttestation`, `renewAttestation`, `deleteAttestation` write the
  **base table**. All throw on error.
- Hook: `useAttestationsData.ts`, invalidating the attestation query key on
  mutation and providing the evidence and control option lists.
- Migration:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql` extends
  the real table and creates `supply_chain_attestation_status`; the demo table
  `supplychainattestations_table` is no longer read.
