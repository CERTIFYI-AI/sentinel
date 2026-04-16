# Sentinel Modules Reference

| Module | Purpose | GRC Standard | API File | Hook File |
|--------|---------|-------------|----------|----------|
| Models | AI Model Registry | EU AI Act Art.51 | api/models.ts | hooks/useModelsData.ts |
| Agents | AI Agent Inventory | EU AI Act Art.52 | api/agents.ts | hooks/useAgentData.ts |
| Bias Audits | Fairness Testing | EU AI Act Art.10 | api/biasAudits.ts | hooks/useBiasAuditData.ts |
| Trust Policies | Guardrail Rules | NIST AI RMF | api/trustPolicies.ts | hooks/useTrustTraceData.ts |
| Frameworks | Compliance Frameworks | ISO 27001/SOC-2 | api/frameworks.ts | hooks/useFrameworksData.ts |
| Controls | Security Controls | ISO 27001 A.x | api/controls.ts | hooks/useControlData.ts |
| Policies | GRC Policies | GDPR Art.24 | api/policies.ts | hooks/usePolicyData.ts |
| Evidence | Audit Evidence | ISO 27001 | api/evidence.ts | hooks/useEvidenceData.ts |
| Risks | Risk Register | ISO 31000 | api/risks.ts | hooks/useRisksData.ts |
| Incidents | Incident Management | GDPR Art.33 | api/incidents.ts | hooks/useIncidentData.ts |
| HITL | Human Oversight | EU AI Act Art.14 | api/hitl.ts | hooks/useHitlItemData.ts |
| Vendors | Vendor Risk | GDPR Art.28 | api/vendors.ts | hooks/useVendorsData.ts |
| Datasets | Data Governance | GDPR Art.6 | api/datasets.ts | hooks/useDatasetData.ts |
| Tasks | Task Management | - | api/tasks.ts | hooks/useTaskData.ts |
| Notifications | Alerts & Notifications | - | api/notifications.ts | hooks/useNotificationData.ts |
