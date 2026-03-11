# Changelog - Policy Templates Module

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
