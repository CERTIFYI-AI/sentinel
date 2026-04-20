# Incident Management

**Route:** `/exceptions`, part of `/regulator-filings` intake · **Service:** `incidentService.ts`

## Purpose
Detect, triage, contain, remediate, and learn from security, privacy, operational, and AI-specific incidents (hallucination harm, model misuse, data leakage, safety event).

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.24–A.5.28 | IR planning, assessment, response, learning |
| NIST SP 800-61 r2 | Computer security IR handling |
| ISO/IEC 27035 | Information security incident management |
| EU AI Act Art. 72–73 | Post-market monitoring + serious incident reporting |
| DORA Art.17–23 | ICT incident management and classification |
| NIS2 Art.21(2)(b) | Incident handling |

## Lifecycle
Detect (alert, HITL, user complaint, eval regression, red-team) → Triage & classify (severity, category, regulator scope) → Contain → Eradicate → Recover → Post-incident review → Corrective actions.

## Key Controls
- Jurisdictional classifier auto-flags regulator obligations and initiates timers in Regulator-Filing Workspace.
- Blast radius computed from Asset and Supply-Chain graphs.
- Every status change and artefact is appended to `evidence_chain`.

## Metrics
MTTD, MTTR, repeat-incident rate, notification-SLA adherence, and root-cause distribution, published to Executive Center.
