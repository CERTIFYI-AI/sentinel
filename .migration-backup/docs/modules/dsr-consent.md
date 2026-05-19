# Data Subject Requests & Consent Management

**Route:** `/consent-management` (and DSR queue inside `/tasks`) · **Services:** `dsrRequestsService.ts`, `consentRecordsService.ts`

## Purpose
Operationalise individual rights under privacy law: intake, identity verification, fulfilment, and evidence of DSRs (access, erasure, rectification, portability, restriction, objection, Art.22 challenges); maintain lawful-basis and consent records.

## Standards Alignment
| Control | Requirement |
|---|---|
| GDPR Art.12–22 | Data subject rights, 1-month SLA (extendable) |
| GDPR Art.7 | Consent conditions |
| CCPA/CPRA | Consumer rights and opt-out signals (GPC) |
| LGPD Art.18 | Brazilian data-subject rights |
| ISO/IEC 27701 7.3 / 8.3 | PII principal rights; consent records |
| EU AI Act Art.22(3) | Right to explanation for high-risk decisions |

## DSR Workflow
Intake (portal, email, API) → Identity verification → Scope (systems, assets, vendors) → Legal review → Execution (data export, deletion with retention exceptions, rectification) → Delivery → Close with evidence.

## Consent Records
Immutable (insert-only RLS) ledger keyed by subject, purpose, lawful basis, timestamp, UI proof, and withdrawal events. Feeds Policy Firewall so the runtime can honour objections.

## Metrics & Evidence
SLA adherence, volume by jurisdiction, refusal-rate, and full audit package per request — hashed into `evidence_chain`.
