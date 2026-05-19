# Kill-Switch & Emergency Controls

**Route:** `/kill-switch-events` · **Service:** `agentService.ts` (control plane)

## Purpose
Emergency disablement of models, agents, prompts, policies, or entire features with full audit trail and post-event review.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.14(4)(e) | Ability to intervene or interrupt |
| ISO/IEC 42001 A.9.3 | Human oversight including override |
| NIST AI RMF MANAGE 2.3 | Post-deployment override mechanisms |
| DORA Art.12 | ICT response and recovery |

## Design
Scoped triggers (tenant, route, model), dual-approval for production, instantaneous propagation via control channel, auto-generated incident and post-mortem task.
