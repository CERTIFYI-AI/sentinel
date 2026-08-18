# Compliance Calendar

**Routes:** `/calendar`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `compliance_calendar` (org-scoped, RLS) + derived deadlines from sibling tables

## Purpose
Unified deadline and milestone view that aggregates both manual compliance
entries and live-derived events from across the platform into a single
calendar interface.

## Why it exists
EU AI Act Art. 72 and ISO/IEC 42001 9.1 require ongoing monitoring with
documented timelines. Regulatory filings, conformity-assessment renewals,
training windows, and exception expiries each have their own table — an
officer who has to open five modules to know what is due this month will miss
something. The calendar centralises every deadline onto one surface.

## How it works
1. Manual entries are CRUD records in `compliance_calendar` (title, due date,
   category, linked entity).
2. Derived events are computed at read time from sibling tables:
   - `conformity_assessments.valid_until` → renewal deadlines
   - `compliance_exceptions` expiry dates
   - `tabletop_exercises` scheduled dates
   - `regulator_filings` statutory deadlines
   - `training_assignments` completion windows
3. Each derived event carries `source_type` and `source_id` so a click
   navigates to the originating record. Derived events are read-only and
   never persisted.
4. The calendar renders month/week views with colour-coded categories and
   overdue highlighting.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Month/week toggle | tab strip | Switches calendar layout | Client-side render |
| Category filter | dropdown | Filters by compliance category | Client-side filter |
| Add event | button + dialog | Creates a manual calendar entry | Writes to `compliance_calendar` |
| Event click | navigation | Opens the source record | Navigates to originating module |
| Overdue badge | visual | Highlights past-due items in red | Read-only indicator |
| Today marker | visual | Highlights the current date | Read-only indicator |

Nulls: a date field renders `—` when unset. An empty calendar shows an
honest empty state.

## Interlinks
- **Outbound** — click-through on derived events routes to the source module
  (`/conformity-assessment`, `/compliance/exceptions`, `/tabletop`, etc.).
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group);
  deep-link `?date=YYYY-MM-DD` scrolls to that date.

## Compliance
- **EU AI Act** — Art. 72 (post-market monitoring): centralises statutory
  deadlines so nothing is missed.
- **ISO/IEC 42001** — 9.1 (monitoring, measurement, analysis): provides the
  timeline view over compliance activities.

## Operations
Empty state: when no events exist, shows an honest empty state. Manual
entries are org-scoped with RLS; derived events inherit the org scope of
their source table. Writes throw on failure. Realtime: not realtime;
staleTime-based React Query refresh.
