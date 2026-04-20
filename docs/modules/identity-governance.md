# Identity Governance & Administration (IGA)

**Route:** `/iga` · **Service:** `rbacService.ts`, `accessReviewsService.ts` (via rbac domain)

## Purpose
Centralise user access reviews, entitlement catalog, and Segregation of Duties (SoD) conflict detection for human identities and service accounts that can act on AI systems or regulated data.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.15–A.5.18 | Access control, rights management, privileged access, access reviews |
| SOC 2 CC6.1 / CC6.2 / CC6.3 | Logical access, provisioning, periodic review |
| NIST SP 800-53 AC-2, AC-5, AC-6 | Account management, SoD, least privilege |
| EU AI Act Art.14 | Human oversight role integrity |
| SOX ITGC | Access provisioning and quarterly user access reviews |

## Core Objects
- **Entitlement Catalog** — normalized set of roles/permissions across Sentinel + connected systems.
- **Access Review Campaign** — periodic (quarterly) certification cycles per application/asset.
- **SoD Rule** — mutually exclusive entitlement pairs (e.g. policy author ↔ policy approver).
- **Violation** — detected conflict with remediation workflow.

## Workflow
1. Campaign scheduled (ISO 27001 A.5.18 cadence).
2. Reviewer certifies/revokes each entitlement with justification.
3. Revocations generate remediation tasks + audit evidence.
4. SoD engine re-evaluates on every entitlement change.

## Evidence Outputs
Signed review package (reviewer, timestamp, decisions, exceptions) written to `evidence_chain`; exportable for SOC 2 / ISO audit.
