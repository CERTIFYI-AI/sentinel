# Sentinel AI GRC — Engineering Context

## Repository

**GitHub:** https://github.com/CERTIFYI-AI/sentinel  
**Stack:** React 18 · TypeScript 5 · Vite · Zustand · TanStack Query · Supabase · shadcn/ui · Tailwind CSS · Recharts · Phosphor Icons

## Design System

| Token | Value |
|-------|-------|
| Font | Outfit (Google Fonts) |
| Border radius | 0rem everywhere |
| Primary brand | `#368F4D` (Emerald) |
| Base color | Zinc |
| Icons | Phosphor — `duotone` default, `fill` on active/selected states only |
| Component library | shadcn/ui |
| Theme | Light mode primary |

## Supabase Project

- **Project ID:** `vhparvughsygyknblkzt`  
- **Region:** ap-southeast-1  
- **Status:** ACTIVE_HEALTHY

## Multi-Tenancy

| Entity | Value |
|--------|-------|
| Default org ID | `00000000-0000-0000-0000-000000000001` |
| Default org name | Sentinel AI GRC |
| Default tenant ID | `TNT-001` |
| Default tenant name | Acme Financial Corp |

## Table Reference

### FK-Constrained Tables (use `tenant_id = 'TNT-001'`)

`maturity_assessments`, `security_threats`, `security_scans`, `security_vulnerabilities`, `red_team_campaigns`, `conformity_assessments`, `exceptions`

### UUID-org Tables (use `org_id = '00000000-0000-0000-0000-000000000001'`)

`esg_reports`, `energy_metrics`, `model_efficiency`, `dsar_requests`

### Text tenant_id Tables (any string accepted)

`risks`, `incidents`, `vendors`, `bias_audits`, `evidence`, `tasks`, `remediation_plans`, `consent_records`

## Framework ID Reference

| ID | Framework |
|----|-----------|
| `FW-001` | EU AI Act |
| `FW-002` | GDPR |
| `FW-003` | NIST AI RMF |
| `FW-004` | ISO 42001 |
| `FW-005` | Singapore Model AI Governance Framework |
| `FW-006` | OWASP LLM Top 10 |
| `FW-007` | OECD AI Principles |
| `FW-008` | UNESCO Ethics of AI |
| `FW-009` | Google SAIF |
| `FW-010` | MITRE ATLAS |

## Code Conventions

- `// @ts-nocheck` at top of all page components (existing convention — do not remove)
- Optimistic UI pattern: `localItems` + `deletedIds` + Supabase save in parallel
- All services use `mapRow()` / `mapToRow()` helpers for column name translation
- Soft-delete via `is_deleted = true` where supported
- Real-time invalidation via `useRealtimeInvalidation.ts` mounted globally in `App.tsx`
- Zero hardcoded data — all content from Supabase; no fallback mock/seed arrays in hooks

## Development Rules

1. **TypeScript strict** — no `any`, all types explicit
2. **No mock data** — every list, table, chart, KPI card wired to Supabase
3. **Exports** — CSV and PDF export on every list view
4. **Skeleton loaders** — all async data states covered
5. **ConfirmDialog** — all destructive actions gated
6. **Toast notifications** — all mutations have success/error toasts
7. **Audit trail** — all mutations write to `AuditLog`
8. **Realtime** — all relevant tables subscribed via `useRealtimeInvalidation`
