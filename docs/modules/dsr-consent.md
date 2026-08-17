# Data Subject Requests & Consent Management

**Route:** `/consent-management` (and DSR queue inside `/tasks`) · **Services:** `dsrRequestsService.ts`, `consentRecordsService.ts`

## Purpose
Operationalise individual rights under privacy law: intake, identity verification, fulfilment, and evidence of DSRs (access, erasure, rectification, portability, restriction, objection, Art.22 challenges); maintain lawful-basis and consent records.

## Standards Alignment
| Control | Requirement |
|---|---|
| GDPR Art.12–22 | Data subject rights, 1-month SLA (extendable) |
| GDPR Art.7 | Consent conditions |
| CCPA/CPRA | Consumer rights and opt-out signals (GPC) |
| LGPD Art.18 | Brazilian data-subject rights |
| ISO/IEC 27701 7.3 / 8.3 | PII principal rights; consent records |
| EU AI Act Art.22(3) | Right to explanation for high-risk decisions |

## DSR Workflow
Intake (portal, email, API) → Identity verification → Scope (systems, assets, vendors) → Legal review → Execution (data export, deletion with retention exceptions, rectification) → Delivery → Close with evidence.

## Consent Records
Immutable (insert-only RLS) ledger keyed by subject, purpose, lawful basis, timestamp, UI proof, and withdrawal events. Feeds Policy Firewall so the runtime can honour objections.

## Metrics & Evidence
SLA adherence, volume by jurisdiction, refusal-rate, and full audit package per request — hashed into `evidence_chain`.

## Backend (updated 2026-08-16)

**DSR** is backed by `dsar_requests` (service: `dsrRequestsService.ts`, hook:
`useDsrRequestsData`). **Consent** is backed by `consent_records` (service:
`consentRecordsService.ts`, hook: `useConsentRecordsData`).

### A silent total write failure (fixed)

`dsrRequestsService` sent `tenant_id` — a column that does not exist on
`dsar_requests`, which is scoped by `org_id`. Postgres rejected every upsert,
the service caught the error and returned the input record, and the UI reported
success. **No data subject request submitted through the UI had ever been
persisted.** Under Art. 12(3) an unlogged request is a missed one-month deadline.

The consent service had the same catch-and-return pattern with a client-chosen
`tenant_id`. Under Art. 7(1) a controller must be able to *demonstrate* consent;
a silently unsaved record is indistinguishable from consent never obtained.

Both services now let the database default fill the tenant, and both throw on
failure.

### Fields the pages rendered but could not store (added)

Both pages displayed fields absent from their tables, so those values could
never persist. They are now real columns:

- `dsar_requests`: `regulation`, `assignee`, `submitted_date`,
  `linked_model_ids`, `is_deleted`
- `consent_records`: `subject_name`, `subject_email`, `data_categories`,
  `consent_version`, `source_ip`, `channel`, `withdrawal_reason`,
  `linked_model_ids`

`linked_model_ids` is the governance-relevant addition: an erasure request is
only actionable if the systems holding the subject's data are recorded, and a
consent is only meaningful if the AI systems it covers are known.

> **Superseded 2026-08-16.** This pass also added text columns
> `dsar_requests.ai_systems_affected` and `consent_records.ai_systems` holding
> the *names* of those systems. Both were dropped by
> `20260816_privacy_retire_denormalised_system_names.sql`: they duplicated what
> `linked_model_ids` already held, 9 of 20 stored names had drifted from the
> model registry, and both pages paired the two arrays by index — so an edit on
> one side silently mislabelled a different system's link. Names now resolve
> from `linked_model_ids` at render time, per the one-id-space rule in
> `CLAUDE.md`.

### Derived, not stored

`daysRemaining` on a DSR is computed from `due_date` at read time so it cannot
drift. **Null means no statutory deadline was recorded** and renders as "no
deadline set" — never as 0, which would read as "due today".

### Vocabulary alignment

Both pages used title-case status values (`'Active'`, `'Pending'`) that never
matched the stored lower-case values, so status filters and counts silently
matched nothing.

**Updated 2026-08-16.** Deriving the vocabulary from whatever happened to be
stored was not enough — nothing stopped the next writer adding a fresh spelling,
and the tables had already accumulated `in_review` beside `In Review` and
`medium` beside `normal`. The values are now fixed by CHECK constraints and
mirrored by exported constants in the service layer
(`DSR_STATUSES`, `DSR_REQUEST_TYPES`, `DSR_PRIORITIES`, `CONSENT_STATUSES`,
`CONSENT_TYPES`, `CONSENT_LEGAL_BASES`). A page can no longer write a value the
column will reject, and `consent_records.status` `'active'` was migrated to
`'granted'`.

See [`privacy.md`](privacy.md) for the group-level view: the full interlink
graph, the agents that write records, and the field tables for all five
registers.
