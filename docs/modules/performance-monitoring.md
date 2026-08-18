# Performance Monitoring

**Route:** `/performance-monitoring` ·
**Backing:** `model_performance_metrics` (org-scoped, `org_id` DB default) ·
**Service:** `dashboard/src/services/modelAnalyticsService.ts` ·
**Code:** `dashboard/src/pages/performance/PerformanceMonitoring.tsx`

## Purpose

The fleet-wide view of how registered models are actually behaving in
production: latency, throughput, accuracy, error rate, drift and cost per
inference, each as a recorded time series rather than a headline number.

## Why it exists

Post-market monitoring is an obligation, not a nice-to-have: a provider of a
high-risk AI system must monitor performance across its lifetime and act when it
degrades. Drift and error-rate trends are also the earliest signal that a model
needs re-validation or retirement, which is why this module sits next to the
registry rather than inside an ops dashboard.

## How it works

- One card per model in the registry, keyed by `ai_models.id` (uuid) — the same
  id-space as everything else, so a card always resolves to a real model.
- Each card shows the **latest** recorded metrics plus a trend series drawn from
  the real `recorded_at` timestamps, rendered with Recharts.
- A model with no telemetry renders an honest empty state. There are no
  fabricated endpoints, no invented history and no synthetic SLO targets — if a
  metric was never recorded, nothing is drawn for it.
- `?model=<uuid>` filters the page to a single model, with a dismissible chip,
  following the platform's deep-link convention.
- Refresh invalidates the React Query cache rather than mutating anything; this
  module is read-only.

## Fields

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `org_id` | uuid | Tenant scoping, DB default `current_user_org_id()` |
| `model_id` | uuid | → `ai_models.id` |
| `model_name` | text | Denormalised label; the id is authoritative |
| `recorded_at` | timestamptz | When the sample was taken — drives the trend axis |
| `latency_p50` / `latency_p99` | numeric | Latency percentiles |
| `throughput` | numeric | Requests per unit time |
| `accuracy` | numeric | Model accuracy at the sample |
| `error_rate` | numeric | Error fraction |
| `drift_score` | numeric | Drift signal |
| `cost_per_inference` | numeric | Unit cost |
| `request_count` | numeric | Requests in the sample window |
| `metadata` | jsonb | Free-form sample context |

Every metric column is nullable. A null renders as `—`, never as `0` — a model
that reported no error rate is not a model with a zero error rate.

## Interlinks

- **→ Model Registry.** Each card deep-links to `/models/inventory/<model_id>`.
- **← Model Registry.** A model's detail surfaces its recorded performance.
- **→ Model Efficiency / Energy.** Cost and throughput here pair with the
  efficiency modules, which read their own tables.
- Shares `model_performance_metrics` with the model analytics service, so the
  registry and this page never disagree about a number.

## Compliance

- **EU AI Act Art. 72** — post-market monitoring: this is the surface that
  evidences it.
- **EU AI Act Art. 15** — accuracy, robustness and cybersecurity, measured over
  time rather than asserted once.
- **EU AI Act Art. 12** — record-keeping: `recorded_at` gives every sample a
  timestamp that survives independent of the UI.
- **ISO/IEC 42001 §9.1** — monitoring, measurement, analysis and evaluation.

## Operations

- Read-only. There is no write path and therefore no `logAction` requirement.
- `model_name` is denormalised for display convenience only. Resolve names from
  `ai_models` at render time; never join on it.
- The page shows what has been recorded. If a card looks empty, the fix is in
  whatever populates `model_performance_metrics`, not here.
