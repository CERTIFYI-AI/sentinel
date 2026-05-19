# Sentinel AI GRC Platform - Module Reference

## V1 Modules (Current Release)

### Asset Management (`/assets`)
- **Purpose**: Unified CMDB linking AI models, datasets, agents, APIs, infrastructure
- **Standard**: ISO 42001 8.3, ISO 27001 A.8/A.9, EU AI Act Art.11
- **CRUD**: Full register, edit, decommission, delete
- **Key fields**: type, criticality, data_classification, lifecycle_stage, BIA RTO/RPO

### Identity Governance (`/iga`)
- **Purpose**: User access reviews, entitlement catalog, SoD conflict detection
- **Standard**: ISO 27001 A.5.18, SOC 2 CC6.1
- **CRUD**: Full access reviews, entitlements, SoD violations

### RoPA (`/ropa`)
- **Purpose**: GDPR Art.30 Record of Processing Activities
- **Standard**: GDPR Art.30
- **CRUD**: Full processing activities with DPO review workflow

### Transfer Impact Assessment (`/tia`)
- **Purpose**: Cross-border data transfer compliance (SCCs, BCRs, DPF)
- **Standard**: GDPR Art.46, GDPR Art.49
- **CRUD**: Full TIA with risk scoring and DPO approval

### Tabletop Exercises (`/tabletop`)
- **Purpose**: Structured scenario simulations for IR, BCP, AI incidents
- **Standard**: ISO 22301, NIST SP 800-84, EU AI Act Art.9
- **CRUD**: Full plan, launch, complete with findings/actions

### Regulator Filing Workspace (`/regulator-filings`)
- **Purpose**: Regulatory notification management with SLA countdown timers
- **Standard**: NIS2, DORA, GDPR Art.33, EU AI Act Art.73, SEC Item 1.05
- **CRUD**: Full draft, submit, track acknowledgement

### Business Impact Analysis (`/bia`)
- **Purpose**: Process criticality, RTO/RPO targets, financial impact quantification
- **Standard**: ISO 22301 8.2.2, BCM best practice
- **CRUD**: Full processes with dependency mapping and BCP linkage

## V2 Roadmap (Planned)

### Sentinel Agent
Wazuh-compatible host agent for FIM, vuln detection, AI telemetry (prompt sampling, PII detection, jailbreak signatures), OpenTelemetry export.

### Patch Management
CVE-asset linkage with SLA-based patching deadlines, auto-close on scan verification.

### Audit Requests / Auditor Portal
External auditor read-only workspace, evidence request tracker, secure package delivery.

### Integration Framework
First-class connector framework: SIEM (Splunk, Elastic, MS Sentinel), ITSM (Jira, ServiceNow), Cloud posture (AWS SecurityHub, GCP SCC, Azure Defender), AI safety (Lakera, Garak, PyRIT), Identity (Okta, Entra).
