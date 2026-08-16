# Vendor Upload (Vendor Documents)

**Route:** `/vendor-upload` ·
**Backing:** `vendor_documents` (org-scoped RLS) + Supabase Storage ·
**Code:** `dashboard/src/pages/VendorUpload.tsx`,
`dashboard/src/services/vendorDocumentService.ts`,
`dashboard/src/hooks/useVendorDocuments.ts`

## Purpose

The evidence locker for third parties: SOC 2 reports, ISO certificates, DPAs,
pen-test summaries and insurance certificates, each with an integrity digest, a
version chain, an expiry and a recorded review decision.

## Why it exists

Vendor assurance is only as good as the artefact behind it. A "SOC 2: accepted"
badge with no file, no reviewer and no expiry is a claim, not evidence.

Before the rebuild this page uploaded nothing. The toast *was* the feature — no
storage call, no table write — while the UI promised the document would be
"reviewed within 5 business days". Accept and reject both stamped a hardcoded
reviewer name, the "Expiring < 90 days" tile was the literal `2` while the real
expiry dates sat unread in the same array, and the demo data used real-looking
corporate contact addresses with fabricated verdicts.

## How it works

- `uploadVendorDocument` uploads the file to Supabase Storage, computes a
  SHA-256 digest of the stored object into `file_digest`, and writes the row —
  in that order. If any step fails the write throws and the UI shows a real
  error; there is no success toast on a failed upload.
- Download uses a signed URL from `getVendorDocumentUrl(storage_path)`. A row
  with no `storage_path` offers no download rather than a dead link.
- **Review is recorded, not asserted.** `reviewVendorDocument` writes
  `status` (`accepted` / `rejected`), `reviewed_by` (the authenticated
  reviewer's uuid, resolved to a display name at render time), `reviewed_at`
  and `review_notes`. No reviewer name is hardcoded anywhere.
- **Versioning**: a replacement carries `version` and `supersedes_id`, so the
  chain of accepted evidence is traceable rather than overwritten.
- Expiry tiles are computed from `expires_at` via
  `documentsExpiringWithin(docs, days)` — no literal counts.
- `org_id` is filled by the DB default `current_user_org_id()`;
  `uploaded_by` defaults to `auth.uid()`.
- Upload, review, update and delete all call `logAction` (EU AI Act Art. 12).
- `?vendor=<vendors.id>` filters with a dismissible chip;
  `?open=<vendor_documents.id>` opens the record.
- Null renders `—`: a seeded row with no uploaded file shows `—` for digest and
  size, never a fabricated hash.

## Fields (`vendor_documents`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `document_ref` | text | Human-readable ref (`VDOC-001`) |
| `vendor_id` | uuid → `vendors(id)` ON DELETE CASCADE | Resolved to the vendor name at render time |
| `doc_type` | text | `SOC2` / `ISO Certificate` / `DPA` / `Pentest` / `Insurance` / `Other` |
| `title` | text | |
| `file_name` | text | Original filename |
| `storage_path` | text | Supabase Storage object path; null = no file uploaded |
| `file_digest` | text | SHA-256 of the **stored object**, computed server-side — null when no file exists |
| `file_size_bytes` | bigint | |
| `confidentiality` | text | |
| `virus_scan_status` | text | |
| `version` | integer NOT NULL, default 1 | |
| `supersedes_id` | uuid → `vendor_documents(id)` ON DELETE SET NULL | Version chain |
| `valid_from` | date | |
| `expires_at` | date | Drives the expiring-evidence tiles |
| `renewal_lead_days` | integer | |
| `retention_until` | date | Disposal date |
| `status` | text NOT NULL, default `pending_review` | `pending_review` / `accepted` / `rejected` / `expired` |
| `reviewed_by` | uuid | The authenticated reviewer — never a hardcoded name |
| `reviewed_at` | timestamptz | |
| `review_notes` | text | |
| `satisfies_control_ids` | text[] NOT NULL, default `{}` | → `controls.id` |
| `assessment_id` | uuid → `vendor_assessments(id)` ON DELETE SET NULL | The assessment this document supports |
| `uploaded_by` | uuid, default `auth.uid()` | |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

## Interlinks

Outbound:
- **Vendor** → `/vendors/<vendor_id>` (pill link; "Unavailable" when
  unresolvable).
- **Assessment** → `assessment_id` links to
  `/vendors/assessments?open=<assessment_id>`.
- **Controls** → each `satisfies_control_ids` entry links to the control it
  evidences, so the document is part of the control's evidence chain.

Inbound:
- `?vendor=<vendors.id>` from [Vendor Registry](vendor-registry.md) and the
  vendor detail Documents tab, with a dismissible chip — the two views of the
  same artefact are now one record set rather than two unconnected screens.
- `?open=<vendor_documents.id>` from the vendor detail documents list.
- [TPRM Workspace](tprm-workspace.md) counts document gaps and expiring
  evidence from this table and links back here.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 25 | Value-chain evidence held as artefacts, not claims |
| EU AI Act Art. 12 | Upload and review audit-logged with a real actor via `logAction` |
| EU AI Act Art. 14 | Accept/reject is a human decision recorded in `reviewed_by` |
| ISO/IEC 42001 A.10.2 | Third-party assurance evidence with expiry and retention |
| GDPR Art. 28 | DPAs held as versioned, dated artefacts |

`file_digest` is computed over the stored object by the upload path — it is an
integrity value for the file, not an attestation about its contents, and the UI
does not present it as verification of the vendor's claims. Org isolation: RLS
policy `vendor_documents_org_all` on `org_id`, filled by the DB default. Seeded
documents deliberately leave `storage_path` and `file_digest` NULL because no
file was ever uploaded for them; inventing a digest is exactly the defect this
rollout removed.

## Operations

- Service: `vendorDocumentService.ts` — `fetchVendorDocuments`,
  `fetchVendorDocumentById`, `getVendorDocumentUrl`, `uploadVendorDocument`,
  `reviewVendorDocument`, `updateVendorDocument`, `deleteVendorDocument`,
  `documentsExpiringWithin`. All writes throw on error.
- Hook: `useVendorDocuments.ts`, invalidating `['vendor-documents']`.
- Migration: `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`
  creates the table.
