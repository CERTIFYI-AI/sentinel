# Sentinel Dashboard Guide

The Sentinel dashboard is a single-page React application served at `http://your-sentinel-host/dashboard`. It requires no separate deployment.

## Signing In

Navigate to `/dashboard/login`. Two authentication methods are available:

- **API Key** (recommended for solo operators): Paste any `sk-sentinel-*` key. Keys are created in Settings > API Keys.
- **Email + Password** (for teams): Used by team members invited via Settings > Team.

Session tokens expire after 24 hours. You will be redirected to login automatically when the token expires.

## The Trust Pulse Bar

Every page shows a 2px bar at the very top of the viewport. This is the most important signal in the dashboard.

| Color | Zone | Score Range |
|-------|------|-------------|
| Green (#22c55e) | HEALTHY | >= 0.85 |
| Amber (#f59e0b) | DEGRADED | 0.70 - 0.84 |
| Red (#ef4444) | CRITICAL | < 0.70 |

Hover for the exact score and label. The color transitions smoothly as the live average trust score changes. It reflects the last 2-second WebSocket push from `/ws/metrics`.

> **Note:** Trust signal colors (green/amber/red) are semantic data colors, intentionally different from the brand green (#368F4D). Brand green = brand identity. Trust green = data meaning.

## Overview Page

**URL:** `/overview`

Four stat cards show live metrics updated every 2 seconds:

| Card | Meaning |
|------|---------|
| Avg Trust Score | Rolling average across all requests in the last 5 minutes |
| Requests/min | Current request rate |
| Intervention Rate | % of requests that triggered any fallback |
| Active Providers | Providers in CLOSED state / total configured |

### Trust Gauge

Large radial gauge showing the current average trust score with a color-coded outer ring. Below the gauge: four component scores (RAG entailment, cross-check agreement, PII cleanliness, semantic drift).

### Provider Health Grid

One card per configured provider. Shows circuit breaker state, failure count, and P95 latency. A pulsing red dot means the provider is OPEN and fallback routing is active.

### Intervention Timeline

Area chart of the last 60 minutes, stacked by intervention level: NONE / REGENERATE / UPGRADE / HITL. Large HITL area = review queue backlog.

### Cost per Truth Chart

Two-line chart: total LLM cost vs. verified cost (cost of only those responses that passed the trust threshold). The gap between lines is your verification overhead.

## Audit Log Page

**URL:** `/audit`

The tamper-proof record of every request Sentinel processed.

### Columns

| Column | Description |
|--------|-------------|
| Timestamp | Hover for full ISO 8601 |
| Request ID | First 12 chars + copy button |
| Trust Score | Color-coded badge |
| Intervention | NONE / REGENERATE / UPGRADE / HITL |
| Latency | Total pipeline latency in ms |
| Cost | USD cost for this request LLM calls |
| PII | Count of redacted entities, or - |

### Row Expansion

Click the expand icon to see:
- Claim-by-claim NLI scores (claim text, ENTAILMENT/NEUTRAL/CONTRADICTION, confidence)
- Sources retrieved from the golden source
- Redaction summary (entity types found, not the original values)
- Prompt hash and response hash (SHA-256)

### Chain Integrity Verification

The "Verify Chain Integrity" button calls `GET /api/audit/integrity`. This recomputes the SHA-256 hash chain for every entry in your tenant audit log and confirms no records have been modified.

## HITL Queue Page

**URL:** `/hitl`

Three-panel layout for human review of Level 3 interventions.

- **Left panel** - Job List: Pending review jobs sorted by priority.
- **Middle panel** - Job Detail: Three candidate responses with trust scores and claim-level breakdowns.
- **Right panel** - Review Form: Select an approved candidate or write a custom response.

## Compliance Page

**URL:** `/compliance`

Evidence Center for 7 prebuilt compliance frameworks. Each framework card shows name, jurisdiction flag, legal status badge, 7-day compliance score, and controls passing count.

### Control Heatmap

Grid view: rows = frameworks, columns = controls. Cell color = 7-day pass rate. Click to open an evidence sheet for that specific control.

### Generating a Report

Click "Generate Report" to open the export sheet. Select frameworks and date range. Download as JSON with a SHA-256 fingerprint for integrity verification.

## Model Inventory Page

**URL:** `/models`

See: [Model Inventory Guide](model-inventory-guide.md)

## Settings Page

**URL:** `/settings`

See: [Settings Guide](settings-guide.md)

## Command Palette

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) from any page.

Groups:
- **Navigation** - jump to any page
- **Actions** - Verify Chain, Generate Report, Create API Key, Add Model, Invite Member
- **Recent** - last 5 audit request IDs (click to filter audit log)
- 
## Gap Analysis Page

**URL:** `/gap-analysis`

Identifies compliance gaps across frameworks with actionable remediation guidance.

- **Framework Grouping** — Controls organized by framework (EU AI Act, ISO 42001, NIST AI RMF, SOC 2, GDPR, HIPAA, Singapore AIGA)
- **Coverage Metrics** — Percentage bars showing compliance coverage per framework
- **Gap Filtering** — Filter by status (compliant, partial, non-compliant) and framework
- **Expandable Details** — Click any control row to see detailed gap description and remediation steps

## Benchmark Page

**URL:** `/benchmark`

Compare AI model performance across safety, fairness, robustness, and compliance metrics.

- **Summary Cards** — Average scores across all models for accuracy, fairness, robustness, and safety
- **Sortable Metrics** — Sort models by any metric dimension
- **Score Bars** — Visual progress bars with color-coded thresholds (green >= 90%, amber >= 80%, red < 80%)
- **Trend Indicators** — Up/down/stable trend arrows per model
- **Cost & Latency** — Per-model latency (seconds) and cost per 1K tokens
- **Status Badges** — Passing, warning, or failing status per model

## Dataset Hub Page

**URL:** `/datasets`

Manage evaluation and test datasets used for AI model benchmarking.

- **Search & Filter** — Search by name or tags, filter by type (evaluation, training, validation, test)
- **Stats Dashboard** — Total datasets, record counts, storage usage, active count
- **Tag System** — Categorized tags (truthfulness, safety, bias, fairness, compliance, etc.)
- **Dataset Cards** — Each dataset shows name, type badge, description, record count, file size, creation date, and last usage
- **Actions** — View, download, and delete per dataset

## Model Lifecycle Page

**URL:** `/model-lifecycle`

Track AI models through development, testing, staging, production, and deprecation stages.

- **Pipeline Visualization** — Circular stage indicators showing model count per stage with directional arrows
- **Gate Checks** — Each model has 4 gate checks: safety, bias, compliance, performance. Green = passed, gray = pending
- **Expandable Cards** — Click to reveal gate check status and action buttons
- **Actions** — Promote (advance to next stage), View Details, Rollback (production only)

## Risk Matrix Page

**URL:** `/risk-matrix`

AI model risk assessment using a standard likelihood x impact scoring matrix.

- **5x5 Heatmap** — Interactive grid with color-coded cells (critical/high/medium/low). Cells show risk count overlay
- **Risk Register** — Sortable table with risk name, model, category, likelihood, impact, composite score, risk level, and owner
- **Risk Levels** — Critical (15-25), High (10-14), Medium (5-9), Low (1-4)
- **Categories** — Safety, Fairness, Privacy, Reliability, Compliance, Performance, Strategic, Security

## Vendor Register Page

**URL:** `/vendors`

Third-party AI vendor compliance and risk management.

- **Stats Cards** — Total vendors, critical tier count, approved count, average compliance score
- **Search** — Filter vendors by name or category
- **Risk Tiers** — Critical, high, medium, low with color-coded badges
- **Compliance Bars** — Visual compliance score progress bars per vendor
- **Certifications** — SOC 2, ISO 27001, GDPR, FedRAMP, HIPAA badges per vendor
- **Status** — Approved, under-review, or restricted

## Remediation Tracker Page

**URL:** `/remediation`

Track and manage compliance gaps and remediation actions.

- **Status Summary** — Cards showing total, open, in-progress, and resolved counts
- **Status Filters** — Filter by open, in-progress, resolved, or deferred
- **Priority Badges** — Critical, high, medium, low with color coding
- **Framework References** — Each item shows framework and control ID (e.g., EU AI Act / ART-10.2)
- **Assignment** — Assignee and due date per remediation item

## Export Center Page

**URL:** `/export`

Generate and download compliance reports, audit data, and assessments.

- **Quick Templates** — One-click export templates for Compliance Report (PDF), Risk Assessment (XLSX), Benchmark Data (CSV), Audit Trail (JSON)
- **Export History** — Table of all exports with name, format, scope, record count, file size, status, and creation date
- **Status Tracking** — Completed, processing (with spinner), queued, and failed states
- **Download** — Direct download button for completed exports

## Notifications Page

**URL:** `/notifications`

Centralized notification center for all system alerts and events.

- **Unread Badge** — Count of unread notifications
- **Type Filters** — Filter by all, unread, critical, warning, info, success
- **Read/Unread State** — Unread notifications highlighted with blue ring. Click to mark as read
- **Mark All Read** — Bulk mark all notifications as read
- **Source Attribution** — Each notification shows source system (Safety Monitor, Fairness Engine, Compliance Scanner, etc.)

## Eval Workbench Page

**URL:** `/evals`

Run evaluation suites against AI models with configurable parameters.

## Metric Studio Page

**URL:** `/metric-studio`

Create and manage custom evaluation metrics.

## Proxy Activity Page

**URL:** `/proxy`

Real-time activity timeline of all proxied LLM requests.

## Task Board Page

**URL:** `/tasks`

Kanban-style task management for compliance and governance work items.

## Incident Log Page

**URL:** `/incident-log`

Record and track AI system incidents with severity classification and resolution tracking.
