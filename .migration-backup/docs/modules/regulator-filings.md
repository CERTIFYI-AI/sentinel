# Regulator Filing Workspace

**Route:** `/regulator-filings` · **Service:** `incidentService.ts` + `regulationService.ts`

## Purpose
Manage regulator-facing notifications (incidents, breaches, serious AI incidents, material operational events) with jurisdiction-specific SLA countdowns, drafting, approval, and acknowledgement tracking.

## Standards Alignment
| Obligation | SLA |
|---|---|
| GDPR Art. 33 personal data breach | 72 hours to supervisory authority |
| EU AI Act Art. 73 serious incident | 15 days (2 days for widespread, 10 days for fatality) |
| NIS2 Art. 23 significant incident | Early warning 24h, notification 72h, final report 1 month |
| DORA Art. 19 major ICT incident | Initial, intermediate, final reports per RTS |
| SEC Item 1.05 (Form 8-K) | 4 business days after materiality determination |
| HIPAA Breach Notification Rule | 60 days |

## Workflow
Detect (from Incident Module) → Classify jurisdiction and obligations → Auto-start SLA timer → Draft with template → Internal approval (Legal, DPO, CISO) → Submit → Track acknowledgement → Close with evidence.

## Controls
- Read-only audit trail (WORM via RLS insert-only).
- Four-eyes approval required before submission.
- Overdue SLA triggers automatic escalation tasks.

## Exports
Fully assembled submission package (PDF + attachments manifest) with cryptographic hash for regulator receipt matching.
