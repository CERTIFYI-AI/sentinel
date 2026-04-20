# RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks

**Routes:** `/rbac`, `/admin`, `/settings`, `/system`, `/committee`, `/tasks`, `/notifications`, `/knowledge-graph` · **Services:** `rbacService.ts`, `settingsService.ts`, `departmentsService.ts`, `taskService.ts`, `notificationService.ts`

## Purpose
Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18 | Roles, SoD, access control |
| SOC 2 CC1.3, CC6.1–3 | Authority and responsibility; logical access |
| NIST SP 800-53 AC-2, AC-3, AC-5, AC-6 | Access, SoD, least privilege |
| ISO/IEC 42001 5.3 | Roles and responsibilities |

## RBAC Model
Roles: Admin, Compliance Manager, CISO, DPO, Engineer, Auditor (read-only), Reviewer, Viewer. Fine-grained permissions per module; every change emits `audit_log`.

## Committees
Model Risk Committee, Ethics Board, Privacy Council, Incident War-room — membership, quorum, minutes, and decisions captured as evidence.

## Task Queue
Universal work surface aggregating remediation, access reviews, DSRs, regulator filings, evidence refresh, and policy acknowledgements with SLA colouring.
