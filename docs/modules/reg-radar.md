# Reg Radar

**Routes:** `/reg-radar`, `/reg-radar/:id`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `regulation_entries` (org-scoped, RLS; shared with Regulatory Intelligence)

## Purpose
Horizon-scanning and deadline view over the regulatory register, showing
upcoming regulations, their effective dates, and readiness status.

## Why it exists
EU AI Act Art. 9 and ISO/IEC 42001 6.1.1 require organisations to identify
and assess regulatory obligations affecting their AI systems. Reg Radar
provides the forward-looking lens — what is coming, when it takes effect, and
which models it impacts — so the compliance team can prepare before deadlines
arrive rather than reacting after.

## How it works
1. Reads from `regulation_entries` — the same table that powers Regulatory
   Intelligence — but filters and presents through a deadline/horizon lens.
2. Countdown timers are computed from `effective_on` at render time, never
   stored.
3. Each entry carries `obligations` (jsonb array) and `linked_model_ids` to
   show which AI models are affected.
4. Detail view (`/reg-radar/:id`) shows the full regulation with obligations,
   linked models, and jurisdiction.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Total regulations, upcoming (90d/180d), jurisdictions | Read-only from `regulation_entries` |
| Regulation list | table | Each regulation with title, jurisdiction, effective date, countdown, status | Read-only |
| Horizon filter | dropdown | Filters by time horizon (30/60/90/180 days) | Client-side filter |
| Jurisdiction filter | dropdown | Filters by jurisdiction | Client-side filter |
| Regulation detail | panel | Full detail with obligations, linked models | Read-only |
| Model links | PillLink | Navigate to affected model | → `/models/inventory/:id` |
| Regulatory Intelligence link | InterlinkChip | Full risk-mapping view | → `/regulatory-intelligence` |

Nulls: a regulation with no `effective_on` shows `—` for countdown. Models
that cannot be resolved show "Unavailable".

## Interlinks
- **Outbound** — PillLink to `/models/inventory/:id` (affected models),
  InterlinkChip to `/regulatory-intelligence` (risk-mapping view on same
  data).
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group);
  deep-link `?id=<uuid>` opens that regulation.

## Compliance
- **EU AI Act** — Art. 9 (risk management system): horizon scanning for
  regulatory obligations.
- **ISO/IEC 42001** — 6.1.1 (actions to address risks and opportunities):
  forward-looking regulatory awareness.

## Operations
Empty state: when no regulation entries exist, shows an honest empty state.
One id-space: `regulation_entries` is shared with Regulatory Intelligence —
same rows, different lens. Writes: read-only page — no mutations from this
view (edits go through Regulatory Intelligence). Realtime: not realtime;
staleTime-based React Query refresh.
