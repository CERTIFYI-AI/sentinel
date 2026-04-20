# Prompt Registry

**Route:** `/prompt-registry` · **Service:** `promptService.ts`

## Purpose
Central registry of system prompts, few-shot exemplars, retrieval templates, and agent instructions with versioning, access control, and eval linkage.

## Standards Alignment
| Control | Requirement |
|---|---|
| OWASP LLM01 | Prompt injection mitigation via approved templates |
| EU AI Act Art.15 | Robustness |
| ISO/IEC 42001 A.6.2.5 | AI system design and development |
| NIST AI RMF MANAGE 4.1 | Risk response tracked |

## Capabilities
- Semantic versioning, diff, rollback.
- Required tests: safety, PII, jailbreak, grounding.
- Binding to models and routes; shadow-rollout support.
- SoD: author ≠ approver; four-eyes for P0 prompts.
