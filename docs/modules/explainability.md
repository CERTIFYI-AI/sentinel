# Explainability & Transparency

**Routes:** `/explainability`, `/explainability-center`, `/explainability/:id`
**Status:** Production
**Owner:** AI Assets · **Backing table(s):** `explainability_profiles` (org-scoped, RLS via `useEvalsCrud`)

## Purpose
Model-level and decision-level explanations, transparency disclosures, and
provenance evidence for AI decisions — producing the documentation that
makes AI systems interpretable and contestable.

## Why it exists
EU AI Act Art. 13 and Art. 50 require transparency obligations. Art. 86
provides a right to explanation of individual decisions. GDPR Art. 13–15
and Art. 22 require meaningful information about automated decision logic.
ISO/IEC 42001 A.6.2.8 mandates system information for users. Without
documented explanations, high-risk AI decisions are uncontestable.

## How it works
1. Explainability profiles are stored in `explainability_profiles` via the
   evals CRUD pattern (`useEvalsCrud`).
2. Each profile documents the explanation technique (SHAP, LIME, integrated
   gradients, counterfactuals, attention visualisation, or natural-language
   rationales), the model it applies to, and the evidence.
3. RBAC gates create/update/delete operations.
4. Deep-link support: `?model=<uuid>` filters to a specific model,
   `?open=<id>` opens a specific profile.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Profile list | DataTable (7 cols) | Profiles with model, technique, status, last updated | Read-only |
| Create profile | form | Creates a new explainability profile | Writes to `explainability_profiles` |
| Edit profile | form | Updates an existing profile | Updates `explainability_profiles` |
| Delete profile | ConfirmDialog | Soft-deletes a profile | Updates `explainability_profiles` |
| Model filter chip | filter | Filters to a specific model via `?model=<uuid>` | Dismissible client-side filter |
| Model link | navigation | Navigate to the subject model | → `/models/inventory/:id` |
| Detail view | route | Full profile detail | → `/explainability/:id` |

Nulls: unresolvable `model_id` shows "Unavailable". An empty profile list
shows an honest empty state.

## Interlinks
- **Outbound** — navigation to `/models/inventory/:id` (subject model),
  `/explainability/:id` (profile detail).
- **Inbound** — reachable from sidebar nav (AI Assets group); model detail
  pages link to their explainability profiles. Provenance graph links back.

## Compliance
- **EU AI Act** — Art. 13 (transparency), Art. 50 (transparency obligations),
  Art. 86 (right to explanation).
- **GDPR** — Art. 13–15 (information about automated decisions), Art. 22
  (automated individual decision-making).
- **ISO/IEC 42001** — A.6.2.8 (system information for users).
- **ISO/IEC TS 6254** — objectives and approaches for explainability.
- **NIST AI RMF** — MEASURE 2.8, 2.9 (interpretability and explainability).

## Operations
Empty state: when no profiles exist, shows an honest empty state. CRUD
operations are RBAC-gated (`can('create')`, `can('update')`, `can('delete')`).
Soft-delete pattern. Writes throw on failure. Method selection is recorded
with each explanation. Realtime: not realtime; staleTime-based React Query
refresh.
