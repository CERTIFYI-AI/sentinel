# Compliance Programs (Frameworks, Autopilot, Dashboard, Maturity, Gap Analysis, Framework Mapping)

**Routes:** `/compliance`, `/compliance-dashboard`, `/compliance-autopilot`, `/compliance-frameworks`, `/framework-mapping`, `/frameworks`, `/gap-analysis`, `/maturity`, `/conformity-assessment` · **Services:** `frameworkService.ts`, `conformityService.ts`, `maturityService.ts`, `complianceEventService.ts`, `complianceCalendarService.ts`

## Purpose
Single control universe mapped to multiple frameworks, with live posture, gap analysis, and maturity scoring. Compliance Autopilot automates evidence refresh, task assignment, and reviewer routing.

## Frameworks Supported (out of box)
SOC 2, ISO/IEC 27001, ISO/IEC 27701, ISO/IEC 42001, NIST CSF 2.0, NIST AI RMF, NIST SP 800-53, NIST SP 800-171 / CMMC, PCI DSS 4.0, HIPAA, GDPR, EU AI Act, DORA, NIS2, HITRUST CSF, FedRAMP, CIS Controls, ISO 22301, ISO/IEC 23894, COBIT 2019.

## Conformity Assessment
EU AI Act Art.43 internal-control conformity-assessment workflow with notified-body track-switch for Annex III high-risk systems.

## Maturity Model
Per-domain maturity (Initial → Managed → Defined → Quantitatively managed → Optimising) benchmarked to CMMI and NIST CSF tiers.

## Gap Analysis
Framework ↔ control ↔ evidence heatmap with owner, due date, and risk rating. Gaps auto-generate Tasks and Remediation records.

## Framework Mapping
Many-to-many crosswalk table (SOC 2 CC ↔ ISO A.x ↔ NIST —) so single evidence satisfies multiple requirements.
