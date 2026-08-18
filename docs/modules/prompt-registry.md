# Prompt Registry

**Routes:** `/prompt-registry`
**Status:** Production
**Owner:** AI Assets · **Backing table(s):** `prompt_registry` (org-scoped, RLS via `usePromptRegistryData`)

## Purpose
Central registry of system prompts, few-shot exemplars, retrieval templates,
and agent instructions with versioning, access control, review workflow, and
model binding.

## Why it exists
OWASP LLM01 identifies prompt injection as a top risk — approved templates
mitigate it. EU AI Act Art. 15 requires robustness. ISO/IEC 42001 A.6.2.5
covers AI system design and development. Prompts are executable configuration
that shapes AI behaviour; they need the same governance as code — versioning,
review, and audit trail.

## How it works
1. Prompts are stored in `prompt_registry` with semantic versioning, content,
   model binding, category, and approval status.
2. Status workflow: Draft → Submitted → Approved/Rejected. Separation of
   duties: author ≠ approver.
3. Version bumps are tracked — each save increments the version and the
   previous content is preserved in history.
4. Model binding links prompts to their consuming models via `ai_models.id`.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatsRow (6) | Total prompts, approved, pending, rejected, models bound, avg version | Read-only from `prompt_registry` |
| Prompt cards | filterable grid | Prompt cards with title, version, status, model binding | Read-only |
| View detail | Sheet (5 tabs) | Content, Test, Safety Analysis, Version History, Meta | Read-only |
| Create prompt | dialog | Creates a new prompt record | Writes to `prompt_registry` |
| Edit prompt | Sheet | Full edit form with version bump | Updates `prompt_registry` |
| Delete prompt | button | Removes a prompt | Deletes from `prompt_registry` |
| Approve/Reject | buttons | Status transition with SoD check | Updates `prompt_registry` |
| Model links | PillLink | Navigate to bound models | → `/models/inventory/:id` |

Nulls: unbound prompts show `—` for model. An empty registry shows an
honest empty state.

## Interlinks
- **Outbound** — PillLink to `/models/inventory/:id` (bound models) via
  `UsedByModelsLinks` component.
- **Inbound** — reachable from sidebar nav (AI Assets group); model detail
  pages link to their bound prompts.

## Compliance
- **OWASP LLM01** — prompt injection mitigation via approved templates.
- **EU AI Act** — Art. 15 (robustness).
- **ISO/IEC 42001** — A.6.2.5 (AI system design and development).
- **NIST AI RMF** — MANAGE 4.1 (risk response tracked).

## Operations
Empty state: when no prompts exist, shows an honest empty state. SoD
enforcement: author cannot approve their own prompt. Version history is
preserved across edits. Writes throw on failure; RBAC-gated with
`can('create')`, `can('update')`, `can('delete')`. Realtime: not realtime;
staleTime-based React Query refresh.
