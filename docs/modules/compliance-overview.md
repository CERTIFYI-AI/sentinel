# Compliance Overview

**Routes:** `/compliance`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `frameworks`, `controls`, `compliance_scores` (org-scoped, RLS)

## Purpose
Derived posture dashboard showing framework-level compliance scores, control
coverage, and recent scoring activity — the compliance officer's landing page.

## Why it exists
ISO/IEC 42001 9.3 requires management review of the AI management system's
performance. A compliance officer needs a single view of which frameworks are
tracked, how coverage stands, and what changed — without drilling into each
framework individually. This page is that view.

## How it works
1. Framework scores are derived from real `frameworks` rows — each framework's
   score reflects the ratio of implemented/effective controls to total
   in-scope controls.
2. Control coverage is computed from `controls` rows mapped to each framework,
   using `status` to determine implementation state.
3. `compliance_scores` stores periodic recalculations — the mesh's
   ComplianceImpact agent writes here, so this screen reflects live
   governance telemetry.
4. No literal scores are invented; `—` is shown where nothing is measured yet.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Total frameworks, average score, controls mapped, recent recalculations | Read-only from `frameworks` + `controls` + `compliance_scores` |
| Framework cards | card grid | Each framework with score bar, control count, last-scored date | Read-only; click navigates to framework detail |
| Score history | table | Recent `compliance_scores` rows with framework, score, scored_at | Read-only |
| Gap Analysis link | InterlinkChip | Navigates to Gap Analysis | → `/compliance/gap-analysis` |
| Controls link | InterlinkChip | Navigates to Controls library | → `/compliance/controls` |

Nulls: a framework with no scored controls shows `—` for its score, not `0%`.
An empty state renders when no frameworks are configured.

## Interlinks
- **Outbound** — InterlinkChip to `/compliance/gap-analysis` (gaps),
  InterlinkChip to `/compliance/controls` (control library), framework cards
  navigate to individual framework detail.
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group);
  serves as the group landing page.

## Compliance
- **EU AI Act** — Art. 9 (risk management system): visualises control
  coverage across obligated frameworks.
- **ISO/IEC 42001** — 9.3 (management review): provides the posture view
  leadership reviews.

## Operations
Empty state: when no frameworks exist, shows an honest empty state with a
link to add frameworks. Writes: read-only page — no mutations. The
ComplianceImpact mesh agent writes `compliance_scores` rows; this page only
reads them. Realtime: not realtime; staleTime-based React Query refresh.
