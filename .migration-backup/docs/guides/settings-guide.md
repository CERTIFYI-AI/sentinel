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

Add your own regex patterns for domain-specific PII. Example: internal employee IDs matching `EMP-\d{6}`.

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
