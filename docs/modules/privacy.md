# Privacy — DSR, Consent, RoPA, DPIA, TIA

The five registers that carry Sentinel's GDPR obligations. They are one module,
not five screens: a rights request is answered *from* the Art. 30 record, which
names the AI systems, which is what makes an erasure actionable at all.

| Page | Route | Table | Statutory basis |
|---|---|---|---|
| DSR / Rights Management | `/dsr` | `dsar_requests` | Arts. 15–22, clock in Art. 12(3) |
| Consent Management | `/consent-management` | `consent_records` | Art. 7 |
| RoPA | `/ropa` | `ropa_records` | Art. 30 |
| DPIA | `/dpia` | `dpia_assessments` | Arts. 35–36 |
| TIA | `/tia` | `transfer_impact_assessments` | Chapter V (Arts. 44–49) |

## Why it exists

A supervisory authority does not ask "do you have a privacy page". It asks for
the Art. 30 record for a named processing activity, the consent evidence for a
named subject, and proof the one-month clock was met on a named request. Each
of those is a record that must exist, be complete, and be reachable from the
others.

The registers are also the only place where the AI inventory meets personal
data. An erasure request that names no system cannot be carried out. A DPIA
that names no use case cannot be reviewed. That is why every table here carries
id-typed links into `ai_models`, `datasets`, `use_cases`, `vendors`, `risks` and
`incidents`, and why an Art. 30 record with no linked system is counted as a
gap on the RoPA page rather than treated as complete.

## How it works

**Vocabularies are CHECK-constrained, and the services mirror the constraints.**
`DSR_STATUSES`, `DSR_REQUEST_TYPES`, `DSR_PRIORITIES`, `CONSENT_STATUSES`,
`CONSENT_TYPES` and `CONSENT_LEGAL_BASES` are exported from the service layer
and are the only values any page may filter or write. This is not a style
preference. Before the constraints existed the tables held `in_review` beside
`In Review` and `medium` beside `normal`, every page filtered on values that
never occurred, and the consoles read zero while the registers were full.

**Derived state is never stored.** `isOverdue` and `daysRemaining` come from
`due_date` at read time and stop counting once a request is closed;
`isLapsed` compares a granted consent against its own expiry. A stored
"Overdue" status goes stale the moment the clock passes it, and nothing
rewrites it.

**References, never uuids.** Every table carries a citable human reference —
`DSR-YYYY-NNN`, `CNS-YYYY-NNN`, `ROPA-NNN`, `TIA-YYYY-NNN`, `DPIA-YYYY-NNN`.
An authority cites a record by reference; the surrogate key is never shown.

**Org scoping is filled DB-side.** `org_id` / `tenant_id` default to
`current_user_org_id()` on every table here and are never sent by the client.

## Fields

Only the fields that carry governance meaning are listed; see the migrations
for the full schema.

### `dsar_requests`

| Column | Type | Notes |
|---|---|---|
| `reference` | text | `DSR-YYYY-NNN`, unique per org |
| `request_type` | text | CHECK: access, rectification, erasure, restriction, portability, objection |
| `status` | text | CHECK: pending, in_review, in_progress, completed, rejected |
| `priority` | text | CHECK: low, normal, high, urgent |
| `due_date` | date | Art. 12(3) deadline; defaults to one month from receipt, extendable |
| `linked_model_ids` | uuid[] | AI systems holding the subject's data |
| `dataset_id` | text | → `datasets.id` |
| `linked_ropa_id` | uuid | → `ropa_records.id` — the activity this falls under |
| `linked_consent_id` | uuid | → `consent_records.id` where the request contests consent |
| `incident_id` | text | → `incidents.id`, set on Art. 34 batches |
| `is_batch` / `subject_count` | bool / int | Art. 34 communication to many subjects |
| `source` / `auto_generated` / `created_by_agent` | text / bool / text | Provenance; set only by agents |
| `is_deleted` | bool | Soft delete — the record is the proof the deadline was met |

### `consent_records`

| Column | Type | Notes |
|---|---|---|
| `consent_ref` | text | `CNS-YYYY-NNN`, unique per tenant |
| `status` | text | CHECK: granted, pending, withdrawn, expired |
| `type` | text | CHECK: explicit, implicit, opt_out |
| `legal_basis` | text | CHECK: same six Art. 6 bases as `ropa_records.legal_basis` |
| `purposes` | text[] | Consent is purpose-specific under Art. 6(1)(a) |
| `data_categories` | text[] | |
| `expiry_date` / `withdrawal_date` / `withdrawal_reason` | date / date / text | |
| `linked_model_ids` | uuid[] | Systems this consent covers — on withdrawal, systems that must stop |
| `linked_ropa_id` | uuid | → `ropa_records.id` |

### `ropa_records`

| Column | Type | Notes |
|---|---|---|
| `reference` | text | `ROPA-NNN` |
| `legal_basis` | text | CHECK: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests |
| `linked_model_ids` | uuid[] | Which systems carry out the processing |
| `linked_dataset_ids` | uuid[] | → `datasets.id` |
| `linked_use_case_id` | text | → `use_cases.id` |
| `processor_vendor_id` | text | → `vendors.id`, replacing free-text `processor_name` |
| `last_reviewed_at` / `next_review_at` | date | Art. 30 records are kept current, not written once |

