# Executive Surfaces — Dashboard, CISO Dashboard, Board Report, Peer Benchmarking

**Routes:** `/overview` (`/` and `/dashboard` redirect here) · `/ciso` ·
`/ciso/report` · `/peer-intelligence` ·
**Backing:** no tables of their own — every figure is derived at render from the
governed tables listed below ·
**Code:** `dashboard/src/pages/Overview.tsx`,
`dashboard/src/pages/ciso/CisoDashboard.tsx`,
`dashboard/src/pages/ciso/BoardReport.tsx`,
`dashboard/src/pages/PeerIntelligence.tsx`

## Purpose

The surfaces a customer, an executive or an auditor reaches first. They own no
data. Their whole job is to summarise the governed inventory truthfully, and to
let the reader click through from any number to the records behind it.

## Why it exists

An AI governance platform is judged on the first screen. If the front page or
the board pack carries a figure nobody measured, every other honest number in
the product is worth less — the reader has no way to tell which is which.

## How it works

- **Dashboard** (`/overview`) reads eleven org-scoped sources and renders KPI
  tiles, an attention ribbon, a risk-trend series, framework and regulatory
  scorecards, a live model risk heat map (`ai_models.risk_tier ×
  lifecycle_stage`), a 90-day compliance calendar, and supply-chain / shadow-AI
  / kill-switch cards derived from `supply_chain_attestation_status ×
  ai_models` and `agent_gov_registry`.
- **CISO Dashboard** (`/ciso`) carries Overview / Metrics / ROI / Board Report
  tabs, all computed live.
- **Board Report** (`/ciso/report`, also embedded as a CISO tab) renders risk,
  compliance, incident and model sections plus Priority Actions derived from
  real open critical/high risks, unresolved incidents, failed bias audits and
  failed control tests. It exports real CSV/JSON via `lib/exportUtils.ts`, each
  file carrying a provenance block, and logs the export via `logAction`.
- **Peer Benchmarking** (`/peer-intelligence`) has **no data source**, and says
  so — see below.

## Data sources

| Surface | Reads |
| --- | --- |
| Dashboard | `risks`, `incidents`, `ai_models`, `vendors`, `frameworks`, `tasks`, `hitl_reviews`, `audit_log`, `compliance_calendar`, `agent_gov_registry`, `supply_chain_attestation_status` |
| CISO Dashboard | `ai_models`, `risks`, `incidents`, `frameworks`, `vendors` |
| Board Report | the above plus `controls`, `gaps` (derived), `bias_audits` |
| Peer Benchmarking | none |

## The honesty rules these surfaces are held to

These are stricter than elsewhere in the platform, because the reader of a board
pack cannot audit the number in front of them.

1. **A figure with no backing query is not rendered.** Not greyed, not
   footnoted, not labelled "simulated" — removed. If a section has no source, it
   renders an honest empty state naming what is missing.
2. **Null renders `—`, never `0`, and never green.** An unscored framework is
   not 0% compliant. An unmeasured control is not a failing control. Averages
   exclude unscored rows and state the true denominator ("Across N of M
   scored").
3. **No trend without stored history.** The platform stores no posture
   snapshots, so no quarter-over-quarter movement is claimed anywhere. A trend
   the data cannot support is not approximated.
4. **Every number is reachable.** Each KPI and table row links to the records
   behind it by uuid (`?open=<uuid>`), so a reader can always get from a count
   to the things counted.
5. **Exports carry provenance.** Org, period, `data_as_of` timestamp, source
   tables, and a plain statement that figures are point-in-time counts, not
   audited, with no trend because no snapshots exist. Exports are audit-logged.
6. **A failed query is an error, never an empty state.** A dead source renders a
   named error, not a confident zero. Dashboard reports "N of 11 data sources
   unavailable" rather than showing greens.

## Peer Benchmarking — deliberately inert

The module renders an empty state and no peer figures. Benchmarking requires
contributed data from other organisations, and there is **no opt-in mechanism,
no contribution table, no anonymisation step and no peer cohort** anywhere in
the product.

Until that pipeline exists, the module says so. An illustrative layout is
available behind an explicit toggle, watermarked as describing no organisation
and not to be exported or quoted.

This is recorded because of what was there before: the page asserted *"powered
by 47 financial services peers"*, *"All peer data fully anonymized · Zero PII
shared"* and *"This proprietary dataset — built exclusively from Sentinel
clients — cannot be replicated by any alternative platform"*, all backed by four
hardcoded arrays. That is a fabricated **product claim**, not a fabricated
metric — a customer reading it would reasonably believe their data was being
pooled into a network that does not exist. If peer benchmarking is built, the
claims may return only when each one is true.

## Interlinks

**Outbound** — `/risks?open=<uuid>`, `/risk/incidents?open=<uuid>`,
`/models/inventory/<uuid>`, `/bias-audits?open=<uuid>`,
`/compliance/controls/<uuid>`, `/compliance/gap-analysis`, `/frameworks`,
`/tasks`, `/supply-chain`, `/aibom`, `/agents`, `/calendar`.

**Inbound** — reached from the sidebar and the command palette. These are
summary surfaces: nothing links *to* a dashboard figure, which is correct.

## Compliance

- **EU AI Act Art. 12** — Board Report exports call `logAction`, so the moment a
  governance figure leaves the platform is traceable to a real actor.
- **Art. 13 (transparency)** — the provenance block on every export states what
  the figures are and, explicitly, what they are not.
- Dashboards themselves are a reporting view over governed records; the
  underlying obligations are mapped in the module docs for the sources.

## Operations

- No migrations, no tables, no seeds.
- Cost note: Dashboard holds eleven client-side fetches. Derived values are
  memoised so the risk-threshold slider does not re-run them per drag tick.

## History

Rebuilt 2026-08-17 after an adversarial audit. Board Report previously imported
seven mock collections from `data/seed.ts` and rendered ~20 invented figures,
including a risk score of `14.2/25` and a `↓2.6 pts vs Q4 2025` trend against a
baseline the schema cannot store; its export was a `setTimeout` that produced no
file. Dashboard carried eight fabricated sections (TD-009), including
`94.2% — 48 of 51 production models carry verified cryptographic AIBOM
attestations`, which sat directly above a working link to the real AIBOM
register. See TD-009 in `../reference/technical-debt.md`.
