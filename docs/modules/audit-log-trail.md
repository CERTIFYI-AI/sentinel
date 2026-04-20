# Audit Log & Audit Trail

**Routes:** `/audits`, `/audit-log`, `/audit-trail`, `/system-audit-log` · **Service:** `auditLogService.ts`

## Purpose
Tamper-evident system-of-record for every state change, decision, access, and export across Sentinel.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.8.15 | Logging |
| SOC 2 CC7.2, CC7.3 | Monitoring activities, evaluation |
| NIST SP 800-53 AU-2, AU-6, AU-12 | Event logging, review, generation |
| HIPAA §164.312(b) | Audit controls |
| PCI DSS 10 | Track and monitor access |
| EU AI Act Art.12 | Record-keeping / logs |

## Design
Insert-only RLS. Log schema documented in `../compliance/audit-log-schema.md`. Every entry carries actor, target, action, before/after diff, correlation ID, and IP/user-agent.

## Access
Read restricted to auditor/viewer roles; search + export rate-limited and itself audited (meta-audit).
