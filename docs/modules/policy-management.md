# Policy Management & Templates

**Routes:** `/policies`, `/policy-management`, `/policy-templates`, `/policy-editor` · **Services:** `policyService.ts`, documented in `POLICY_TEMPLATES.md`

## Purpose
Author, review, approve, publish, acknowledge, and retire organisational policies (security, privacy, AI acceptable use, model governance, incident response) with version control and attestation tracking.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.1, A.5.37 | Policies for information security; documented operating procedures |
| SOC 2 CC1.3, CC2.2, CC5.3 | Values and policies, communication, deployment of policies |
| ISO/IEC 42001 5.2 | AI policy |
| NIST CSF GV.PO | Organisational cybersecurity policy |
| HIPAA §164.316 | Policies and procedures |

## Workflow
Draft → Reviewers (Legal/Compliance/Security/DPO) → Approver → Publish → Acknowledgement campaign → Periodic review (annual or on material change). Four-eyes enforced; SoD with HITL/policy-firewall approvers via IGA.

## Templates
70+ starter templates (see `POLICY_TEMPLATES.md`) across ISMS, PIMS, AIMS, BCMS, and industry-specific sets (HIPAA, PCI, SR 11-7).
