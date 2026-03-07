import pathlib

BASE = pathlib.Path(__file__).parent

def w(p, c):
    f = BASE / p
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(c.lstrip())
    print(f'  wrote {p}')

# FILE 3 - Dashboard Guide (NEW)
w('docs/guides/dashboard-guide.md', '''
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
''')

# FILE 4 - Model Inventory Guide (NEW)
w('docs/guides/model-inventory-guide.md', '''
# Model Inventory Guide

The Model Inventory page (`/models`) gives you a live view of every LLM provider configured for your tenant, their circuit breaker state, and comparative performance metrics.

## Understanding Model Roles

| Role | Meaning |
|------|---------|
| Primary | Receives all requests by default. Only one primary per tenant. |
| Fallback | Receives requests when the primary circuit breaker is OPEN, or when Level 2 (UPGRADE) intervention triggers. |
| Evaluation | Receives no production traffic. Used for A/B testing via the Test feature. |
| Disabled | Configured but inactive. Not used in any request routing. |

## Circuit Breaker States

| State | Meaning | What happens |
|-------|---------|-------------|
| CLOSED | Healthy | Normal routing |
| OPEN | Failing | Requests skip this provider, routed to fallback |
| HALF_OPEN | Recovering | One test request allowed through; if it fails, back to OPEN |

The failure threshold and window are configurable in Settings > Trust & Safety.

## Adding a Model

1. Click **Add Model** (top right)
2. Select your provider (OpenAI, Anthropic, Azure, Local, Custom)
3. Enter the model name (e.g. `gpt-4o-mini`) and your API key
4. Select a role
5. Click **Test Connection** to verify the key and model are reachable
6. Click **Save Model**

API keys are stored encrypted at rest. They are never returned by any API endpoint after initial save.

## Comparing Models

Select 2-4 models using the checkboxes on each card. A comparison drawer appears at the bottom of the screen showing 7-day average trust score, P95 latency, cost per 1,000 tokens, request volume, and circuit breaker state.

The winner in each metric row is highlighted. Use this to make informed decisions about which model to promote to primary.

## Resetting a Circuit Breaker

1. Find the model card with OPEN or HALF_OPEN state
2. Click the **Reset** button
3. The circuit breaker moves to HALF_OPEN
4. The next request will test the connection
5. If it succeeds: moves to CLOSED. If it fails: moves back to OPEN

> **Warning:** Do not reset a circuit breaker before confirming the upstream issue is resolved.

## Testing a Model

Click **Test** on any model card to open the Test sheet. Enter a prompt (or use a preset). The request goes through the full Sentinel pipeline (PII masking, LLM call, verification, circuit breaker). Results show the trust score, component scores, intervention level, latency, and the actual response text.

Use this to:
- Validate a newly added model before setting it as primary
- Debug why a specific prompt is getting a low trust score
- Confirm PII masking is working for your use case
''')

