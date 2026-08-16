# Policy Management

**Routes:** `/policies` (library) · `/policies/:id` (canonical record surface) ·
`/policy-editor` · `/compliance/policy-templates`
**Service:** `dashboard/src/services/policyService.ts` ·
**Hooks:** `dashboard/src/hooks/queries/usePolicies.ts`,
`useComplianceGroup.ts` (`usePolicyVersions`, `usePolicyTemplates`, `useInstantiateTemplate`)
**Tables:** `policies`, `policy_versions`, `policy_templates`, `policy_acknowledgments`

## Purpose

Author, review, approve, publish, acknowledge and retire organisational AI
governance policies, with version history, an approval workflow, readership
evidence per person, and interlinks to the controls, trainings, AI apps and
documents that operationalise each policy.

## Why this module exists

A policy that only exists as a PDF proves nothing. Regulators and auditors ask
three questions this module answers with data:

1. **Is the policy current and approved?** — versioned content with an
   auditable approval chain (who requested, who decided, when).
2. **Do the people it governs know it?** — per-person acknowledgment rows,
   fed manually or synced from training completions (EU AI Act Art. 4).
3. **Does it actually govern anything?** — inbound links from controls,
   trainings, AI apps and documents make "coverage" a queryable fact rather
   than a claim.

## How it works

### Lifecycle (approval-only publication)

```
draft ──submit──▶ in_review ──approved──▶ published ──▶ archived
  ▲                   │
  └────rejected───────┘
```

- **Submit** (`submitPolicyForApproval`) creates a pending row in the shared
  `approvals` queue (`entity_type='policy'`, `requested_action='approve_policy'`),
  bound to the active `approval_workflows` definition with
  `applies_to='policy_change'` (its `steps[0].sla_hours` sets `due_at`), and
  moves the policy to `in_review`. A second submission while one is pending is
  refused.
- **Decision** happens in Approval Workflows (`oversightService.decideApproval`).
  The final approval syncs the policy row to `published` (approver +
  `approved_at`/`approval_date`); a rejection returns it to `draft`. If that
  sync write fails the decision call **throws** — the two surfaces are never
  allowed to disagree silently.
- The create/edit dialogs do not offer `published` as a free status pick;
  `publishPolicy()`/`archivePolicy()` exist in the service as audited direct
  transitions (admin/ops escape hatch — not wired to a UI button).

### Content (rich text, sanitized twice)

`policies.content` is jsonb: `{summary, sections:[{heading, html?, text?, body?}]}`.

- `html` is authored in `components/policies/RichTextArea.tsx`
  (dependency-free contenteditable + toolbar) and passed through the strict
  whitelist sanitizer `lib/richtext.ts` **on save and again on render** —
  only `p, br, strong, em, ul, ol, li, h3, a[href^="https://"]` survive; all
  attributes, styles, scripts and event handlers are stripped.
- `text`/`body` are legacy plain-text shapes; every renderer coalesces
  `html ?? text ?? body`. Legacy string/prose content rows are normalised at
  read time (`mapPolicy` wraps bare prose as `{summary, sections: []}`).
- Sanitizer contract is pinned by `dashboard/src/lib/__tests__/richtext.test.ts`.

### Versioning

Every editor save writes the policy row **and** a `policy_versions` row
(`content` = JSON serialisation, `changed_by`, operator changelog).
`nextVersion()` increments the minor and understands legacy single-integer
versions (`'4'` → `'4.1'`, never a reset to `'1.0'`). The Versions tab on
`/policies/:id` offers:

- **Compare to previous** — an LCS line diff (`lib/lineDiff.ts`) over the
  plain-text projection of the two versions, rendered with the `--s-ok-*`
  (added) / `--s-er-*` (removed) tokens.
- **Restore this version** — rewrites the policy content and records a new
  version with changelog `Restored from vX.Y` (both writes checked).

### Acknowledgments

`policy_acknowledgments` holds one row per person × policy version:

- **Manual**: the Acknowledgments tab on `/policies/:id` bulk-requests
  pending rows (name + optional email) and offers a per-row Acknowledge
  action (audited `policy.acknowledged`).
- **Training sync** (`aiLiteracyService`): saving a training whose
  `linked_policy_id` is set upserts acknowledgment rows for its attendees
  (`source='training'`, `training_id` set; completed attendees →
  `acknowledged` with `acknowledged_at` from `completedAt`, others →
  `pending`). Matching is by attendee email when present, otherwise by
  person name; matched rows are only ever upgraded pending → acknowledged,
  never downgraded. Attendees without emails therefore sync by name — two
  distinct people with the identical name in one policy's register would
  collapse to one row; add emails to attendees to disambiguate. Sync
  failures throw (no silent evidence loss).

### Templates

`policy_templates` is a global, read-only catalog of **8 system templates**
(PT-EUAI-RM/HO/LOG, PT-GDPR-ADM, PT-ISO-AIMS, PT-NIST-GOV, PT-NRB-IT,
PT-SEC-LLM). "Add to Policy Library" instantiates a real draft policy plus
its first `policy_versions` row and navigates to the new record. Earlier
claims of "70 templates across 11 frameworks" described content that never
existed and are withdrawn.

> **Legacy note:** previous revisions of this document described a
> Python/FastAPI policy engine (`policy_router.py`, `/api/v1/policies/*`,
> `policy_approvals`/`policy_signatures` tables). That backend is not part of
> the shipped platform — the module runs entirely on the org-scoped Supabase
> tables below.

## Fields

