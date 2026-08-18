# AI Risk Tiering

**Routes:** `/ai-risk-tiering`, `/ai-risk-tiering/:id`
**Status:** Production (tiering engine deterministic; obligation "Met/Gaps" counters and the Activity timeline are **derived**, not measured — see Operations)
**Owner:** AI Governance / Risk · **Backing table(s):** `ai_risk_tiering` (org-scoped, RLS)

## Purpose
Classify every AI system against the EU AI Act's four-tier risk model —
Unacceptable, High, Limited, Minimal — and record the *basis* for that decision,
the obligations it triggers, and the person accountable for it. It is the
gateway that routes each system to the correct governance pathway.

## Why it exists
EU AI Act **Article 6** (with **Annex III**) is the foundational obligation of
the whole regulation: it decides *whether a system is regulated at all and how
hard*. Everything downstream — the Article 9 risk-management system, Article 10
data governance, Article 11 technical documentation, Article 12 logging, Article
14 human oversight — is conditional on a system first being classified High-risk.
**Article 5** sits above this: a prohibited practice cannot be placed on the EU
market at any price. **Article 50** transparency duties attach to the Limited
tier (chatbots, synthetic content, undisclosed GPAI).

Misclassification is therefore the root compliance failure. Call a High-risk
recruitment or credit-scoring system "Limited" and every downstream control is
skipped legitimately-looking; call a prohibited practice "High-risk" and you
have documented a system you were never allowed to deploy. An auditor asked "on
what basis is this system classified?" needs a dated, attributed record with the
specific Annex III category or Article 5 practice cited. Without this module that
answer lives in a spreadsheet, or nowhere.

## How it works
A record is created through a **three-step wizard** ("Classify System"):

1. **System selection.** Choose a registry model (`ai_models.id`) *or* enter a
   free-text system name, plus intended use case, an optional linked use case
   (`use_cases.id`), affected users, review-due date, the classifier/owner
   (required), and fundamental-rights notes.
2. **Classification questionnaire** (the `TieringInput`). Article 5 prohibited
   practices (multi-select), Annex III high-risk categories (multi-select), and
   five yes/no questions: automated decision affecting fundamental rights,
   interacts with people, generates synthetic content, is GPAI, discloses AI
   use. The computed tier updates live as answers change.
3. **Review & confirm.** Shows the final tier, resolved system name, basis
   sentence, and the applicable obligations before the write.

The tier is **derived deterministically** by `deriveEuTier()` in
`riskTieringService.ts` — a strict precedence, not a score threshold:

| Precedence | Condition | Tier | Score | Obligations attached |
|---|---|---|---|---|
| 1 | Any Article 5 prohibited practice selected | **Unacceptable** | 1.0 | "Prohibited under Article 5 — must not be placed on the EU market." |
| 2 | Any Annex III category **or** affects fundamental rights | **High** | 0.8 | The 7 `HIGH_RISK_OBLIGATIONS` (Art. 9–15) |
| 3 | Interacts with humans **or** generates synthetic content **or** (GPAI **and** not disclosed) | **Limited** | 0.35 | "Transparency / AI-use disclosure (Art. 50)" |
| 4 | None of the above | **Minimal** | 0.1 | none |

The `basis` string is generated from the triggering inputs (e.g. `Annex III
high-risk: Employment / recruitment`), so the record carries a human-readable
justification, not just a label. On confirm, `save.mutate()` upserts the row;
the success toast fires **only after the write resolves**, and the write throws
(surfacing `err.message` as an error toast) on failure.

**State transitions** are `draft → in_review → approved`, driven from the detail
sheet's Workflow bar ("Move to Review", "Approve"). New classifications start as
`draft`.

**Autonomy / oversight:** this module has **no auto-agent writer** — every
classification is human-authored (`source` field is not used here) and the
classifier is a required free-text field. There is no Article 14 gate *inside*
this module because it does not act autonomously; it is itself the input that
tells other modules whether Article 14 oversight is required.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| **Classify System** | button (header) | Opens the 3-step wizard | On confirm, upserts a row into `ai_risk_tiering`; toast fires only after the write resolves |
| KPI stat cards (Unacceptable / High / Limited / Minimal) | stat row | Live counts per tier over all loaded records | Read-only; counts render as `0` numerically (these are true counts, not nullable metrics) |
| Tier overview cards (4) | reference cards | Static explainer of each tier with regulatory examples | Read-only; no data |
| Risk Distribution chart | horizontal bar (recharts) | Same four tier counts as a bar chart | Read-only |
| Search box | filter | Filters table by system name, id, or classifier (case-insensitive) | Client-side narrow only |
| Model filter chip | dismissible chip | Appears on deep link `?model=<uuid>`; label resolves to model name or **"Unavailable"** | `X` clears the filter via `setSearchParams({})` |
| Table row (click) | navigation | Opens the detail sheet for that classification | No write |
| System-name pill link | pill link | Under each system, links to its registry model | Navigates to `/models/<uuid>`; shows **"Unavailable"** if the id can't be resolved |
| Eye (view) | button | Opens the detail sheet | No write |
| Trash (delete) | button → confirm dialog | Deletes the classification after confirmation | `remove.mutate(id)` deletes the row; throws on failure; dialog is destructive-styled |
| **Move to Review** | button (sheet) | Sets `status = 'in_review'` | `save.mutate({id, status})`; disabled while pending or already in that state |
| **Approve** | button (sheet) | Sets `status = 'approved'` | Same; toast after resolve |
| Classification tab | detail | Basis, tier, risk score, Annex III, GPAI, use case, affected users, rights impact, status, classifier, classified/review dates | Read-only |
| Obligations tab | detail | Lists the stored obligations for the tier (Prohibit icon for Unacceptable, check icon otherwise) | Read-only |
| Linked Model tab | detail | Model card, linked use-case pill, obligation counters, "View Full Model Record" | Navigates to `/models/<uuid>` / `/use-cases/<uuid>` |
| Activity tab | detail | Timeline of created / tier-assigned / status events | **Derived** from stored fields — not a real audit log (see Operations) |
| Wizard "Next / Back / Confirm" | buttons | Step navigation; Confirm is disabled until system + classifier are valid and no save is pending | Confirm triggers the upsert |

