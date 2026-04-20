# AI Advisor & Narrative Engine

**Routes:** `/ai-advisor`, `/narrative-engine` · **Edge function:** `ai-advisor` · **Service:** `complianceAgent.ts`

## Purpose
Retrieval-augmented assistant that answers GRC questions from *only* the tenant's own evidence, policies, and controls; Narrative Engine composes regulator- and executive-ready prose from structured data.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.13, 15 | Transparency, robustness |
| ISO/IEC 42001 A.6.2.5–6 | Design, operation |
| NIST AI RMF MEASURE 2.8, 2.9 | Interpretability |

## Safety Model
Grounding required on every answer, source citations mandatory, refusal on out-of-scope. All responses pass the Policy Firewall and are logged to `live_traces`.