### `policies`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | canonical key everywhere (never the ref) |
| `policy_ref` / `policy_id` | text | display/business code |
| `name` / `title` | text | display name (`name ?? title` on read) |
| `description` | text | |
| `type`, `category`, `scope`, `audience` | text / text[] | classification |
| `status` | text | `draft` \| `in_review` \| `published` \| `archived` |
| `version` | text | current label, e.g. `1.2` (legacy single ints exist) |
| `content` | jsonb | `{summary, sections:[{heading, html?, text?, body?}]}` |
| `effective_date`/`effective_at`, `expiry_date`, `review_date`, `next_review_date`/`next_review_at`, `last_review`, `next_review` | date/timestamptz/text | schedule |
| `owner`, `owner_name`, `approver`, `approver_id` | text | people |
| `approved_at`, `approval_date` | timestamptz | set by the approval sync |
| `framework`, `linked_frameworks` | text / text[] | framework tags |
| `linked_control_ids` | text[] | → `controls.id` (edited via the controls multi-select) |
| `acknowledgment_required` | boolean | |
| `compliance_score` | numeric | |
| `tags`, `metadata`, `remarks` | text[]/jsonb/text | |
| `is_deleted`, `deleted_at` | boolean/timestamptz | soft delete |
| `org_id`, `tenant_id` | uuid/text | **DB default `current_user_org_id()` — never sent by the client**; RLS enforced |
| `created_at`, `updated_at`, `created_by`, `updated_by` | | |

The dormant counter columns `acknowledgment_count` / `attestations` /
`total_users` were **dropped** — acknowledgment progress is computed from
`policy_acknowledgments` rows, never from a stored counter.

### `policy_versions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `policy_id` | uuid FK → `policies.id` (CASCADE) | |
| `version` | text | label recorded at save time |
| `content` | text | JSON serialisation of the structured content |
| `status` | text | `recorded` |
| `changed_by`, `changelog` | text | actor + operator note |
| `org_id` | uuid | DB default, RLS |
| `created_at` | timestamptz | |

### `policy_templates` (global catalog, read-only to tenants)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK · `template_ref` unique | |
| `name`, `category`, `framework`, `clause_refs[]`, `description` | | |
| `body` | jsonb | same `{summary, sections}` shape as policy content |
| `version`, `is_system`, `created_at` | | |

### `policy_acknowledgments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `policy_id` | uuid FK → `policies.id` (CASCADE) | |
| `policy_version` | text | version acknowledged |
| `person_name` | text NOT NULL | |
| `person_email` | text | unique with (`policy_id`, `policy_version`) |
| `source` | text | `manual` \| `training` (CHECK) |
| `training_id` | uuid FK → `ai_trainings.id` (SET NULL) | when synced |
| `status` | text | `pending` \| `acknowledged` \| `declined` (CHECK) |
| `acknowledged_at`, `note` | | |
| `org_id` | uuid | DB default, RLS |
| `created_at`, `updated_at` | | `set_updated_at` trigger |

## Interlinks (both directions)

Outbound (from a policy):

- **Policies → Controls** — `policies.linked_control_ids[]` → `controls.id`;
  chips on the Controls tab of `/policies/:id`, edited in the Policies edit
  dialog.
- **Policies → Approvals** — `approvals.entity_type='policy'`,
  `entity_id = policies.id`; Approvals tab.

Inbound (Linked-records tab on `/policies/:id`, each resolved by id with
"Unavailable" fallback):

- **Trainings → Policy** — `ai_trainings.linked_policy_id` (AI Literacy).
- **AI apps → Policy** — `ai_apps.linked_policy_id` (AI Apps inventory).
- **Documents → Policy** — `documents.linked_entity_type='policy'` +
  `linked_entity_id`; document chips link to `/policies/:id`.
- **Controls → Policy** — `controls.linked_policy_ids[]`.
- **Acknowledgments → Training** — `policy_acknowledgments.training_id`.

Deep-link contract: `/policies?open=<uuid|ref>` redirects to the canonical
`/policies/:id`; list row clicks navigate there; the list's quick-view sheet
shows only a summary plus "Open record".

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 4 | Acknowledgment register ties policies to demonstrated staff awareness; training-completion sync makes the literacy evidence chain queryable |
| EU AI Act Art. 12 | `trg_audit` on all four tables + client `withAudit` events (`policy.submitted`, `policy.published`, `policy.archived`, `policy.acknowledged`) into the hash-chained audit log |
| EU AI Act Art. 17 | Versioned, approved policy corpus is the documented quality-management backbone |
| ISO/IEC 42001 5.2 | The AI policy itself: authored, approved, communicated, reviewed on schedule (`next_review_at`) |
| ISO/IEC 42001 A.4.4 | Policy ↔ training linkage evidences resource/competence management |

Approval decisions carry a real actor (`approver`, per-step `decisions`
ledger) and the decision→policy sync throws on failure, so the audit chain
can never show an approval the entity does not reflect.

## Operations

- **Migrations:** `supabase/migrations/` (content jsonb conversion, org_id
  defaults, status normalisation `approved`→`published`,
  `policy_acknowledgments` creation + seed). Verify replay with
  `python3 scripts/check_migration_replay.py`.
- **Duplicate submissions** are rejected client-side by the pending-approval
  guard; clearing a stuck request happens in Approval Workflows.
- **Restore** never deletes history — it appends a new version, so the audit
  trail stays monotonic.
- **Retention:** acknowledgment rows are evidence; do not hard-delete them
  when archiving a policy (FK cascades only fire on policy deletion, which
  the UI does not expose for published policies).

## Related

- [Approval Workflows](approval-workflows.md)
- [AI Literacy](ai-literacy.md)
- [Policy Firewall & Guardrails](policy-firewall.md) — runtime guardrails,
  distinct from this governance corpus
