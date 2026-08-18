# Ethics Reporting & Whistleblowing

**Routes:** `/ethics-reporting`, `/ethics-reporting-submit`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `ethics_reports` (org-scoped, RLS)

## Purpose
Confidential channel for employees and external parties to raise ethics,
AI-safety, or compliance concerns, with triage, investigation tracking, and
non-retaliation evidence.

## Why it exists
EU Directive 2019/1937 requires whistleblower protection channels.
ISO 37002:2021 mandates whistleblowing management systems. ISO/IEC 42001
A.5.3 requires AI ethics and accountability mechanisms. Without a structured
intake and investigation workflow, concerns go unreported or untracked.

## How it works
1. Reports are submitted via the public form (`/ethics-reporting-submit`)
   with an anonymous option.
2. Each report enters the triage pipeline: Intake → Acknowledgement (within
   7 days) → Triage → Investigation (with separation of duties from subject)
   → Outcome → Feedback (within 3 months) → Evidence retention.
3. Reports are stored in `ethics_reports` with severity, category, status,
   assigned investigator, and timeline.
4. Identity disclosure is access-controlled — the "View Identity" dialog
   exists for authorised investigators only.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | MetricTile row | Total reports, open, investigating, resolved | Read-only from `ethics_reports` |
| Report list | searchable table | Reports with ref, category, severity, status, date | Read-only |
| Create report | button + dialog | Submits a new ethics report | Writes to `ethics_reports` |
| Detail panel | Sheet (5 tabs) | Full report with investigation notes, timeline, evidence | Read/write |
| View Identity | dialog | Shows reporter identity (access-controlled) | Read-only |
| Public submit form | standalone page | External/anonymous submission | Writes to `ethics_reports` |
| Delete report | button | Removes a report | Deletes from `ethics_reports` |

Nulls: unassigned investigator shows `—`. An empty report list shows an
honest empty state.

## Interlinks
- **Outbound** — public submit form at `/ethics-reporting-submit`. Stub
  "Link to Risk" and "Link to Incident" buttons exist but are not yet wired.
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group).

## Compliance
- **EU Directive 2019/1937** — whistleblower protection.
- **US SOX §806** — whistleblower provisions.
- **ISO 37002:2021** — whistleblowing management.
- **ISO/IEC 42001** — A.5.3 (AI ethics and accountability).
- **UN Guiding Principles** — remedy mechanism.

## Operations
Empty state: when no reports exist, shows an honest empty state.
Anonymous submissions carry no reporter identity — `View Identity` is
disabled for anonymous reports. Writes throw on failure. The legacy `SEED`
constant in the component is unused — reports load from the backend via
`useEthicsReportsData`. Realtime: not realtime; staleTime-based React Query
refresh.
