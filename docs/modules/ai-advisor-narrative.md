# AI Advisor & Narrative Engine

**Routes:** `/ai-advisor`, `/narrative-engine`
**Status:** Not connected (AI Advisor); Production (Narrative Engine)
**Owner:** Platform · **Backing table(s):** AI Advisor: none — the module renders an honest empty state. Narrative Engine: `transparency_reports` (org-scoped, RLS) via `governanceFactsService.ts`

## Purpose
AI Advisor is not connected. It previously shipped a keyword-matched
simulation whose canned answers asserted specific organisation-level figures,
and a "Take action" button that reported success while writing nothing. Both
were removed (TD-025); the route now renders an empty state naming the
missing pipeline. What follows describes the intended module, not current
behaviour.

When built, AI Advisor is a compliance co-pilot that responds to GRC questions
with keyword-matched canned text. Narrative Engine composes governance
narratives from real structured data for board reports and regulator
disclosures.

## Why it exists
EU AI Act Art. 13 and Art. 15 require transparency and robustness. ISO/IEC
42001 A.6.2.5–6 covers AI system design and operation. A compliance officer
needs a way to query the organisation's governance posture and generate
regulator-ready prose. The Narrative Engine is the production component; the
AI Advisor is a placeholder for a future RAG-backed assistant (AI Brain).

## How it works

### AI Advisor (not connected — target design)
1. Chat panel with keyword-matched responses from a hardcoded `RESPONSES`
   array — not a live AI model.
2. Advisory queue with `SUGGESTIONS` cards (static, illustrative).
3. **Simulation banner** is displayed: "Responses are keyword-matched canned
   text, not a live AI model. Suggestions and metrics shown below are
   illustrative examples, not derived from your data."
4. No data is read from or written to any table.

### Narrative Engine (Production)
1. Composes audience-targeted governance prose from real register data via
   `governanceFactsService`.
2. Facts show null-not-0, with the source query visible behind each figure.
3. The NarrativeEngine mesh agent writes generated reports to
   `transparency_reports`.
4. Agent writes are strict: `NARRATIVE_UPDATED` carries only the audiences
   whose rows persisted.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Chat panel | simulated | Keyword-matched canned responses | No backend interaction |
| Suggestions queue | card grid | Illustrative advisory cards | Static, no writes |
| Quick prompts | buttons | Pre-set compliance questions | Triggers canned response |
| Simulation banner | warning | Labels page as simulation | Read-only indicator |
| Narrative composer | form | Generates governance prose from real data | Writes to `transparency_reports` |
| Audience selector | dropdown | Targets narrative to board/regulator/auditor | Scopes composition |

Nulls: AI Advisor shows static data only. Narrative Engine renders `—` for
unmeasured figures.

## Interlinks
- **Outbound** — AI Advisor: none. Narrative Engine: writes to
  `transparency_reports` (→ `/transparency-reports`).
- **Inbound** — reachable from sidebar nav. Narrative Engine is invoked by
  the mesh's NarrativeEngine agent.

## Compliance
- **EU AI Act** — Art. 13 (transparency), Art. 15 (robustness).
- **ISO/IEC 42001** — A.6.2.5–6 (design, operation).
- **NIST AI RMF** — MEASURE 2.8, 2.9 (interpretability).
- N/A for Art. 12 audit logging on AI Advisor (no state changes).

## Operations
AI Advisor: pure simulation — no backend, no state, no writes. The
simulation label is mandatory and must not be removed until replaced by a
live AI model (AI Brain). Narrative Engine: all responses pass the Policy
Firewall and log to `live_traces`. Agent writes throw on failure.
