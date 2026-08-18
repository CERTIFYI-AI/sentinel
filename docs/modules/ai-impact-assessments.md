# AI Impact Assessments (AIIA)

**Route:** `/aiia`, `/aiia/:id` ·
**Backing:** `ai_impact_assessments` (org-scoped) ·
**Service:** `dashboard/src/services/impactAssessmentService.ts` ·
**Hook:** `dashboard/src/hooks/useAiiaData.ts` ·
**Code:** `dashboard/src/pages/AIImpactAssessments.tsx`

## Purpose

The register of impact assessments carried out on AI systems — FRIA, DPIA and
AIIA alike. Each record ties a model or use case to an assessed risk level, the
findings behind that judgement, the mitigations agreed, and the review date at
which the judgement expires.

## Why it exists

An AI system's risk classification is a claim, and a claim an auditor will ask
you to evidence. The EU AI Act requires a fundamental-rights impact assessment
for high-risk deployments (Art. 27) and GDPR requires a DPIA where processing is
likely to be high risk (Art. 35). This module is where that assessment lives as
a record with an owner, a reviewer and an expiry — rather than as a document
somebody once wrote.

## How it works

- The list reads `ai_impact_assessments` through `useAiiaData`, with filters for
  status, type and risk level, and CSV export via `exportCsv`.
- A record moves through `draft → in_review → approved | rejected`. `progress_pct`
  tracks completion; `rag_status` (`green | amber | red`) carries the assessor's
  headline judgement separately from `risk_level`.
- `findings` and `mitigations` are `jsonb` arrays edited on the record's
  **Overview** and **Mitigations** tabs.
- `next_review` is the date the assessment must be revisited. `approved_at`
  records when sign-off happened.
- Reads and writes throw on failure, so the page renders a real error state
  rather than an empty list that looks like "no assessments".

## Fields

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key |
| `assessment_id` | text | Human-facing reference |
| `title` | text | Assessment name |
| `assessment_type` | text | FRIA / DPIA / AIIA |
| `model_id` | uuid | → `ai_models.id` — the one model id-space |
| `use_case_id` | text | → `use_cases.id` |
| `risk_level` | text | `low` \| `medium` \| `high` \| `critical` |
| `status` | text | `draft` \| `in_review` \| `approved` \| `rejected` |
| `progress_pct` | numeric | Completion, 0–100 |
| `assessor_id` / `reviewer_id` | text | Who performed and who reviewed |
| `summary` | text | Narrative conclusion |
| `affected_entities` | text[] | Groups or systems in scope |
| `rag_status` | text | `green` \| `amber` \| `red` |
| `findings` | jsonb | Findings raised |
| `mitigations` | jsonb | Mitigations agreed |
| `approved_at` | timestamptz | Sign-off time |
| `next_review` | date | When the assessment expires |
| `org_id` | uuid | Tenant scoping |
| `tenant_id` | text | NOT NULL, DB default `current_user_org_id()::text` |

## Interlinks

- **→ Model Registry.** `model_id` resolves against `ai_models.id`; the
  assessment deep-links to `/models/inventory/<id>`.
- **→ Use Cases.** `use_case_id` resolves against `use_cases.id`.
- **← Risk Classification.** A model's tier is evidenced by its assessments.
- `/aiia/:id` is a stable, shareable URL for a single record (`RecordDeepLink`).

## Compliance

- **EU AI Act Art. 27** — fundamental-rights impact assessment for high-risk
  deployments: this is the register that holds them.
- **EU AI Act Art. 9** — risk management as a continuous process; `next_review`
  is what makes it continuous rather than one-off.
- **GDPR Art. 35** — DPIA, carried as an `assessment_type`.
- **ISO/IEC 42001 §6.1.2 / §8.2** — AI risk assessment and impact assessment.

### Known gap

This module does **not** currently write to the audit log — `logAction` does not
appear in its page or service. Approving or rejecting an assessment is a
state-changing governance decision, so it should be traceable under EU AI Act
Art. 12. Recorded here rather than left implicit; closing it means adding
`logAction` on the status-transition and delete paths.

## Operations

- Table is org-scoped. `tenant_id` is NOT NULL with a DB default, so the client
  must not send it (CLAUDE.md First principle #3).
- `model_id` is `uuid` and `use_case_id` is `text` — they are deliberately
  different types because the two parent tables key differently. Do not
  "normalise" one to the other without migrating the parent.
