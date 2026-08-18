# Gap Analysis

**Routes:** `/compliance/gap-analysis`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** derived from `controls`, `frameworks`, `compliance_scores` (org-scoped, RLS)

## Purpose
Computed view of compliance gaps — controls that are mapped and in-scope but
not yet implemented or effective — grouped by framework with coverage
rollups.

## Why it exists
ISO/IEC 42001 10.1 requires identification and correction of nonconformities.
EU AI Act Art. 9 requires continuous improvement of the risk management
system. Knowing which controls remain unimplemented is the prerequisite for
prioritised remediation. This page derives that from the control library
rather than maintaining a separate gap register.

## How it works
1. Gaps are computed, never authored: any mapped **in-scope** control not
   implemented/effective becomes a gap row.
2. Controls marked `not_applicable` are out of scope — they are NOT gaps and
   do not count toward coverage.
3. Gaps are grouped by framework and merged with mesh-recorded gap strings
   from `compliance_scores.gaps`.
4. Per-framework rollup (implemented+effective vs in-scope total, with a
   coverage bar) is derived live from the control library on every fetch
   (`fetchGaps` returns `{ gaps, rollups }`; hook: `useGaps`).
5. Each gap links to its control record for remediation.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Framework rollup | card row | Coverage bar per framework (implemented vs in-scope) | Read-only derived |
| Gap list | table | Each gap with control ref, framework, status, owner | Read-only derived |
| Control link | InterlinkChip | Navigate to the gap's control record | → `/compliance/controls?open=<id>` |
| Export CSV | button | Downloads the gap list as CSV | Real CSV file |
| Framework filter | dropdown | Filters gaps by framework | Client-side filter |

Nulls: a framework with no in-scope controls shows `—` for coverage.
An empty state renders when no gaps are found (all controls implemented).

## Interlinks
- **Outbound** — InterlinkChip to `/compliance/controls?open=<id>` (control
  record), framework cards to framework detail.
- **Inbound** — reachable from Compliance Overview landing page and sidebar
  nav; gaps auto-generate Tasks and Remediation records.

## Compliance
- **EU AI Act** — Art. 9 (risk management system): identifies where
  controls fall short.
- **ISO/IEC 42001** — 10.1 (nonconformity and corrective action):
  systematic gap identification.

## Operations
Empty state: an empty gap list is the ideal state ("all controls
implemented") and is shown with a positive message. Pure derived: nothing
is stored in a gap-specific table. Export is a real CSV of the derived rows.
Realtime: not realtime; staleTime-based React Query refresh.
