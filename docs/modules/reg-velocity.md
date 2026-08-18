# Reg Velocity

**Routes:** `/reg-velocity`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** derived from `regulation_entries` (org-scoped, RLS)

## Purpose
Change-pressure analytics derived from the regulatory register, showing the
pace and volume of upcoming regulatory obligations across jurisdictions and
their impact on the AI model fleet.

## Why it exists
When multiple regulations take effect in the same quarter across different
jurisdictions, the compliance team needs to understand the aggregate load —
not just individual deadlines. Reg Velocity answers "how much regulatory
change is coming and where?" so resourcing and prioritisation decisions can
be made with data.

## How it works
1. All figures are derived live from `regulation_entries` on every fetch —
   nothing is stored separately.
2. Entries effective in the next 90/180 days are counted, grouped by
   jurisdiction and status.
3. Open vs. met obligations are tallied from each entry's `obligations`
   jsonb array.
4. Impacted models are the union of all `linked_model_ids` across upcoming
   entries.
5. Per-jurisdiction load is visualised as a breakdown showing which
   jurisdictions carry the most upcoming regulatory activity.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Entries in 90d/180d, open obligations, met obligations, impacted models | Read-only derived |
| Jurisdiction breakdown | chart/cards | Regulatory load per jurisdiction | Read-only derived |
| Obligation status | summary | Open vs. met across upcoming regulations | Read-only derived |
| Model impact list | list | Models affected by upcoming regulations | Read-only derived |
| Reg Radar link | InterlinkChip | Full timeline view | → `/reg-radar` |

Nulls: all figures are derived counts — zero is honest when no entries match
the time window. An empty state renders when no regulation entries exist.

## Interlinks
- **Outbound** — InterlinkChip to `/reg-radar` (timeline view),
  model links to `/models/inventory/:id`.
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group).

## Compliance
- **EU AI Act** — Art. 9 (risk management system): quantifies regulatory
  change pressure for planning.
- **ISO/IEC 42001** — 6.1.1 (actions to address risks and opportunities):
  data-driven view of the regulatory landscape.

## Operations
Empty state: when no regulation entries exist, shows an honest empty state.
Pure read-only: all data is derived from `regulation_entries`, no separate
table or mutations. Realtime: not realtime; staleTime-based React Query
refresh.
