# GenAI Risk Profiles

**Routes:** `/genai-risks`
**Status:** Production
**Owner:** Trust Engine · **Backing table(s):** `genai_risk_profiles` (org-scoped, RLS via `makeCrud`)

## Purpose
Model-level generative-AI risk catalogue aligned to the NIST AI 600-1
taxonomy, with severity assessment, guardrail coverage tracking, and
mitigation workflow.

## Why it exists
NIST AI 600-1 defines twelve risk categories specific to generative AI
(confabulation, data privacy, bias/discrimination, harmful content, IP,
cybersecurity, data poisoning, interpretability, human-AI confusion, dual
use, environmental impact, misuse facilitation). EU AI Act Art. 9 requires a
risk management system proportionate to the AI system's risk level. Without
a structured catalogue mapping each model to its applicable GenAI risks,
organisations cannot demonstrate they have identified, assessed, and
mitigated the risks unique to generative AI.

## How it works
1. Risk profiles are stored in `genai_risk_profiles` using the doc-jsonb
   pattern (`makeCrud`). Each profile links a model (`ai_models.id`) to one
   of the 12 NIST AI 600-1 risk categories.
2. The operator assigns a severity (Critical / High / Medium / Low) and
   documents current guardrails and their coverage level (None / Partial /
   Implemented).
3. Mitigation status is derived from coverage: `Implemented` if coverage is
   full, `Partial` if partial, otherwise `Under Review` (if already set) or
   `Not Addressed`.
4. Mitigation events are appended as a timestamped log within the profile.
5. The NIST 600-1 risk grid provides a visual overview — tiles are
   colour-coded by the highest severity in that category.
6. Deep-link support: `?model=<uuid>` filters to a specific model (with a
   dismissible chip), `?open=<id>` opens that profile's detail sheet.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatCardRow (4) | Total profiles, critical, high risk, not addressed | Read-only derived |
| NIST 600-1 grid | clickable card grid (12) | Shows each risk category with profile count; colour-coded by severity | Toggle filter `filterCategory` |
| Profile table | DataTable | Profiles with model, risk category, severity, coverage, status, owner | Read-only from `genai_risk_profiles` |
| Search box | filter | Filters by model name, id, or risk category | Client-side |
| Severity dropdown | filter | Filters by severity level | Client-side |
| Create profile | button + dialog | Records a new risk profile linked to a model | Writes to `genai_risk_profiles` |
| Edit profile | button + dialog | Updates an existing risk profile | Updates `genai_risk_profiles` |
| Delete profile | AlertDialog | Soft-deletes a risk profile | Soft-delete `genai_risk_profiles` |
| Detail sheet | slide-over (4 tabs) | Overview, NIST guidance, guardrails, mitigation log | Read-only |
| Guardrails link | button | Navigate to guardrails management | → `/trust-engine/guardrails` |
| Model link | button | Navigate to the linked model | → `/models/inventory/:id` |
| Model filter chip | dismissible chip | Active when `?model=<uuid>` is present; shows resolved model name | Dismissible client-side filter |

Nulls: unresolvable `modelId` shows "Unavailable". An empty profile list
shows an honest empty state. Profiles with `guardrails === 'None'` show a
no-guardrails empty state in the detail sheet.

## Fields

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | text (pk) | yes | `gen_random_uuid()::text` |
| org_id | text | auto | DB default `current_user_org_id()::text` |
| doc | jsonb | yes | Full `GenAIRiskProfile` entity |
| state | text | no | First-class column for indexing |
| model_id | text | no | First-class column — `ai_models.id` (uuid) |
| deleted_at | timestamptz | no | Soft-delete marker |
| version | integer | yes | Default 1; optimistic concurrency |
| created_at | timestamptz | yes | Default `now()` |
| updated_at | timestamptz | yes | Default `now()` |

**Doc-jsonb fields** (`GenAIRiskProfile`):

| Field | Type | Notes |
|---|---|---|
| modelId | string? | Canonical `ai_models.id` uuid |
| model | string | Display-name snapshot |
| riskCategory | string | One of 12 NIST AI 600-1 risk names |
| riskNumber | number | 1–12 |
| severity | enum | `Critical` / `High` / `Medium` / `Low` |
| guardrails | string | Comma-separated guardrail names; `"None"` if empty |
| guardrailCoverage | enum | `None` / `Partial` / `Implemented` |
| mitigationStatus | enum | `Implemented` / `Partial` / `Under Review` / `Not Addressed` |
| owner | string | From the central Users directory |
| mitigationEvents | array? | `{ date, action, user }` timeline entries |

## Interlinks
- **Outbound** — button to `/models/inventory/:id` (linked model),
  button to `/trust-engine/guardrails` (guardrail management).
- **Inbound** — reachable from sidebar nav (Trust Engine & Gateways group);
  Model Detail page governance cards link here via
  `/genai-risks?model=<model.id>`.

## Compliance
- **NIST AI 600-1** — all 12 generative-AI risk categories (confabulation,
  data privacy, bias/discrimination, harmful content, IP, cybersecurity,
  data poisoning, interpretability, human-AI confusion, dual use,
  environmental impact, misuse facilitation).
- **EU AI Act** — Art. 9 (risk management system).
- **ISO/IEC 42001** — A.5.4 (AI risk assessment).
- **NIST AI RMF** — MAP 2.3 (AI risks specific to the application context).

## Operations
Empty state: when no profiles exist, shows an honest empty state with a
create CTA. Source comment confirms "No seed fallback: an empty org renders
an honest empty state." CRUD operations use the doc-jsonb `makeCrud`
pattern. Writes throw on failure; success toasts fire only after the write
resolves, showing a `GRP-` display ID. Realtime: `genai_risk_profiles` is
subscribed for realtime cache invalidation via `useRealtimeInvalidation`.
Severity index in the detail sheet (Critical=92, High=74, Medium=48,
Low=22) is a derived display value, not a stored field.
