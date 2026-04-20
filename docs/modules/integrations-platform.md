# Integrations Platform

**Routes:** `/integrations`, `/integrations-page` · **Services:** `keysVaultService.ts`, integration connectors

## Purpose
First-class connectors to SIEM, ITSM, Cloud posture, Identity, and AI-safety vendors — bidirectional where possible.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.19–23 | Supplier/ICT supply chain |
| NIST CSF DE.AE, RS.CO | Detection and communication |
| OAuth 2.1 / OpenID Connect | Delegated identity |
| SCIM 2.0 | User provisioning |

## Supported Destinations (V1/V2)
- SIEM: Splunk, Elastic, Microsoft Sentinel, Datadog, Chronicle.
- ITSM: Jira, ServiceNow.
- Cloud posture: AWS Security Hub, GCP SCC, Azure Defender.
- Identity: Okta, Entra ID, Ping.
- AI safety: Lakera, Garak, PyRIT, Promptfoo.
- ERP/HR (access reviews): Workday, SAP SuccessFactors.

## Secrets
Provider credentials stored in `keys_vault` table with envelope-encryption; never rendered to frontend.
