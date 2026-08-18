# MCP Gateway — tool-call enforcement

**Route:** `/mcp-gateway/decisions` (Policy Decisions), with counts surfaced on
`/mcp-gateway` and `/mcp-gateway/tools` ·
**Backing:** `mcp_policy_decisions` (new), `mcp_tools`, `mcp_servers`,
`hitl_items`, `agents` ·
**Service:** `dashboard/src/services/mcpEnforcementService.ts` ·
**Hook:** `dashboard/src/hooks/useMcpEnforcement.ts` ·
**Code:** `dashboard/src/pages/mcp-gateway/PolicyDecisions.tsx` ·
**Server:** `sentinel/gateway/policy.py` (the rules),
`sentinel/gateway/api.py` (`POST /v1/gateway/authorize`)

## Purpose

Decide whether a given agent may invoke a given tool, refuse it when policy
says no, pause it when a human must approve, and leave a durable record of
every one of those decisions.

## Why it exists

`mcp_tools` already carried a complete authorization policy — `approval_state`,
`requires_hitl`, `side_effects`, `risk_tier`, `scopes`, `allowed_agent_ids` —
and **nothing read any of it at call time**. Operators could set a tool to
"blocked", grant it to two agents and mark it as requiring human review, and an
agent could still call it, because those fields were captured, rendered and
audited as *intent* with no runtime behind them.

That was the widest gap in the platform between what it claims and what it
enforces. This module closes it, and does so at the layer where agent traffic
already arrives by design — no interception of anyone's network traffic, no
certificate authority, no TLS termination.

## How it works

### The decision, in order

`sentinel/gateway/policy.py::evaluate` is pure — no database, no clock, no I/O
— so the rules can be tested exhaustively and read in one sitting. Checks run
cheapest-and-most-absolute first, first failure wins:

| # | Check | Refusal | HTTP |
| --- | --- | --- | --- |
| 1 | the agent is registered in this org | `unknown_agent` | 401 |
| 2 | the tool exists in this org | `unknown_tool` | 404 |
| 3 | the tool's server is not blocked | `server_blocked` | 403 |
| 4 | the tool is approved | `tool_blocked` / `tool_not_approved` | 403 |
| 5 | the agent holds a grant | `agent_not_granted` | 403 |
| 5b | the server state is approved or restricted | `server_restricted` | 403 |
| 6 | the agent is inside the tool's rate limit | `rate_limited` | 429 |
| 7 | the tool does not require a human | `approval_required` → **pending** | 202 |
| 8 | — | allowed | 200 |

Three orderings in that table are deliberate and worth keeping:

- **Authorization precedes rate limiting.** An agent with no grant must be told
  that, not told to slow down — a 429 on a call that would never be permitted
  invites a retry loop against a wall.
- **Human approval is evaluated last.** There is no point queueing a reviewer
  for something policy would refuse anyway; their attention is the scarcest
  resource in the loop.
- **Identity precedes existence.** An unknown caller asking about an unknown
  tool learns nothing about whether that tool exists.

### Fail closed

`allowed_agent_ids = {}` means **no agent is granted**, not *every* agent. The
opposite reading would silently open every tool the moment someone cleared the
field. `ungrantedTools()` surfaces approved-but-ungranted tools in the UI,
because that shape is nearly always unfinished configuration and it fails
silently until somebody tries the tool.

### What is recorded, and what is not

Every decision — allowed, denied and pending alike — becomes an
`mcp_policy_decisions` row. **Denials are the point.** A refused call never
reaches `tool_call_logs`, because the call did not happen, so this table is the
only evidence that the control operated at all.

`request_fingerprint` is a SHA-256 of the arguments, **never the arguments**.
Tool arguments routinely carry customer data; storing them would turn an audit
table into a retention liability, and the fingerprint answers the only question
an auditor asks of them — *was this the same call again?*

### Human approval is not a denial

`pending_approval` returns **202**, raises a `hitl_items` row and links the
decision to it. Policy permitted the call and held it for a person (EU AI Act
Art. 14). The UI renders it in its own tone with its own filter; folding it
into "denied" would misreport what the platform did and hide the queue from the
person who has to clear it.

