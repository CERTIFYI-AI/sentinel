# Remediation & Tasks

**Routes:** `/remediation`, `/remediation-tracker`, `/tasks` · **Services:** `remediationService.ts`, `taskService.ts`

## Purpose
Track corrective and preventive actions (CAPA) linked to gaps, findings, incidents, and exceptions; enforce SLA and evidence-of-closure.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 10.1–10.2 | Nonconformity and corrective action |
| ISO 9001 10 | Improvement |
| SOC 2 CC4.2 | Remediation of deficiencies |
| NIST AI RMF MANAGE 2, 4 | Risk treatment and continual improvement |

## Lifecycle
Open → Owner → Plan → Execute → Evidence attached → Independent verification → Close. Overdue items escalate and degrade Trust Score.