# FILE 5 - Settings Guide (NEW)
w('docs/guides/settings-guide.md', '''
# Settings Guide

Settings are at `/settings`. Sections are accessible via the left navigation or directly via URL: `/settings/trust-safety`, `/settings/api-keys`, etc.

## General

| Field | Description |
|-------|-------------|
| Organization name | Displayed in the dashboard header |
| Tenant ID | Read-only. Your immutable tenant identifier for API calls |
| Plan | Current plan. Contact support to upgrade |
| Timezone | Used for timestamps in the dashboard and exports |

Changes require clicking **Save Changes**. Unsaved changes are indicated by an amber dot next to "General" in the settings navigation.

## Trust & Safety

### Trust Score Threshold

The most important config value. Responses with trust scores below this value trigger the intervention cascade (REGENERATE > UPGRADE > HITL).

The slider track shows three zones:
- **Red** (0.60-0.69) - CRITICAL: only use for low-stakes non-factual content
- **Amber** (0.70-0.84) - DEGRADED: suitable for general consumer applications
- **Green** (0.85-0.99) - HEALTHY: recommended for regulated industries

Presets:
- Healthcare: 0.92 (clinical information requires high accuracy)
- Finance: 0.88 (regulatory and fiduciary context)
- General SaaS: 0.85 (default)

### Injection Block Threshold

Prompts with injection scores above this value are blocked before reaching the LLM. Default: 0.78. Lower = more aggressive blocking. Higher = less blocking.

### Circuit Breaker Config

- **Failure threshold** - how many failed verifications trigger OPEN state
- **Recovery timeout** - seconds before moving from OPEN to HALF_OPEN

### HITL Canned Response

The text shown to the user while their request is in the HITL review queue. Maximum 500 characters.

## PII Detection

### Detection Mode

- **Full detection** (Presidio + spaCy): 18 entity types, highest accuracy. Requires `en_core_web_lg`.
- **Regex fallback**: 5 entity types (Email, Phone, SSN, Credit Card, IP). No additional dependencies.

### Entity Types

Check or uncheck to control which entity types trigger redaction.

### Custom Patterns

Add your own regex patterns for domain-specific PII. Example: internal employee IDs matching `EMP-\\d{6}`.

## API Keys

See: [Auth Guide](auth-guide.md#api-keys)

## Compliance

Enable or disable each of the 7 prebuilt frameworks.

| Framework | Status | When to enable |
|-----------|--------|-----------|
| EU AI Act | MANDATORY LAW | If you serve EU users |
| GDPR | MANDATORY LAW | If you process EU personal data |
| China GenAI Regs | MANDATORY LAW | If you operate in mainland China |
| ISO/IEC 42001 | CERTIFIABLE | For certification |
| NIST AI RMF | VOLUNTARY | US de facto standard |
| OECD AI Principles | POLICY GUIDE | Policy alignment |
| IEEE 7000 | TECH STANDARD | Design audit only |

> **Important:** Evidence accumulation starts the moment you enable a framework. There is no retroactive computation. Enable frameworks before you start processing production traffic.

## Notifications

| Alert | Default | Recommended |
|-------|---------|-------------|
| Trust score degradation | Off | Enable with threshold 0.75 |
| Circuit breaker opened | Off | Enable - always want to know |
| HITL queue depth | Off | Enable with limit 10 |
| Audit chain violation | On (locked) | Cannot disable - critical |
| PII detection spike | Off | Enable with threshold 20% |

Delivery channels: Email, Webhook, or None.

## Team

| Role | Dashboard | HITL review | API proxy | Manage keys | Admin |
|------|-----------|-------------|-----------|------------|-------|
| admin | Yes | Yes | Yes | Yes | Yes |
| reviewer | Yes | Yes | No | No | No |
| api | No | No | Yes | No | No |

Invitations are sent by email. Pending invitations expire after 7 days.
''')

# FILE 6 - Auth Guide (NEW)
w('docs/guides/auth-guide.md', '''
# Authentication Guide

## How authentication works

Sentinel uses JWT-based authentication. Every request to a protected endpoint must include:

```
Authorization: Bearer <token>
```

Tokens are short-lived (24 hours). Obtain one via `POST /api/auth/token`.

## API Keys vs. Email/Password

**API keys** (`sk-sentinel-*`) are the recommended method for:
- CI/CD pipelines
- Server-to-server integration
- The LLM proxy (`POST /v1/chat/completions`)
- Automated scripts

**Email/Password** is for team members who use the dashboard interactively.

## Creating an API Key

1. Sign in to the dashboard
2. Navigate to Settings > API Keys
3. Click **Create New Key**
4. Name it (e.g. "Production API Key")
5. Select a role: `api` / `reviewer` / `admin`
6. Set an expiry (or "Never" for long-lived infrastructure keys)
7. Click **Create Key**
8. **Copy the full key immediately.** It will not be shown again.

## Using an API Key

```bash
# Exchange for a JWT
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token \\
  -H "Content-Type: application/json" \\
  -d \'{"api_key": "sk-sentinel-AbCdEfGh..."}\' | jq -r .access_token)

# Use the JWT on every request
curl http://localhost:8000/v1/chat/completions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d \'{...}\'
```

For production use, implement token refresh logic: request a new token when the current one is within 1 hour of expiry.

## Revoking a Key

Settings > API Keys > find the key > click **Revoke**. Revocation is immediate.

## Security recommendations

- Rotate API keys on a schedule (90-day maximum recommended)
- Use different keys for different environments (dev, staging, prod)
- Assign the minimum required role (`api` for proxy-only access)
- Enable the HITL queue depth notification
- Audit key usage via Settings > API Keys (last used timestamp)
''')