**Table columns:** System (name + model pill), EU AI Act Tier (badge), Basis
(`classification_basis`, truncated, `—` when empty), GPAI (Yes badge / "No"),
Obligations (count of `obligations`), Status (badge), Classifier (`—` when
empty), Actions. Null/empty text renders as **`—`**, never `0` or a blank.

**Detail-sheet counters** (Linked tab): "Total Obligations" = `obligations.length`;
"Met" = the full total **only if** status is `approved`, else `0`; "Gaps" =
Total − Met. This is a **derived proxy**, not evidence that each obligation was
independently satisfied — treat it as a workflow indicator.

## Fields
Matches `ai_risk_tiering` as created in `007_replay_baseline.sql`. Core columns
are first-class; the model/use-case interlinks and questionnaire detail live in
`metadata` (jsonb) and are mapped in `fromRow` / `toRow`.

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | uuid | pk | `gen_random_uuid()` default |
| org_id | uuid | auto | DB default `current_user_org_id()` (set in `20260813000004_aiia_wiring_foundation.sql`); never set client-side |
| system_id | uuid | — | Registry model id when a model was picked; normalized `'' → null` on write |
| system_name | text | yes | Resolved model name or free-text; the required "system" value in the wizard |
| risk_tier | text | yes | `unacceptable` \| `high` \| `limited` \| `minimal`; defaults to `limited` in `fromRow` if absent |
| risk_score | numeric | — | 1.0 / 0.8 / 0.35 / 0.1 from the engine; renders `—` when null, `.toFixed(2)` otherwise |
| use_case | text | — | Free-text intended purpose; `—` when empty |
| affected_users | text | — | e.g. "Loan applicants (EU)"; `—` when empty |
| fundamental_rights_impact | text | — | Notes; `—` when empty |
| classification_basis | text | — | Engine-generated justification sentence; `—` when empty |
| classifier | text | yes | Owner/classifier name (required in wizard) |
| classified_at | timestamptz | — | Set to now() on create; list is ordered by this desc, nulls last |
| review_due_at | timestamptz | — | Optional review date; `—` when null |
| status | text | — | `draft` \| `in_review` \| `approved`; defaults to `draft` |
| metadata | jsonb | — | Holds `model_id`, `use_case_id`, `annexIII[]`, `obligations[]`, `gpai` |
| created_at | timestamptz | auto | `now()` default |
| updated_at | timestamptz | auto | Set by `toRow` on every write (live column) |

Resolved-name fields: `metadata.model_id` → `ai_models.id` (rendered as model
name, **"Unavailable"** if unresolved); `metadata.use_case_id` → `use_cases.id`
(rendered as use-case title, **"Unavailable"** if unresolved).

## Interlinks
Both directions are wired through `metadata` ids, resolved to names at render.

- **Outbound → Model Registry.** Each classification stores `metadata.model_id`
  (an `ai_models.id`). The table's system pill and the Linked-Model tab's "View
  Full Model Record" navigate to `/models/<uuid>`. Unresolvable ids render
  **"Unavailable"**, never a raw uuid.
- **Outbound → Use Cases.** Optional `metadata.use_case_id` (a `use_cases.id`)
  renders as a pill in the Linked-Model tab, navigating to `/use-cases/<uuid>`.
- **Inbound ← Model Detail.** The Governance card on `/models/:id`
  (`ModelDetail.tsx` line ~599) shows the model's current tier via
  `useModelGovernance()` and deep-links to `/ai-risk-tiering?model=<uuid>`,
  which pre-filters this list to that model with a dismissible chip.
- **Inbound ← Overview / Command Palette / Setup checklist.** The Overview
  quick-action "Classify AI System", the command-palette entry "Risk
  Classification", and a setup-checklist step all route to `/ai-risk-tiering`.
