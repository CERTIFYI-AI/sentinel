# Reporting

**Route:** `/reporting` ·
**Backing:** `security_reports` + `security_report_runs` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/reporting/Reporting.tsx`,
`dashboard/src/services/securityGroupService.ts` (report functions),
`dashboard/src/hooks/useSecurityGroup.ts`
(`useReports` / `useReportRuns` / `useGenerateReport`)

## Purpose

Report definitions that snapshot the platform's real registers on demand. Each
generation reads the named tables, persists the result as a run, and hands the
viewer that exact artifact to download — a real document, not a rendered mock.

## Why it exists

Before the 2026-08-25 rebuild `/reporting` was one of the most fabrication-dense
pages in the product. It read `reporting_table (id, doc jsonb)` for its
"scheduled reports" and rendered everything else from hardcoded arrays:

- `REPORT_TEMPLATES` — eight cards with invented "Last generated" dates;
- `GENERATION_HISTORY` — eight fake runs signed by named people ("Sarah Chen",
  "System (Scheduled)") with invented durations ("3.8s");
- `SCHEDULED_REPORTS` — three fake schedules with invented recipients;
- the Preview tab's `COMPLIANCE_DATA` / `RISK_TREND` / `PIE_DATA` — charts drawn
  from arrays typed into the file, captioned "live data";
- an "Approvals & Sign-off" tab describing "RSA-SHA256 with certificate
  binding" signing the product does not perform;
- a fake generate flow (`setTimeout(2000)` → "Report Generated Successfully"
  with a dead Download button) and a "4.2s Avg Generation Time" KPI.

All removed, not relabelled. The page now reuses the same real
`security_reports` backend the Security Report Generator uses, with a model
interlink added.

## How it works

- **Real tables, org-scoped.** Report definitions live in `security_reports`;
  each generation writes a `security_report_runs` row whose `content` is a
  data-driven snapshot of the security tables the definition names. `org_id`
  filled by the DB default `current_user_org_id()`. Writes throw; save /
  delete / generate call `logAction` (Art. 12).
- **Generation is real.** `generateReport` fetches each selected section from
  its tenant-scoped table, assembles the snapshot, sizes it, persists the run
  and bumps the definition's `generation_count` / `last_generated_at`. The UI
  downloads that persisted `content` — the artifact and the stored run are the
  same bytes.
- **A never-generated report is not faked.** `last_generated_at` is null until a
  real run; the list renders `—` and the "Never generated" KPI counts them.
- `?model=<ai_models.id>` filters to a model's reports with a dismissible chip;
  `?open=<security_reports.id>` opens a definition (applied-once). A thrown
  query renders an `ErrorState`.

## Fields (`security_reports`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope |
| `name` | text NOT NULL | |
| `category` | text | `posture` / `vulnerabilities` / `red_team` / `compliance` / `executive` |
| `description` | text | |
| `frequency` | text | `on_demand` / `weekly` / `monthly` / `quarterly` |
| `sections` | jsonb | Register keys to snapshot (`threats`, `scans`, …) |
| `recipients` | text[] | |
| `format` | text | `json` / `csv` |
| `generation_count` | integer | Bumped on each real run |
| `last_generated_at` | timestamptz | `—` until a real run |
| `linked_model_id` | uuid → `ai_models(id)` | Model scope (added 2026-08-25); null = org-wide |

`security_report_runs` carries `report_id`, `status`, `generated_by`,
`generated_at`, `format`, `content` (the snapshot), `size_bytes`.

## Interlinks (both directions)

- **Outbound:** `linked_model_id` → the model detail page; the run `content`
  references the security records it covers.
- **Inbound:** a model's detail page reaches its reports via
  `/reporting?model=<id>`; `?open=<id>` opens a definition.

## Compliance

- EU AI Act Art. 12 (record-keeping) — generation and definition changes are
  audit-logged; each run is an immutable persisted artifact.
- The removed "digital signature" tab claimed eIDAS / RSA-SHA256 signing the
  product does not perform; it is not represented as shipped.

## Operations

Generate from the list row or the detail drawer; the run downloads immediately
and is retained in run history for re-download. Deleting a definition retains
its persisted run artifacts.
