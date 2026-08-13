# Policy Management & Templates

**Routes:** `/policies`, `/policy-management`, `/policy-templates`, `/policy-editor` · **Services:** `policyService.ts`

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

70 starter templates across ISMS, PIMS, AIMS, BCMS, and industry-specific sets
(HIPAA, PCI, SR 11-7), spanning 11 frameworks:

| Framework | Templates | Focus Area |
|-----------|-----------|------------|
| SOC2 | 10 | Trust Service Criteria |
| ISO 27001 | 7 | Information Security Management |
| GDPR | 7 | Data Protection & Privacy |
| HIPAA | 7 | Healthcare Data Security |
| EU AI Act | 7 | AI Governance & Compliance |
| NIST CSF | 6 | Cybersecurity Framework |
| NIST 800-53 | 6 | Security & Privacy Controls |
| PCI-DSS | 6 | Payment Card Security |
| ISO 42001 | 6 | AI Management System |
| CCPA | 5 | California Consumer Privacy |
| FedRAMP | 3 | Federal Cloud Security |

## Policy Lifecycle (state machine)

```
Draft -> Pending Review -> Pending Approval -> Approved -> Published
  |           |                  |                         |
  +-> Archive  +-> Reject         +-> Reject                +-> Archive
                  +-> Draft           +-> Draft                 +-> Draft
```

## Implementation

**Backend (Python/FastAPI)**

- `sentinel/models/policy_engine.py` — policy lifecycle engine with state machine
- `sentinel/api/policy_router.py` — RESTful endpoints for policy CRUD
- `sentinel/data/policy_templates.json` — template definitions (70 templates)
- `docker/postgres/policy_schema.sql` — database schema (6 tables)

**Frontend (React/TypeScript)**

- `dashboard/src/lib/types/policy.ts` — TypeScript type definitions
- `dashboard/src/lib/hooks/usePolicies.ts` — React hooks for policy data
- `dashboard/src/components/policies/PolicyTemplateLibrary.tsx` — template browser
- `dashboard/src/components/policies/PolicyWorkflow.tsx` — visual workflow state machine
- `dashboard/src/components/policies/ComplianceDashboard.tsx` — compliance score overview
- `dashboard/src/pages/PolicyManagement.tsx` — main policy management page

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/policies/templates` | List all templates |
| GET | `/api/v1/policies/templates/:id` | Get template details |
| POST | `/api/v1/policies/templates/:id/instantiate` | Create policy from template |
| GET | `/api/v1/policies` | List tenant policies |
| GET | `/api/v1/policies/:id` | Get policy details |
| PUT | `/api/v1/policies/:id` | Update policy |
| POST | `/api/v1/policies/:id/transition` | Change policy status |
| GET | `/api/v1/policies/:id/versions` | List policy versions |
| POST | `/api/v1/policies/:id/approve` | Approve policy |
| POST | `/api/v1/policies/:id/reject` | Reject policy |
| GET | `/api/v1/policies/compliance/score` | Get compliance scores |
| GET | `/api/v1/policies/compliance/gaps` | Get compliance gaps |
| GET | `/api/v1/policies/expiring` | Get expiring policies |

## Database Schema

- `policy_templates` — template definitions
- `policy_versions` — version history
- `policy_approvals` — approval workflow records
- `policy_signatures` — digital signature tracking
- `policy_activity_log` — audit trail
- `policy_notification_settings` — notification preferences

## Testing

```bash
python3 -m pytest tests/test_policy_engine.py -v
```

## Quick Start

1. Templates are loaded from `sentinel/data/policy_templates.json`.
2. Browse and filter templates with the `PolicyTemplateLibrary` component.
3. Instantiate a template to create a tenant-specific policy.
4. Manage the approval lifecycle with the `PolicyWorkflow` component.
5. Track compliance scores via the `ComplianceDashboard`.

## Related

- [Policy language](../security/policy-language.md)
- [Policy Firewall & Guardrails](policy-firewall.md)
- [Policy template changelog](policy-management-changelog.md)
