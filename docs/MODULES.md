# Sentinel Modules

## Model Inventory
- Purpose: Track all AI/ML models across the organization
- Standards: EU AI Act Art.27, ISO 42001
- CRUD: Create, Read, Update, Delete models
- Service: `modelService.ts` | Hook: `use-models.ts`

## Agent Registry
- Purpose: Discover and govern AI agents
- CRUD: Create, Read, Update, Delete, Quarantine agents
- Service: `agentService.ts` | Hook: `useAgentData.ts`

## Bias Audits
- Purpose: Run fairness audits on AI models
- Standards: EU AI Act Art.10, NIST AI RMF
- Service: `biasAuditService.ts` | Hook: `useBiasAuditData.ts`

## Risk Register
- Purpose: Enterprise AI risk management
- Standards: ISO 31000, NIST CSF
- CRUD: Create, Read, Update, Delete risks
- Service: `riskService.ts` | Hook: `useRiskData.ts`

## Compliance Frameworks
- Purpose: Map controls to regulatory frameworks
- Standards: ISO 27001, SOC-2, EU AI Act, NIST
- Service: `frameworkService.ts` | Hook: `useFrameworkData.ts`

## Incidents
- Purpose: Track and respond to AI incidents
- Service: `incidentService.ts` | Hook: `useIncidentData.ts`

## HITL Reviews
- Purpose: Human-in-the-loop oversight for high-risk AI
- Standards: EU AI Act Art.14
- Service: `hitlService.ts` | Hook: `useHITLData.ts`

## Vendors
- Purpose: Third-party AI vendor risk management
- Standards: GDPR Art.28
- Service: `vendorService.ts` | Hook: `useVendorsData.ts`

## Datasets
- Purpose: Data governance and lineage
- Service: `datasetService.ts` | Hook: `useDatasetData.ts`
