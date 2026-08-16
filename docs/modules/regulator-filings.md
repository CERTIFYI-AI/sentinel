# Regulator Filing Workspace

**Route:** `/regulator-filings` · **Service:** `regulatoryOpsService.ts` · **Table:** `regulator_filings` (org-scoped RLS)

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


## Data backing (wired 2026-08)
- Real `regulator_filings` table (CHECK-constrained regulation/type/status); filings link incidents via `linked_incident_id` → `/risk/incidents?open=`.
- `filing_ref` (FIL-YYYY-NNNN) is minted by a DB trigger on insert — the UI shows it read-only and the create form notes it is assigned on save.
- Statutory deadlines derive from `dashboard/src/lib/statutoryWindows.ts` (one source of truth keyed by the `FILING_REGULATIONS` vocabulary): picking a regulation on a new filing defaults the deadline from that window; the Incident Log Art. 73 prompt counts the same window from the incident's `detected_at`; the mesh's RegulatorNotify agent uses the same clocks. Staged regimes (Art. 73's 15d/10d/2d, NIS2 24h/72h, DORA 4h/24h/72h) document the chosen default stage in that file.
- The mesh's RegulatorNotify agent drafts filings into the same table via a strict insert (throws on failure); `REGULATOR_NOTIFIED` carries only the ids of rows that really persisted, and any shortfall returns a failed agent result — a statutory draft can never claim success it didn't have.
- Transitioning a filing to `acknowledged` requires the regulator-issued `reference_number` (enforced in the form) — the acknowledgment is evidence, not a checkbox.
- Art. 12 audit logging: every save/delete writes to `audit_log` via `logAction` (module `regulator-filings`), with dedicated `submit` / `acknowledge` actions for the legally significant transitions.
- The previously documented four-eyes/WORM workflow is NOT implemented — approvals go through the platform `approvals` backend when required.
- Known debt: `regulator_filings.deleted_at` exists but is unused (deletes are hard).
