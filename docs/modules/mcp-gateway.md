# MCP Gateway

**Routes:** `/mcp-gateway` (Overview) · `/mcp-gateway/servers` · `/mcp-gateway/tools`
**Service:** `mcpService.ts` · **Hooks:** `useMcpData.ts`
**Tables:** `mcp_servers`, `mcp_tools`

## Purpose

Governs the Model Context Protocol surface: the backend servers your AI agents
connect to, and the individual tools those servers expose. Every tool carries a
risk tier, an approval state, a human-review requirement and an explicit
allow-list of the agents permitted to call it.

## Why this module exists

An agent is only as safe as the tools it can reach. A well-behaved model with
access to a `hold_transaction` tool can move money; the same model with only
read tools cannot. MCP made tool access easy to add and correspondingly easy to
lose track of — which is precisely the gap regulators probe.

This module exists so three questions have recorded answers:

1. **What can our agents actually do?** Not what the prompt says they should do —
   what the tool surface permits. (EU AI Act Art. 14 human oversight;
   ISO 42001 A.9.2 operational controls)
2. **Which agent may call which tool, and who approved that?**
   (Art. 14; ISO 42001 A.9.3)
3. **What is the blast radius if a server is compromised?** Recorded through the
   server's data-sensitivity ceiling and the side-effect flags on its tools.
   (Art. 9 risk management)

Before this module existed the three screens ran on in-file mock arrays with no
database behind them — meaning the platform displayed a tool inventory it had
never actually governed. That is the failure mode this module is designed against.

## How it works

### Servers

An `mcp_servers` row is a registered backend. Beyond connection details
(`url`, `transport`, `auth_method`) it carries the two fields that matter for
governance:

- **`approval_state`** — `approved` · `under_review` · `restricted` · `blocked`.
  A server that has not been approved is visible and flagged rather than quietly
  operational.
- **`data_sensitivity`** — the *ceiling* of what may be sent to it
  (`public` → `restricted`). A restricted server is one whose traffic is subject
  to additional logging and rate limits.

`status` and `last_error` capture live health. A server can be healthy and
unapproved at the same time — those are independent facts, and conflating them
is how ungoverned access happens.

Where a server fronts a registered connector, `integration_id` links it to the
Integrations module so the data path is traceable end to end.

### Tools

An `mcp_tools` row is one callable capability. The governance-bearing fields:

- **`category`** — `read` · `write` · `execute` · `admin`. Anything other than
  `read` can change state in a system of record.
- **`side_effects`** — whether the call is observable outside Sentinel.
- **`requires_hitl`** — whether a human must approve before the call proceeds.
- **`risk_tier`** — `low` → `critical`, driving review cadence.
- **`allowed_agent_ids`** — uuids into `agent_gov_registry`. An **empty array
  means no agent is permitted**, which the UI surfaces as "no agent allow-list"
  rather than treating it as unrestricted.
- **`input_schema`** — the JSON Schema of accepted arguments, so an auditor can
  see exactly what the tool consumes.

### Overview

Every figure on the Overview is computed from the two registries — server health
percentage, exposed-tool count, write/execute exposure, human-review coverage,
and recorded 30-day invocations. The "needs attention" panel links to the records
behind each count, so a number is never a dead end.

## Fields

### `mcp_servers`

| Column | Type | Meaning |
|---|---|---|
| `id` / `org_id` | uuid | Canonical id; tenant defaulted DB-side |
| `name` / `url` / `description` | text | Identity and endpoint |
| `transport` | text | `https` · `stdio` · `sse` · `websocket` |
| `auth_method` | text | `bearer_token` · `mtls` · `oauth2` · `basic` · `none` |
| `status` | text | `healthy` · `degraded` · `offline` · `unknown` |
| `environment` | text | `production` · `staging` · `development` |
| `data_sensitivity` | text | Ceiling: `public` · `internal` · `confidential` · `restricted` |
| `approval_state` | text | `approved` · `under_review` · `restricted` · `blocked` |
| `integration_id` | uuid → `integrations.id` | The connector this server fronts |
| `last_ping_at` / `last_error` | timestamptz / text | Live health |
| `owner_name` | text | Accountable owner |
| `config` | jsonb | Rate limits, region, audit flags |
| `is_deleted` | boolean | Soft delete |

### `mcp_tools`

| Column | Type | Meaning |
|---|---|---|
| `id` / `org_id` | uuid | Canonical id; tenant defaulted DB-side |
| `server_id` | uuid → `mcp_servers.id` | Owning server (cascade delete) |
| `name` / `description` | text | Tool identity |
| `category` | text | `read` · `write` · `execute` · `admin` |
| `risk_tier` | text | `low` · `medium` · `high` · `critical` |
| `approval_state` | text | As per servers |
| `requires_hitl` | boolean | Human approval required before the call proceeds |
| `side_effects` | boolean | Call is observable outside Sentinel |
| `input_schema` | jsonb | JSON Schema of accepted arguments |
| `scopes` | text[] | Permission scopes the tool needs |
| `allowed_agent_ids` | uuid[] → `agent_gov_registry.id` | Empty = no agent permitted |
| `invocations_30d` / `last_invoked_at` | int / timestamptz | Usage evidence |
| `is_deleted` | boolean | Soft delete |

## Interlinks

- **Servers → Integrations** — `integration_id`; the server row links to the connector.
- **Servers → Tool Catalog** — `?server=<uuid>` deep link with a dismissible filter chip.
- **Tools → Agents** — `allowed_agent_ids`; each pill links to the agent record.
- **Overview → both lists** — every attention row navigates to the records behind it.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 9 | Risk tier and side-effect flags size the blast radius of each capability |
| EU AI Act Art. 12 | All CRUD audit-logged via `logAction`; invocation counts retained |
| EU AI Act Art. 14 | `requires_hitl` enforces a human in the loop; `allowed_agent_ids` bounds autonomy |
| EU AI Act Art. 15 | Server health and error state evidence robustness |
| ISO/IEC 42001 A.9.2 / A.9.3 | Operational controls and access control over AI capabilities |
| ISO/IEC 42001 A.6.2.6 | Continuous monitoring of the tool surface |

## Operations

- **Onboarding a server:** register it as `under_review` with the correct data
  ceiling *before* granting any agent access. Approval is a deliberate act.
- **Granting a tool to an agent:** edit the tool and add the agent to the
  allow-list. The change is audit-logged and visible from the agent record.
- **A degraded server:** `last_error` carries the observed reason; open a task
  against the integration so remediation carries an SLA.
- **Retention:** servers and tools are soft-deleted; deleting a server cascades
  to its tools at the FK level, so orphan tools cannot exist.