- **Deep links.** `?model=<uuid>` filters the list; `?open=<id>` (and the
  canonical `/ai-risk-tiering/:id` redirect) opens that record's detail sheet.

**Proving `total == resolves`** (run against the tenant): every classification
with a model link resolves to a live model —
`select count(*) total, count(m.id) resolves from ai_risk_tiering t left join
ai_models m on m.id = (t.metadata->>'model_id')::uuid where t.metadata->>'model_id'
is not null;` — `total` must equal `resolves`. The seed rows in
`20260813000015_seed_aiia_modules.sql` all reference real `ai_models` ids
(Credit Risk Scorer, Fraud Detection Engine, HRScreener Bot, etc.).

## Compliance
- **EU AI Act** — this module is the direct implementation of **Article 5**
  (prohibited practices → Unacceptable), **Article 6 + Annex III** (High-risk
  classification), and **Article 50** (transparency → Limited). The obligations
  it attaches to a High-risk record cite **Art. 9–15** verbatim.
- **⚠️ Mapping gap (real, not invented).** As of this writing the module is
  **NOT yet mapped** in `docs/compliance/eu-ai-act-mapping.md`. That document
  maps Art. 9, 10, 12, 13, 14, 15 to *downstream* modules but has **no row for
  Article 5, Article 6, or Annex III risk classification** and does not name
  this module. (The `Art. 6 / 7` row at line 103 is GDPR Art. 6/7 consent, a
  different framework.) Likewise `docs/compliance/iso-42001-mapping.md` maps
  **6.1.2 AI risk assessment** to "Trust score pipeline" and **6.1.3 AI risk
  treatment** to "Circuit breaker cascade" — **not** to this tiering module,
  even though tiering is the more literal 6.1.2 fit. The compliance audit's
  finding that the foundational AI-Act modules are unmapped applies here: the
  gateway obligation of the entire regulation currently has no traceable
  mapping row. This must be added before merge or recorded as accepted debt in
  `docs/reference/technical-debt.md`.
- **Art. 12 audit logging — GAP.** The page/service/hook contain **no
  `logAction` call**. Create, status transition, and delete are not written to
  the audit log, so a state-changing classification decision currently leaves no
  attributed audit trail beyond the row's own `classifier`/`updated_at`. The
  Activity tab is **derived from stored fields, not the audit log**, and must
  not be presented as one. This is a compliance gap for an Article-12-critical
  module and should be remediated or logged as debt.
- **Art. 14 human oversight** — **N/A (with reason):** the module does not act
  autonomously; every classification is human-authored with a required
  classifier. It produces the signal that determines whether *other* modules
  owe Article 14 oversight.
- **NIST AI RMF** — **MAP 5.1** (AI system impact characterised/categorised) is
  the natural fit; not currently recorded in a NIST mapping doc.
- **Secrets / PII** — none stored; seed rows are fictional and labelled as demo.

## Operations
- **Seeding / backfill.** Demo rows are inserted by
  `supabase/migrations/20260813000015_seed_aiia_modules.sql` (six fictional
  systems across all tiers) with `on conflict (id) do nothing`; a further seed
  in `20260816000005_seed_nepal_assess_validate.sql` also touches the table.
  All demo data is fictional and org-scoped.
- **Empty state.** With no rows the table shows "No classifications yet —
  classify your first AI system."; with a non-matching search it shows "No
  classifications match your search." Loading shows a spinner row; error shows
  "Failed to load classifications: <message>". All three states are present.
- **Writes throw.** `upsertRiskClassification` / `deleteRiskClassification`
  throw the Supabase error message; when Supabase is unconfigured they throw
  "Supabase is not configured — cannot save/delete classification." Fetch also
  throws (it does not silently swallow), so the table surfaces a real error.
- **Realtime.** None — the list is a React Query with `staleTime: 20_000` that
  invalidates the `['risk-tiering']` key on every mutation. There is no
  Supabase realtime channel here (unlike `useModelAnalytics`), so a
  classification created in another session appears only after refetch.
- **RLS.** `ai_risk_tiering` is a live-only table: it is in the *skip list* of
  `20260421000014_ws02_tenancy_sweep.sql` (its RLS policies and `org_id` NOT
  NULL/FK were applied live via Supabase MCP, not in a repo migration), and its
  `org_id` default is set in `20260813000004_aiia_wiring_foundation.sql`.
  Because the policy DDL is not in the repo, a from-zero replay creates the
  table (baseline `007`) **without** the org-isolation policy — a replay/repo
  drift worth tracking as debt.
- **Known debt.** (1) Compliance mapping rows for Art. 5 / 6 / Annex III and
  ISO 6.1.2 missing; (2) no `logAction` audit logging; (3) RLS policy for this
  table is live-only and not reproduced in a migration; (4) "Met/Gaps"
  obligation counters and the Activity timeline are derived proxies, not
  measured evidence. Record these in
  [`docs/reference/technical-debt.md`](../reference/technical-debt.md) with an
  owner.
