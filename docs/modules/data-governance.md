# Data Governance

**Routes:** `/datasets`, `/data-governance`, `/data-quality`, `/data-lineage`
**Status:** Production
**Owner:** AI Assets · **Backing table(s):** `datasets` (org-scoped, RLS), `dsar_requests` (org-scoped, RLS)

## Purpose
Inventory training/evaluation/production datasets, track quality and lineage,
manage Data Subject Access Requests (DSAR), and enforce data minimisation
and purpose limitation.

## Why it exists
EU AI Act Art. 10 mandates data governance for training, validation, and
test datasets. ISO/IEC 42001 A.7 covers data for AI systems. GDPR
Art. 5(1)(c)(d) requires data minimisation and accuracy. Without a dataset
registry, there is no evidence of what data trained which model, no quality
metrics, and no lineage for audit.

## How it works
1. Datasets are registered in `datasets` with source, licence, collection
   basis, labelling method, statistics, bias tests, retention, and linked
   models.
2. Data lineage tracks raw → curated → feature → training set → model
   version relationships.
3. DSAR tracker manages data-subject requests with status workflow and SLA
   tracking via `dsar_requests`.
4. Data quality view surfaces quality metrics per dataset.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | MetricTile row | Total datasets, active, quality score, DSAR count | Read-only |
| Data Inventory tab | table | Datasets with name, type, source, quality, linked models | Read-only from `datasets` |
| Data Lineage tab | cards | Dataset → model lineage chains | Read-only derived |
| Consent Management tab | table | Consent records by dataset | Read-only |
| DSAR Tracker tab | table | DSAR requests with status, deadline, assignee | Read/write from `dsar_requests` |
| Detail Sheet | panel | Full dataset detail | Read-only |
| New DSAR | dialog | Creates a new data subject access request | Writes to `dsar_requests` |
| Delete dataset | button | Removes a dataset | Deletes from `datasets` |
| Export CSV | button | Downloads dataset inventory | Real CSV file |
| Dataset link | navigation | Navigate to dataset detail | → `/datasets/:id` |

Nulls: datasets with no quality score show `—`. An empty inventory shows
an honest empty state.

## Interlinks
- **Outbound** — navigation to `/datasets/:id` (dataset detail),
  linked models to `/models/inventory/:id`.
- **Inbound** — reachable from sidebar nav (AI Assets group); model detail
  pages link to their training datasets; RoPA entries reference datasets.

## Compliance
- **EU AI Act** — Art. 10 (data governance for AI training/validation/test).
- **ISO/IEC 42001** — A.7 (data for AI systems).
- **ISO/IEC 25012 / 5259** — data quality for analytics and ML.
- **GDPR** — Art. 5(1)(c)(d) (data minimisation and accuracy).
- **DAMA-DMBOK 2** — data management body of knowledge.
- **BCBS 239** — risk data aggregation (financial services).

## Operations
Empty state: when no datasets exist, shows an honest empty state. Source
comment confirms "Supabase-wired — no mock data." DSAR creation writes
throw on failure. Realtime: not realtime; staleTime-based React Query
refresh.
