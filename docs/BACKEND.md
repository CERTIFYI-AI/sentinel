# Sentinel Backend Architecture

## Stack
- **Database**: Supabase PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (email/password + SSO SAML ready)
- **Storage**: Supabase Storage (sentinel-files bucket)
- **Realtime**: Supabase Realtime for guardrail_events, live_traces, hitl_reviews, notifications
- **Frontend**: Cloudflare Workers + React/TypeScript

## Multi-tenancy
Every table has `org_id` column with RLS policy filtering by `get_org_id()` function.

## Tables (18 core)
| Table | Module | RLS |
|-------|--------|-----|
| organizations | Core | Yes |
| user_profiles | Core | Yes |
| audit_log | Core | Yes (append-only) |
| models | AI Governance | Yes |
| agents | AI Governance | Yes |
| bias_audits | AI Governance | Yes |
| trust_policies | Trust & Safety | Yes |
| guardrail_events | Trust & Safety | Yes |
| live_traces | Observability | Yes |
| frameworks | Compliance | Yes |
| controls | Compliance | Yes |
| policies | Compliance | Yes |
| evidence | Compliance | Yes |
| risks | Risk | Yes |
| incidents | Incident | Yes |
| hitl_reviews | HITL | Yes |
| vendors | Vendor | Yes |
| datasets | Data Gov | Yes |
| tasks | Task Mgmt | Yes |
| notifications | Notifications | Yes |
| governance_events | Event Bus | Yes |
| agent_registry | Event Bus | Yes |
| evidence_chain | Evidence Chain | Yes (append-only) |

## Audit Trail
- `audit_log`: append-only, no UPDATE/DELETE policies
- Every create/update/delete writes via `logAction()` from `auditLogger.ts`

## Evidence Chain
- Cryptographic SHA-256 chain for tamper-evident compliance records
- Append-only, no UPDATE/DELETE policies

## Event Bus
- `governance_events` table + 5 autonomous agents
- Agents: Risk Assessment, HITL, Compliance Mapping, Vendor Risk, Carbon Footprint
- Triggered on MODEL_REGISTERED, RISK_DETECTED, INCIDENT_CREATED events

## Storage Buckets
- `sentinel-files/model-cards/{modelId}/{filename}`
- `sentinel-files/evidence/{evidenceId}/{filename}`
- `sentinel-files/exports/{orgId}/{filename}`
