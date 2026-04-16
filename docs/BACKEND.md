# Sentinel Backend Architecture

## Stack
- **Database**: Supabase PostgreSQL with Row Level Security
- **Frontend Hosting**: Cloudflare Workers with Static Assets
- **Realtime**: Supabase Realtime for guardrail_events, live_traces, hitl_reviews, notifications
- **Storage**: Supabase Storage (sentinel-files bucket)
- **Auth**: Supabase Auth (email/password + SSO SAML ready)

## Multi-tenancy
Every table is filtered by `org_id` using RLS policies. The `get_org_id()` function returns the current user's org.

## Tables (18 core)
| Category | Tables |
|----------|--------|
| Core | organizations, user_profiles, audit_log |
| AI Governance | models, agents, bias_audits, trust_policies, guardrail_events, live_traces |
| Compliance | frameworks, controls, policies, evidence, evidence_chain |
| Risk | risks, incidents, hitl_reviews |
| Operations | vendors, datasets, tasks, notifications |
| Event Bus | governance_events, agent_registry |

## Autonomous Agents
5 agents triggered via event bus:
1. **Risk Agent** - Auto-creates risk entries for new high-risk models
2. **HITL Agent** - Creates human-in-the-loop reviews for Tier 1-2 models
3. **Compliance Agent** - Detects EU AI Act compliance gaps
4. **Vendor Agent** - Checks DPA status for model vendors
5. **Carbon Agent** - Estimates carbon emissions for new models

## Evidence Chain
Cryptographic SHA-256 chain for tamper-evident audit trail. Append-only (no UPDATE/DELETE).
