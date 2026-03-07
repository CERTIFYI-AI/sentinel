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