# FILE 7 - UI Component Reference (NEW)
w('docs/ui-component-reference.md', '''
# UI Component Reference

Reference for shared components used across the Sentinel dashboard. Relevant for contributors extending the frontend.

## TrustScoreBadge

Renders a colored badge for a trust score value.

**Props:** `score: number` (0.0 to 1.0), `size?: "sm" | "md" | "lg"`

Color logic:
- score >= 0.85: green (trust high)
- score 0.70-0.84: amber (trust medium)
- score < 0.70: red (trust low)

Value is always rendered in IBM Plex Mono.

## InterventionBadge

**Props:** `level: "NONE" | "REGENERATE" | "UPGRADE" | "HITL"`

Colors: zinc / blue / amber / red

## FrameworkBadge

**Props:** `status: "mandatory_law" | "certifiable" | "voluntary" | "policy_guide" | "tech_standard"`

Colors: red / blue / green / zinc / zinc

## StatCard

Four-field card: title, value, subtitle, optional trend. Value always rendered in IBM Plex Mono.

## TrustPulseBar

Fixed 2px bar at viewport top. Props: `score: number`. Color updates on every WebSocket push from `/ws/metrics`. On hover: expands to 4px and shows tooltip with exact score and label.

## Chart Colors

All Recharts colors must come from `src/lib/chart-colors.ts`. Never pass a Tailwind class or hardcoded hex to a Recharts prop.

```typescript
import { chartColors } from "@/lib/chart-colors"

// Correct
<Line stroke={chartColors.trustHigh} />

// Wrong
<Line stroke="text-green-500" />
<Line stroke="#22c55e" />
```

## Font Rules

| Content type | Font |
|-------------|------|
| Trust scores | IBM Plex Mono |
| Request IDs and hashes | IBM Plex Mono |
| Latency values (ms) | IBM Plex Mono |
| Cost values ($) | IBM Plex Mono |
| API keys | IBM Plex Mono |
| All other text | IBM Plex Sans |

Apply monospace with the `font-mono` class. Never use `font-family` directly in component JSX.
''')

# CHANGELOG entry - prepend to existing
changelog_entry = '''
## [0.2.0] - 2025-03-07

### Added
- Enterprise dashboard UI v2 built on shadcn/ui
- Login and Signup pages with JWT authentication
- Two-step signup with plan selection (Free / Pro / Enterprise)
- Model Inventory page: provider health, circuit breaker states, comparison drawer
- Add Model wizard: 3-step flow with connection test before save
- Test Model sheet: full pipeline test with claim scores and latency breakdown
- Settings page: 8 sections (General, Trust & Safety, PII, Models, API Keys, Compliance, Notifications, Team)
- Trust Pulse Bar: 2px viewport-top indicator showing live trust zone
- Command palette (Cmd+K): global navigation and action shortcuts
- Compliance Evidence Center: per-framework tabs with control heatmap
- Report export with SHA-256 fingerprint
- API key management: create, revoke, rotate via dashboard UI
- Team management: invite members, assign roles, track last active
- Webhook notifications for all alert conditions
- 7 compliance frameworks now enable/disable per-tenant from UI

### Changed
- Primary brand color updated to #368F4D (forest green)
- Sidebar: active indicator uses brand green, collapsed to 60px icon-only mode
- All primary buttons, focus rings, and interactive accents use #368F4D
- Trust signal colors (green/amber/red) unchanged - these are semantic, not brand

### Fixed
- Chart colors now loaded exclusively from CSS variables
- ThemeProvider initializes with defaultTheme="dark"
- CORS restricted to SENTINEL_CORS_ORIGINS env var

### API
- `GET /api/models` - list configured providers
- `POST /api/models` - add new provider
- `PATCH /api/models/{id}` - update role/config
- `DELETE /api/models/{id}` - remove provider
- `POST /api/models/{id}/reset-cb` - reset circuit breaker
- `POST /api/models/test-connection` - test before save
- `GET /api/auth/keys` - list API keys
- `POST /api/auth/keys` - create API key
- `DELETE /api/auth/keys/{id}` - revoke API key
- `POST /api/auth/register` - create tenant account
- `GET /api/team/members` - list team members
- `POST /api/team/invites` - send invitation
- `GET /api/compliance/frameworks` - list frameworks with scores
- `PATCH /api/compliance/frameworks/{id}` - enable/disable framework
'''

# Prepend to CHANGELOG.md
cl_path = BASE / 'CHANGELOG.md'
old_cl = cl_path.read_text() if cl_path.exists() else ''
cl_path.write_text(changelog_entry.lstrip() + '\n' + old_cl)
print('  prepended CHANGELOG.md')

print('\nDone! All documentation files generated.')
