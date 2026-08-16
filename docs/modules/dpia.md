# DPIA — Data Protection Impact Assessments

**Route:** `/dpia` · **Service:** `dpiaService.ts` · **Hook:** `useDpiaRecords.ts`
**Table:** `dpia_assessments`

## Purpose

The GDPR Article 35 register: assessments carried out *before* processing that
is likely to result in a high risk to individuals, plus the Article 36
prior-consultation trigger when residual risk stays high after mitigation.

## Why this module exists

Article 35 is a **precondition**, not a report. Processing that requires a DPIA
and does not have one is unlawful from the first record processed — the defect
is not discovered at audit, it exists from day one.

Most AI in a bank triggers it: Art. 35(3)(a) names systematic and extensive
automated evaluation producing legal effects, which is exactly what a credit
scoring model does.

This module answers:

1. **Was an assessment done before processing began?** (Art. 35(1))
2. **Is the processing necessary and proportionate?** — recorded as an explicit
   justification, not assumed. (Art. 35(7)(b))
3. **What risks were identified, and what actually reduces them?**
   (Art. 35(7)(c)–(d))
4. **Does residual risk oblige consultation with the supervisory authority?**
   (Art. 36(1)) — the module computes this rather than leaving it to memory.

## How it works

Each row is one assessment. The governance-bearing distinction is between
**inherent risk** (`risk_level`) and **residual risk** (`residual_risk_level`,
nullable, meaning "not yet assessed").

**The Art. 36 trigger is computed, not asserted:** an assessment whose residual
risk is `high` or `critical` with no `consultation_date` is flagged as
"consultation due" in the list and counted on the header. That is the condition
Art. 36(1) actually states, so the register cannot quietly disagree with the law.

`linked_ropa_id` ties the assessment to the processing activity it covers, and
`linked_model_ids` to the AI systems in scope — so a model record, a RoPA entry
and its DPIA are one chain rather than three disconnected documents.

Deletion is a **soft delete**: a superseded assessment is evidence of what was
known and decided at the time.

## Fields

| Column | Type | Meaning |
|---|---|---|
| `id` / `org_id` | uuid | Canonical id; tenant defaulted DB-side |
| `reference` | text | Human reference (DPIA-2026-001) |
| `title` / `description` | text | What is being assessed |
| `processing_purpose` | text | Why the processing happens |
| `necessity_justification` | text | Art. 35(7)(b) necessity and proportionality |
| `data_categories` | text[] | Categories of personal data in scope |
| `data_subjects` | text | Who is affected |
| `risk_level` | text | Inherent risk: `low`·`medium`·`high`·`critical` |
| `identified_risks` | text | Art. 35(7)(c) risks to rights and freedoms |
| `mitigation_measures` | text | Art. 35(7)(d) measures addressing those risks |
| `residual_risk_level` | text | After mitigation; **null = not yet assessed** |
| `consultation_required` / `consultation_date` | bool / date | Art. 36 |
| `status` | text | `draft`·`in_progress`·`pending_review`·`approved`·`rejected` |
| `dpo_opinion` / `dpo_reviewed_at` | text / date | Art. 35(2) DPO advice |
| `approved_by` / `approved_at` | text / date | Sign-off |
| `next_review_at` | date | Re-assessment date; overdue is flagged |
| `owner_name` | text | Accountable owner |
| `linked_model_ids` | uuid[] → `ai_models.id` | AI systems covered |
| `linked_ropa_id` | uuid → `ropa_records.id` | The processing activity assessed |
| `is_deleted` | boolean | Soft delete — assessments are evidence |

## Interlinks

- **DPIA → RoPA** — `linked_ropa_id`; the activity this assessment covers.
- **RoPA → DPIA** — a record with `dpia_required && !dpia_completed` links here
  and is counted as "DPIA outstanding".
- **DPIA → Models** — `linked_model_ids`; pills deep-link to the model record.
- **DPIA → AI Impact Assessments** — header link; the AI Act assessment is the
  sibling artefact to the GDPR one.

## Compliance

| Control | How this module satisfies it |
|---|---|
| GDPR Art. 35 | The register itself, with necessity, risks and mitigations recorded |
| GDPR Art. 35(2) | DPO opinion and review date captured |
| GDPR Art. 36 | Consultation trigger computed from residual risk, not asserted |
| GDPR Art. 22 | Automated-decision processing is assessed before it runs |
| EU AI Act Art. 9 | Risk management for the AI systems linked to the assessment |
| EU AI Act Art. 12 | Lifecycle audit-logged; soft delete retains the record |
| ISO/IEC 42001 A.5.2 | AI system impact assessment |

## Operations

- **Residual risk high with no consultation date** is the flag that matters.
  Either reduce the risk or consult the supervisory authority — the register
  will keep showing it until one of those happens.
- **Review cadence:** set `next_review_at` on approval. Overdue reviews are
  flagged in the list.
- **Retention:** never hard-delete. A superseded DPIA evidences the decision
  made at the time.
