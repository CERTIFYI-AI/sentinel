# Integrations

**Route:** `/integrations` · **Service:** `integrationsService.ts` · **Hooks:** `useIntegrations.ts`
**Tables:** `integrations`, `webhook_endpoints`

## Purpose

The platform's connectivity surface. Integrations are the inbound and outbound
connectors that move governance data between Sentinel and the systems of record
around it — credit bureaux, regulators, core banking, payment switches, SIEM,
identity providers, issue trackers and messaging.

## Why this module exists

Governance evidence is only as good as its provenance. If a fairness audit is run
on a dataset, an auditor's first question is *where did that data come from, and
when was it last refreshed?* Without a connector registry, the answer lives in
someone's memory or a spreadsheet.

This module answers three questions that recur in every AI Act and ISO/IEC 42001
audit:

1. **What external systems touch our AI estate?** (Art. 10 data governance;
   ISO 42001 A.7.2 resources)
2. **In which direction does data flow, and what exactly flows?** (Art. 10;
   GDPR Art. 30 records of processing)
3. **Is the flow currently healthy, and when did it last succeed?** (Art. 15
   accuracy/robustness; ISO 42001 A.6.2.6 operation monitoring)

Webhooks are the outbound half of the same story: they let governance events —
a risk-tier change, a failed validation, a guardrail block — reach the systems
that must react to them, without those systems polling Sentinel.

## How it works

### Connectors

Each row in `integrations` is one connector. It carries an operational state
(`status`), an independently-tracked `health`, and a `direction` describing
whether data comes in, goes out, or both. `last_sync_at` records the last
observed successful exchange; the UI renders it as a relative time and shows
"never" when nothing has been recorded — it is never faked forward.

The **Record a sync** action writes a real `last_sync_at` timestamp to the row.
It deliberately does *not* simulate a sync result: the platform never displays a
fabricated outcome as if it were measured.

### Webhook endpoints

Endpoints are stored in `webhook_endpoints` with an `event_types` array. When an
endpoint is created, a signing secret is generated **client-side**, shown to the
operator exactly once, and only its **sha256 digest** is persisted alongside a
short display prefix. The plaintext secret cannot be recovered afterwards — by
design, and this is a compliance requirement, not a convenience.

Delivery health is tracked through `failure_count`, `last_success_at` and
`last_failure_at`. An endpoint with accumulating failures is visibly flagged
rather than silently retried into the void.

## Fields

### `integrations`

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid | Canonical id |
| `org_id` | uuid | Tenant. Filled by `current_user_org_id()` default — never client-sent |
| `name` | text | Display name |
| `provider` | text | Upstream provider or owning system |
| `category` | text | `credit_bureau` · `regulator` · `core_banking` · `payments` · `monitoring` · `identity` · `ticketing` · `communication` · `mlops` · `storage` · `other` |
| `status` | text | `connected` · `degraded` · `error` · `disconnected` · `configuring` |
| `health` | text | `passing` · `degraded` · `failing` · `unknown` |
| `direction` | text | `inbound` · `outbound` · `bidirectional` |
| `auth_method` | text | How the connection authenticates (mTLS, OAuth 2.0, IAM role, …) |
| `data_flows` | text[] | What actually crosses the boundary — the audit-relevant field |
| `last_sync_at` | timestamptz | Last recorded successful exchange; null renders "never" |
| `connected_at` | date | When the connector went live |
| `owner_name` | text | Accountable owner |
| `config` | jsonb | Connector-specific settings (schedule, rate limits, dataset ids) |
| `is_deleted` | boolean | Soft delete — connectors may be referenced by evidence |

### `webhook_endpoints`

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid | Canonical id |
| `tenant_id` | text | Tenant, defaulted DB-side to `current_user_org_id()::text` |
| `url` | text | Destination |
| `event_types` | text[] | Governance events this endpoint subscribes to |
| `secret_hash` | text | sha256 of the signing secret. **Plaintext is never stored** |
| `secret_prefix` | text | Short display prefix so operators can identify the secret |
| `is_active` | boolean | Delivery on/off |
| `failure_count` | int | Consecutive delivery failures |
| `last_success_at` / `last_failure_at` | timestamptz | Delivery health |
| `max_retries` / `timeout_sec` | int | Delivery policy |

## Interlinks

**This module links out to:** nothing navigational — connectors are referenced
*by* other modules rather than pointing at them.

**Linked to from:**
- **MCP Servers** (`mcp_servers.integration_id → integrations.id`) — an MCP
  server usually fronts a connector; the server row shows the connector name and
  links here.
- **Tasks** (`tasks.linked_entity_type = 'integration'`) — a failing connector
  generates remediation work that points back at the integration record.
- **AI Apps** — the SSO connector is the discovery source for shadow-AI usage.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 10 | `data_flows` records what data crosses each boundary and from which source system |
| EU AI Act Art. 12 | Create/update/delete are audit-logged via `logAction` |
| EU AI Act Art. 15 | `health`, `status` and `last_sync_at` evidence pipeline robustness |
| ISO/IEC 42001 A.6.2.6 | Operational monitoring of the AI system's supporting infrastructure |
| ISO/IEC 42001 A.7.2 | Documented resources and their owners |
| GDPR Art. 30 | Direction plus `data_flows` supports records of processing |
| GDPR Art. 32 | Secrets stored as digests; auth method recorded per connector |

## Operations

- **Rotating a webhook secret:** delete the endpoint and create a new one. There
  is no "reveal" — the digest is one-way, which is the point.
- **A connector in `error`:** check `config.lastError`, then the owning system.
  The Tasks module is the right place to track the fix so it carries an SLA.
- **Retention:** connectors are soft-deleted so historical evidence referencing
  them stays resolvable.