## Fields

### `mcp_policy_decisions`

| Field | Column | Notes |
| --- | --- | --- |
| `agentId` | `agent_id` | FK to `agents`; NULL when the caller was unknown |
| `agentRef` | `agent_ref` | What the caller presented, kept verbatim so an unknown agent stays traceable |
| `toolId` / `serverId` | same | FK; NULL when the tool was unknown |
| `toolRef` | `tool_ref` | Tool name at decision time, or the raw id when unknown |
| `decision` | `decision` | `allowed` \| `denied` \| `pending_approval` |
| `reasonCode` | `reason_code` | Stable machine code — the UI groups on this |
| `reason` | `reason` | Operator-facing prose; may be reworded freely |
| `hitlItemId` | `hitl_item_id` | The human review this decision raised |
| `invocationId` | `invocation_id` | Correlates an allowed decision to the call it produced |
| — | `request_fingerprint` | SHA-256 of arguments. **Never surfaced in the UI** |

### `mcp_tools` (added)

| Field | Column | Notes |
| --- | --- | --- |
| — | `rate_limit_per_hour` | Per agent, rolling hour. NULL = unlimited, 0 = never |

`0` is a way to suspend a tool without changing its approval state — useful
when you want the approval history to stay intact.

## Interlinks

- **Decision → tool.** `/mcp-gateway/tools?open=<id>`, resolved by id.
- **Decision → agent.** `/agents?open=<id>`; an unregistered caller renders
  "Unregistered", never a raw identifier.
- **Decision → human review.** A pending decision links to `/hitl`.
- **Tool → decisions.** The tool catalogue carries an **Enforcement** column
  with live counts, linking to the filtered feed. "No calls yet" is rendered
  distinctly from zero refusals — never asked is not the same as never refused.
- **Overview → decisions.** The posture card counts real decisions rather than
  `mcp_tools.invocations_30d`, a stored column nothing maintains.

Before this module, `/mcp-gateway`, `/mcp-gateway/servers` and
`/mcp-gateway/tools` had **no cross-module link in or out** (recorded in the
2026-08-18 audit, §F7). They now reach agents, HITL and each other.

## Compliance

- **EU AI Act Art. 12 (record-keeping).** Every decision is a dated row with
  its cause; refusals are retained precisely because they leave no other trace.
- **EU AI Act Art. 14 (human oversight).** `requires_hitl` produces a real,
  queued review with the decision linked to it — oversight as a path, not a
  checkbox.
- **ISO/IEC 42001 §8.1 (operational control), §9.1 (monitoring).** Agent
  autonomy is bounded by a policy that is evaluated, not merely declared, and
  its operation is measured from its own records.
- **Data minimisation.** Arguments are hashed, never stored. The decisions
  table has no client insert policy: a browser able to write a decision would
  make the evidence worthless.

## Operations

- The endpoint is `POST /v1/gateway/authorize`, called by an agent runtime
  **before** the tool call. It requires the same bearer token as the rest of
  the API, and the organisation comes from that token — never from the body.
- Without `SUPABASE_DB_URL` / `DATABASE_URL` the endpoint returns a clear 503
  rather than allowing calls it cannot record.
- A tool from another tenant reads as `unknown_tool`: the same answer as one
  that does not exist, which is the answer that leaks the least.
- Rate limits count **allowed** decisions only. Counting denials would let a
  blocked agent exhaust its own budget and mask the real reason it is refused.
- The rolling window is one hour, matching the unit `rate_limit_per_hour` is
  expressed in. Changing one without the other mis-enforces every limit set.

## History

- **2026-08-31** — Module created. `mcp_tools` had carried a full authorization
  policy since 2026-08-16 with no runtime reading it; this adds the decision
  engine, the durable record, and the surfaces that make enforcement visible.
  30 backend tests cover the decision table exhaustively; 11 frontend tests
  cover the read side, including that a pending approval is never counted as a
  denial.
