# Changelog - Policy Templates Module

## [Unreleased] - 2026-08-16

### Fixed
- Policy save failing with `Could not find the 'framework' column of 'policies'
  in the schema cache`. The `policies` table's `CREATE TABLE` lists `framework`,
  `linked_frameworks` and `linked_control_ids`, but on live databases that
  predate that statement `CREATE TABLE IF NOT EXISTS` never added the columns,
  and the earlier drift-heal (`20260419_core_grc_live_columns.sql`) omitted them.
  Migration `20260821000005_policies_framework_drift_heal.sql` re-asserts every
  column `policyService.upsertPolicy` writes with `ADD COLUMN IF NOT EXISTS`
  (no-op on from-zero replay, heal on drifted live) and reloads the PostgREST
  schema cache.

## [1.0.0] - 2025-01-15

### Added
- 70 policy templates across 11 compliance frameworks
- Policy lifecycle engine with 8-state workflow (draft -> published)
- RESTful API with 14 endpoints for policy CRUD and compliance
- PolicyTemplateLibrary React component with search, filter by framework/category
- PolicyWorkflow visual state machine component
- ComplianceDashboard with framework scores and gap analysis
- PolicyManagement page with tabbed interface
- TypeScript type definitions for all policy entities
- React hooks (usePolicies, useTemplates, useComplianceScore)
- Database schema with 6 tables (templates, versions, approvals, signatures, activity_log, notifications)
- Unit tests for policy engine (transitions, compliance scoring, framework summary)

### Frameworks Supported
- SOC2 (10 templates)
- ISO 27001 (7 templates)
- GDPR (7 templates)
- HIPAA (7 templates)
- NIST CSF (6 templates)
- NIST 800-53 (6 templates)
- PCI-DSS (6 templates)
- EU AI Act (7 templates)
- ISO 42001 (6 templates)
- CCPA (5 templates)
- FedRAMP (3 templates)
