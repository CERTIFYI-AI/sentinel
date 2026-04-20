# Policy Firewall & Guardrails

**Route:** `/guardrails`, `/policies`, `/prompt-registry` · **Services:** `policyFirewallService.ts`, `policyService.ts`, `promptService.ts`

## Purpose
Runtime enforcement layer between applications and LLM providers. Applies input/output policies (PII, secrets, jailbreak, toxicity, grounding, topic scope) and records every decision as evidence.

## Standards Alignment
| Control | Requirement |
|---|---|
| OWASP LLM Top 10 | LLM01 Prompt Injection, LLM02 Insecure Output, LLM06 Sensitive Info Disclosure |
| NIST AI RMF MEASURE 2.7 | Security and resilience testing |
| EU AI Act Art.15 | Accuracy, robustness, cybersecurity |
| ISO/IEC 42001 A.6.2.6 | System monitoring |
| SOC 2 CC7.1 | Detection of anomalies |

## Decision Model
`ALLOW | REDACT | BLOCK | ROUTE_HITL` with deterministic precedence. Inputs and outputs are streamed through the sanitizer, classifier, and policy engine; every decision is hashed and persisted to `guardrail_events` and `live_traces`.

## Policy Objects
- Policy sets bound to models, routes, or tenants.
- Versioned rules with test fixtures and rollback.
- Shadow mode for safe rollout.

## Observability
- Per-rule hit rate, false-positive rate, latency.
- Drift alerts when rule-hit distribution changes beyond threshold.
- All events feed Trust Engine scoring.
