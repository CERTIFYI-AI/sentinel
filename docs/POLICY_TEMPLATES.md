# Policy Templates Module - Certifyi Sentinel

## Overview

The Policy Templates module provides a comprehensive library of 70 pre-built compliance policy templates spanning 11 industry-standard frameworks. It enables organizations to rapidly deploy, customize, and manage compliance policies with full lifecycle support.

## Supported Frameworks (11)

| Framework | Templates | Focus Area |
|-----------|-----------|------------|
| SOC2 | 10 | Trust Service Criteria |
| ISO 27001 | 7 | Information Security Management |
| GDPR | 7 | Data Protection & Privacy |
| HIPAA | 7 | Healthcare Data Security |
| NIST CSF | 6 | Cybersecurity Framework |
| NIST 800-53 | 6 | Security & Privacy Controls |
| PCI-DSS | 6 | Payment Card Security |
| EU AI Act | 7 | AI Governance & Compliance |
| ISO 42001 | 6 | AI Management System |
| CCPA | 5 | California Consumer Privacy |
| FedRAMP | 3 | Federal Cloud Security |

## Architecture

### Backend (Python/FastAPI)

- `sentinel/models/policy_engine.py` - Core policy lifecycle engine with state machine
- `sentinel/api/policy_router.py` - RESTful API endpoints for policy CRUD operations
- `sentinel/data/policy_templates.json` - Template definitions (70 templates)
- `docker/postgres/policy_schema.sql` - Database schema (6 tables)

### Frontend (React/TypeScript)

- `dashboard/src/lib/types/policy.ts` - TypeScript type definitions
- `dashboard/src/lib/hooks/usePolicies.ts` - React hooks for policy data
- `dashboard/src/components/policies/PolicyTemplateLibrary.tsx` - Template browser with search/filter
- `dashboard/src/components/policies/PolicyWorkflow.tsx` - Visual workflow state machine
- `dashboard/src/components/policies/ComplianceDashboard.tsx` - Compliance score overview
- `dashboard/src/pages/PolicyManagement.tsx` - Main policy management page

## Policy Lifecycle

```
Draft -> Pending Review -> Pending Approval -> Approved -> Published
  |           |                  |                         |
  +-> Archive  +-> Reject         +-> Reject                +-> Archive
                  +-> Draft           +-> Draft                 +-> Draft
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/policies/templates | List all templates |
| GET | /api/v1/policies/templates/:id | Get template details |
| POST | /api/v1/policies/templates/:id/instantiate | Create policy from template |
| GET | /api/v1/policies | List tenant policies |
| GET | /api/v1/policies/:id | Get policy details |
| PUT | /api/v1/policies/:id | Update policy |
| POST | /api/v1/policies/:id/transition | Change policy status |
| GET | /api/v1/policies/:id/versions | List policy versions |
| POST | /api/v1/policies/:id/approve | Approve policy |
| POST | /api/v1/policies/:id/reject | Reject policy |
| GET | /api/v1/policies/compliance/score | Get compliance scores |
| GET | /api/v1/policies/compliance/gaps | Get compliance gaps |
| GET | /api/v1/policies/expiring | Get expiring policies |

## Database Schema

- `policy_templates` - Template definitions
- `policy_versions` - Version history
- `policy_approvals` - Approval workflow records
- `policy_signatures` - Digital signature tracking
- `policy_activity_log` - Audit trail
- `policy_notification_settings` - Notification preferences

## Testing

```bash
cd ~/sentinel && python3 -m pytest tests/test_policy_engine.py -v
```

## Quick Start

1. Templates are loaded from `sentinel/data/policy_templates.json`
2. Use the PolicyTemplateLibrary component to browse and filter templates
3. Instantiate a template to create a tenant-specific policy
4. Use the PolicyWorkflow component to manage the approval lifecycle
5. Track compliance scores via the ComplianceDashboard
