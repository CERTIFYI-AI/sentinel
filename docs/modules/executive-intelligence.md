# Executive Intelligence

**Routes:** `/executive-center` (redirects to `/ciso?tab=metrics`), `/ciso`, `/roi`, `/value-realization`, `/peer-intelligence`, `/reporting`
**Status:** Production, except `/peer-intelligence` — not connected
**Owner:** Executive · **Backing table(s):** aggregates from `frameworks`, `controls`, `risks`, `incidents`, `compliance_scores`, `ai_models` (org-scoped, RLS); reporting via `reportingService.ts`

## Purpose
Leadership-facing views of GRC posture, risk exposure, programme value, and
peer benchmarking. Provides grounded narrative output for board reporting.

## Why it exists
NIST AI RMF GOVERN 4.1 requires senior leadership accountability. ISO/IEC
42001 9.3 mandates management review. SOC 2 CC1.1/CC1.2 covers board
oversight of internal control. Executives need a summary view — not the
detail a compliance officer works in — with trend data and value metrics
that justify the programme's existence.

## How it works
1. `/executive-center` is a redirect to `/ciso?tab=metrics` — there is no
   standalone executive intelligence page.
2. CISO dashboard aggregates posture metrics from controls, risks, incidents,
   and framework scores.
3. Value Realization tracks programme value: hours saved, fines avoided,
   deals unblocked, audit cycle time.
4. Peer benchmarks are **not implemented** — no peer-contribution pipeline
   exists, so `/peer-intelligence` renders an honest empty state (TD-025).
5. Board-pack export composes a report with Narrative Engine commentary.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Trust Score trend | chart | Organisation-wide trust score over time | Read-only derived |
| SLA posture | metric | Control SLA adherence | Read-only derived |
| Control effectiveness | bar | Effective vs total controls | Read-only derived |
| Open high-risk items | count | Critical risks and incidents | Read-only from `risks` + `incidents` |
| Value metrics | cards | Hours saved, fines avoided, deals unblocked | Read-only from value tracking |
| Peer benchmarks | comparison | **Not implemented** — empty state, no figures shown | n/a |
| Board pack export | button | Downloads executive report | Real file export |

Nulls: unmeasured metrics show `—`. Peer benchmarks are not implemented —
unenrolled organisations see an honest empty state.

## Interlinks
- **Outbound** — links to `/risks`, `/compliance`, `/frameworks`, model
  detail pages for drill-down.
- **Inbound** — reachable from sidebar nav (Executive & Reporting group).

## Compliance
- **NIST AI RMF** — GOVERN 4.1 (senior leadership accountability).
- **ISO/IEC 42001** — 9.3 (management review).
- **SOC 2** — CC1.1, CC1.2 (board oversight of internal control).
- **COSO ERM** — board and executive risk oversight.

## Operations
`/executive-center` is a redirect — no standalone component. All data is
aggregated from existing tables — no separate executive-specific storage.
Board-pack export is a real file. Realtime: not realtime; staleTime-based
React Query refresh.
