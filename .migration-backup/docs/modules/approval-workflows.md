# Approval Workflows

**Route:** `/approval-workflows` · **Service:** orchestrated by `taskService.ts`

## Purpose
Configurable multi-stage approvals for high-impact actions: model deployment, prompt changes, policy publication, vendor onboarding, data-export, DSR fulfilment, regulator filing.

## Standards Alignment
| Control | Requirement |
|---|---|
| SOC 2 CC5.2, CC8.1 | Policy and change management |
| ISO/IEC 27001:2022 A.8.32 | Change management |
| NIST SP 800-53 CM-3 | Configuration change control |
| ISO/IEC 42001 A.6.2.7 | Deployment |

## Features
Branching conditions, SoD enforcement via IGA, SLA timers, delegation windows, and immutable decision record.