### `dpia_assessments`

| Column | Type | Notes |
|---|---|---|
| `reference` | text | `DPIA-YYYY-NNN` |
| `residual_risk_level` | text | high/critical triggers Art. 36 consultation |
| `linked_risk_id` | text | → `risks.id`; required where residual risk stays high |
| `linked_use_case_id` | text | → `use_cases.id` |
| `linked_ropa_id` | uuid | → `ropa_records.id` |

### `transfer_impact_assessments`

| Column | Type | Notes |
|---|---|---|
| `reference` | text | `TIA-YYYY-NNN` |
| `transfer_mechanism` | text | Empty = unlawful transfer; the sweep raises it as CRITICAL |
| `vendor_id` | text | → `vendors.id` |
| `linked_ropa_id` | uuid | → `ropa_records.id` |
| `linked_model_ids` | uuid[] | |

## Interlinks

Outbound, and the inbound route back:

| From | To | Reached back by |
|---|---|---|
| DSR → RoPA | `linked_ropa_id` | `/ropa?open=<id>` |
| DSR → consent | `linked_consent_id` | `/consent-management?open=<id>` |
| DSR → model / dataset | `linked_model_ids`, `dataset_id` | `/dsr?model=<uuid>` |
| Consent → RoPA | `linked_ropa_id` | RoPA legal-basis chip → consent register |
| Consent → model | `linked_model_ids` | `/consent-management?model=<uuid>` |
| RoPA → model / dataset / use case / vendor | four columns | `/ropa?model=<uuid>` |
| RoPA → DPIA / TIA | `dpia_required`, `cross_border_transfers` | DPIA and TIA both carry `linked_ropa_id` |
| DPIA → risk / use case | `linked_risk_id`, `linked_use_case_id` | `/risks?open=<id>` |
| TIA → RoPA / model / vendor | three columns | `/tia` from the RoPA transfers chip |

All 17 links are verified with `total = resolves` — see the evidence in the PR
description and in `20260816_privacy_interlink_population.sql`.

## Autonomous behaviour

Three agents write real records. None of them closes a risk or edits a
statutory record.

| Agent | Fires on | Writes |
|---|---|---|
| `DSRImpactAgent` | `INCIDENT_CREATED` | Art. 34 batch communication record, linked to the incident; idempotent per incident |
| `ConsentWithdrawalAgent` | `CONSENT_WITHDRAWN` | Art. 7(3) cessation task linked to the consent and its models; a risk while those systems still process |
| `PrivacyPostureAgent` | `PRIVACY_SCAN_REQUESTED`, `INCIDENT_CREATED` | One risk per unmet duty across all four gap kinds; writes the risk id back to the DPIA |

`PRIVACY_SCAN_REQUESTED` is raised by **Run privacy sweep** on `/dsr`, via
`requestPrivacyScan()`, which resolves the org server-side through
`current_user_org_id()` rather than letting the client pick a tenant.

The internal 14-day cessation service level in `ConsentWithdrawalAgent` is
Sentinel's own, not a statutory figure — Art. 7(3) names no period — and is
labelled as such where shown.

## Compliance

| Requirement | Where |
|---|---|
| GDPR Arts. 15–22, 12(3) | `dsar_requests`, deadline derived not stored |
| GDPR Art. 7, 7(3) | `consent_records`, `withdrawConsent` + `ConsentWithdrawalAgent` |
| GDPR Art. 30 | `ropa_records`, with the systems each activity runs on |
| GDPR Arts. 35–36 | `dpia_assessments`, residual risk must reach the risk register |
| GDPR Arts. 44–49 | `transfer_impact_assessments`, missing mechanism raised as CRITICAL |
| GDPR Arts. 33–34 | `DSRImpactAgent` batch record from an incident |
| EU AI Act Art. 12 (logging) | `logAction` on every privacy write; Audit Trail routes all five entity types |
| EU AI Act Art. 14 (human oversight) | Agents open risks and tasks; they never accept a risk, close a finding, or edit a statutory record |

See `docs/compliance/eu-ai-act-mapping.md` and
`docs/compliance/iso-42001-mapping.md`.

## Operations

- **Vocabulary changes** must change the CHECK constraint and the service
  constant together. A page must never be able to write a value the column
  will reject.
- **Never hard-delete a rights request.** It is the evidence the one-month
  clock was met. The service soft-deletes and reads filter `is_deleted`.
- **Watch for orphaned tenants.** `20260816_reclaim_default_tenant_orphans.sql`
  reclaimed 15 rows that carried the literal `tenant_id = 'default'` and were
  invisible under RLS. The literal defaults that produced them are gone, but
  any new table added here must default `tenant_id` to
  `current_user_org_id()`, never to a literal.
- **Re-running the sweep is safe.** Every agent write is idempotent against the
  record it came from.
