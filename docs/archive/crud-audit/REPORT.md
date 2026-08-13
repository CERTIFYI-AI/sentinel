# WS3 — CRUD & Service-Quality Audit

Generated from `scripts/ws3-crud-audit.mjs`. 53 services scanned.

## Summary

- **Total services**: 53
- **CRUD-complete** (ignoring append-only): 53
- **Using `any` type**: 43
- **Using `console.*`**: 50
- **Missing AbortSignal support**: 53
- **Using legacy `tenant_id`**: 33
- **With zod validation**: 0
- **Swallowing errors silently**: 35
- **Explicit `org_id` awareness**: 12

## Per-service matrix

| Service | C | R | U | D | Soft | Gaps | Quality risks |
|---|:-:|:-:|:-:|:-:|:-:|---|---|
| `agentService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `agentsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod, swallows |
| `aiImpactService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `attackSurfaceService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `attestationsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `auditLogService` _(append-only)_ | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod |
| `bcpPlansService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `biasAuditService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `biasAuditsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `carbonRecordsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `complianceCalendarService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `complianceEventService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `conformityService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `consentRecordsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `controlService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `dataGovernanceService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, no-abort, no-zod |
| `datasetService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod |
| `departmentsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `documentsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `dsrRequestsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `energyMetricsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `energyService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `esgReportsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod, swallows |
| `esgService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `ethicsReportsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `evidenceService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `exceptionsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `explainabilityService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, no-abort, no-zod |
| `frameworkService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `gapService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `hitlService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod |
| `incidentService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `keysVaultService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `maturityService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `modelArenaService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `modelEfficiencyService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `modelService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |
| `notificationService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `policyFirewallService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `policyService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod |
| `promptService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `redTeamFindingsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `redTeamService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `regulationService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `remediationService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `riskService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod, swallows |
| `securityScansService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `securityService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, no-abort, no-zod |
| `settingsService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod |
| `taskService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod |
| `trainingService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, legacy-tenant, no-zod, swallows |
| `trustTraceService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | any, console, no-abort, no-zod |
| `vendorService` | ✅ | ✅ | ✅ | ✅ | ⬜ | — | console, no-abort, no-zod, swallows |

## Remediation plan

This audit is wired into CI as a soft check (fails on new regressions, tracked via `scripts/ws3-crud-audit.mjs` diff). Hard gates land in WS6.

### Short-term (this PR)

1. **Hardened service factory** — `dashboard/src/lib/serviceFactory.ts` emits a typed CRUD client with AbortSignal, zod validation, org_id-aware RLS reads, and structured error telemetry.
2. **Two exemplar services migrated** — `consentRecordsService` and `incidentService` ported to the factory as reference implementations.
3. **`any`-free helper** — `dashboard/src/lib/supabaseTyped.ts` exposes a typed `fromTable<Name>` wrapper usable by legacy services for incremental migration.

### Medium-term (WS6)

- Migrate remaining services to `serviceFactory`.
- Strip `console.*` in favour of `@/lib/telemetry` calls.
- Remove `tenant_id` fallback once all tables confirm org_id via `auth.current_org_id()`.

### Append-only allowlist

Services in the allowlist below are **intentionally** missing U/D — their backing tables enforce `RLS UPDATE/DELETE USING (false)` and all writes flow through SECURITY DEFINER `*_append()` RPCs (WS0.3).

- `auditLogService`