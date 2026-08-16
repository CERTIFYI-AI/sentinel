# Eval Techniques

**Route:** `/evals/techniques` · **Service:** `evalTechniqueService.ts` · **Hook:** `useEvalTechniques.ts`
**Table:** `eval_techniques`

## Purpose

The catalogue of evaluation methods the organisation runs against its models —
what each technique measures, how often it must run, who owns it, when it is next
due, and which models it governs.

## Why this module exists

Validation runs answer *"how did this model score?"*. This module answers the
prior question: *"what are we obliged to test at all, and are we current?"*

Regulators do not accept a validation report in isolation; they ask whether the
testing regime is defined, risk-proportionate and actually followed. A model with
a good accuracy score and an eighteen-month-overdue fairness audit is a finding,
and without a catalogue that overdue state is invisible.

Concretely this module provides:

1. **A defined evaluation regime** — the set of techniques, not ad-hoc runs.
   (EU AI Act Art. 9 risk management; ISO 42001 A.6.2.4)
2. **Cadence and currency** — each technique has a cadence and a next-due date,
   so "overdue" is a computed fact rather than an opinion. (Art. 9, Art. 15)
3. **Coverage** — which models each technique applies to, so gaps are visible.
   (Art. 9; ISO 42001 A.6.2.2)
4. **Ownership** — a named human accountable for each method. (ISO 42001 A.3.2)

## How it works

Each row defines one technique. `cadence` (`continuous` → `annual` or `ad_hoc`)
plus `next_due_at` drive the overdue calculation shown in the list and rolled up
on the Validation Lab.

**Recording a run** writes `last_run_at`, sets status to `completed` and rolls
`next_due_at` forward by the cadence — so currency is maintained by the act of
running the technique, not by someone remembering to update a date.

`linked_model_ids` scopes a technique to specific models; those pills deep-link
into the model record. An **empty array means the technique applies across the
whole inventory**, which the UI states explicitly as "all models" rather than
leaving it ambiguous.

`methodology` and `scoring_method` capture *how* the technique is executed and
*what* the resulting number means — the two things an auditor asks for after
seeing a score.

## Fields

| Column | Type | Meaning |
|---|---|---|
| `id` / `org_id` | uuid | Canonical id; tenant defaulted DB-side |
| `name` | text | Technique name |
| `description` | text | What it measures, in plain language |
| `category` | text | `performance` · `fairness` · `robustness` · `security` · `quality` · `explainability` · `privacy` · `other` |
| `methodology` | text | How the technique is executed |
| `scoring_method` | text | What the resulting number means |
| `example_prompt` | text | For generative techniques, a representative probe |
| `applicable_types` | text[] | Model types the technique suits |
| `cadence` | text | `continuous` · `monthly` · `quarterly` · `semiannual` · `annual` · `ad_hoc` |
| `status` | text | `planned` · `in_progress` · `completed` · `blocked` |
| `last_run_at` / `next_due_at` | date | Currency; `next_due_at` in the past = overdue |
| `owner` | text | Accountable human |
| `linked_model_ids` | uuid[] → `ai_models.id` | Scope; empty = all models |
| `icon_key` | text | Stable icon key, so the choice survives a library change |
| `reference_url` | text | External standard or method reference |
| `is_deleted` | boolean | Soft delete — techniques are referenced by evidence |

## Interlinks

- **Techniques → Models** — `linked_model_ids`; pills deep-link to
  `/models/inventory/:id`.
- **Techniques → Validation Lab** — header link; the Lab is where runs of these
  techniques are recorded.
- **Validation Lab → Techniques** — carries the live catalogue count and the
  overdue count, so the regime's currency is visible from the run list.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 9 | A defined, risk-proportionate testing regime with owners and cadence |
| EU AI Act Art. 10 | Fairness and privacy techniques evidence data-governance testing |
| EU AI Act Art. 12 | All CRUD and run records audit-logged via `logAction` |
| EU AI Act Art. 15 | Robustness and accuracy techniques with recorded currency |
| ISO/IEC 42001 A.6.2.4 | AI system verification and validation planning |
| ISO/IEC 42001 A.6.2.2 | Objectives for the AI system, tested against |
| ISO/IEC 42001 A.3.2 | Documented roles and accountability |

## Operations

- **A technique goes overdue:** the list and the Validation Lab chip both flag it
  in the error tone. Run it, then use **Record run** so the due date rolls.
- **Scoping to models:** leave `linked_model_ids` empty only when the technique
  genuinely applies inventory-wide; otherwise scope it, so the model record shows
  what governs it.
- **Retention:** soft-deleted, because historical validation runs reference the
  technique that produced them.

## History

This module previously ran on a generic `evaltechniques_table (id, doc jsonb)`
demo table seeded from a hardcoded array, with add/edit/delete writing to local
state only and toasting success regardless of outcome. A real `eval_techniques`
table existed but held zero rows and was never read. The table was extended with
the fields the module needs and the page repointed at it — see
`supabase/migrations/20260816000006_eval_techniques_canonical.sql`.
