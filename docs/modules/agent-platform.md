# Agent Platform (Registry, Discovery, IAM, Choreography)

**Routes:** `/agents`, `/agent-registry`, `/agent-discovery`, `/agent-iam`, `/multi-agent-choreography`, `/automation-studio`, `/workflows` · **Services:** `agentService.ts`, `agentsService.ts`

## Purpose
Govern autonomous and human-in-the-loop agents: registration, capability declaration, identity and entitlements (non-human identity), orchestration, and safety rails.

## Standards Alignment
| Control | Requirement |
|---|---|
| OWASP LLM Top 10 (Agentic) | Excessive agency, tool misuse |
| EU AI Act Art.14, 15 | Oversight, robustness |
| ISO/IEC 42001 A.9 | Use of the AI system and oversight |
| NIST AI RMF MANAGE 2.1 | Risk response tracked post-deployment |
| NIST SP 800-207 | Zero-trust applied to workload identities |

## Agent Record
Identity (workload ID), declared tools, permissions (least-privilege), policy set, HITL checkpoints, kill-switch binding, owner, lifecycle state.

## Choreography
Deterministic routing of multi-agent workflows with observable span-level traces feeding Trust Engine and Evidence Chain.
