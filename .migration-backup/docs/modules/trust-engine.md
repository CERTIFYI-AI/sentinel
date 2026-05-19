# Trust Engine

**Route:** `/trust-engine` · **Service:** `trustTraceService.ts`

## Purpose
Real-time composite scoring of every AI interaction (request, response, policy decisions, HITL outcomes, eval results) to surface live reliability and compliance posture — the "Trust Layer" promise.

## Standards Alignment
| Control | Requirement |
|---|---|
| NIST AI RMF MEASURE 3.1–3.3 | Trustworthiness characteristics measured |
| EU AI Act Art.13, 15 | Transparency + accuracy/robustness |
| ISO/IEC 42001 A.6.2.6 | Operation monitoring |
| ISO/IEC 25012 | Data quality |

## Trust Score Composition
Weighted, tenant-configurable blend of:
- Safety (policy decisions, guardrail hits).
- Security (prompt-injection detection, secret exposure).
- Quality (eval judge scores, golden-set regressions).
- Fairness (bias probes, disparate-impact metrics).
- Reliability (latency, error rates, fallback usage).
- Governance (HITL SLA adherence, evidence freshness).

All inputs are signed and hashable, so any score is reproducible from `live_traces` + `guardrail_events` + `hitl_reviews`.

## Consumers
Executive Center, Value Realization, Narrative Engine, and external webhooks for SIEM/BI.
