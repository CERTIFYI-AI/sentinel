# AI Literacy

**Route:** `/ai-literacy` · **Service:** `aiTrainingService.ts` · **Hook:** `useGovernAddons.ts` (`useTrainings`)
**Table:** `ai_trainings`

## Purpose

Training programmes that build AI competence across the organisation, with
enrolment, completion tracking and a link to the policy each programme teaches.

## Why this module exists

**EU AI Act Article 4 is a direct, enforceable obligation**: providers and
deployers must ensure a sufficient level of AI literacy among staff dealing with
AI systems. It applies from February 2025 and is not risk-tiered — it covers
everyone touching AI, not just high-risk systems.

Satisfying it requires evidence: who was trained, on what, when, and whether they
completed. A slide deck on a shared drive is not evidence.

This module provides:

1. **Programme definition** — audience, competency, delivery mode, duration.
2. **Completion evidence** — enrolment and completion per programme.
   (Art. 4; ISO 42001 A.4.2 competence)
3. **Policy linkage** — each programme links to the policy it operationalises, so
   "we have a policy" and "our people know it" are connected facts.
4. **Remediation** — incomplete training becomes a task with an owner and a date.

## Interlinks

- **Trainings → Policies** — `linked_policy_id`; the programme teaches that policy.
- **Trainings → Tasks** — incomplete training generates remediation work
  (`linked_entity_type = 'training'`).
- **TrainingUpdateAgent → Trainings** — on `INCIDENT_CREATED`, lessons learned
  become refresher assignments.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 4 | The primary evidence artefact for the AI-literacy obligation |
| EU AI Act Art. 12 | Enrolment and completion records retained |
| EU AI Act Art. 14 | Oversight staff are demonstrably competent to intervene |
| ISO/IEC 42001 A.4.2 | Competence |
| ISO/IEC 42001 A.4.3 | Awareness |

## Operations

- **Completion below target** is surfaced on the programme and should carry a
  task with a due date before the next audit window.
- **Retention:** completion records are evidence — retain for the audit period,
  do not hard-delete.
