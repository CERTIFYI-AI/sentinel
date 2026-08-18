# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""The authorization decision for one agent calling one tool.

Deliberately pure: no database, no clock, no I/O. Everything the decision
depends on is an argument, so the rules can be tested exhaustively and read in
one sitting — which matters more here than anywhere else in the codebase,
because this function is the difference between a governed agent and an
ungoverned one.

**Order is part of the contract.** Checks run cheapest-and-most-absolute first,
and the first failing check wins:

    1. the agent is known
    2. the tool is known
    3. the tool's server is approved
    4. the tool itself is approved
    5. the agent holds a grant for that tool
    6. the agent is inside the tool's rate limit
    7. the tool does not require a human
    8. → allowed

Two properties of that order are worth stating because they are easy to lose:

* **Authorization precedes rate limiting.** A tool an agent may not call at all
  should be told so plainly, not told to slow down — a 429 on a call that would
  never be permitted is a misleading answer that invites a retry loop.
* **Human approval is last.** There is no point queueing a person to approve
  something policy would refuse anyway; a reviewer's attention is the scarcest
  resource in the loop.

Fail-closed everywhere. An empty ``allowed_agent_ids`` means *no agent is
granted*, not *every agent is granted* — the opposite reading would silently
open every tool the moment someone cleared the field.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

DecisionKind = Literal["allowed", "denied", "pending_approval"]

ReasonCode = Literal[
    "allowed",
    "unknown_agent",
    "unknown_tool",
    "server_blocked",
    "server_restricted",
    "tool_blocked",
    "tool_not_approved",
    "agent_not_granted",
    "rate_limited",
    "approval_required",
]

#: `mcp_servers.approval_state` / `mcp_tools.approval_state` values that permit
#: a call. `restricted` is deliberately absent for servers: it means "reachable
#: only under an explicit grant", which the grant check below then decides.
_APPROVED = "approved"


@dataclass(frozen=True)
class ToolPolicy:
    """Everything about a tool that bears on the decision.

    Mirrors the columns of ``mcp_tools`` joined to its ``mcp_servers`` row.
    Built by the caller from the database so this module never queries.
    """

    tool_id: str
    tool_name: str
    server_id: str
    server_approval_state: str
    approval_state: str
    requires_hitl: bool
    risk_tier: str = "low"
    side_effects: bool = False
    #: Agents granted this tool. EMPTY MEANS NOBODY — see the module docstring.
    allowed_agent_ids: tuple[str, ...] = ()
    #: Per-agent invocations permitted per rolling hour. None = unlimited,
    #: 0 = never (a way to suspend a tool without changing its approval state).
    rate_limit_per_hour: int | None = None


@dataclass(frozen=True)
class Decision:
    """What the gateway decided, and the record it should persist."""

    decision: DecisionKind
    reason_code: ReasonCode
    reason: str
    #: HTTP status a gateway should return for this decision.
    http_status: int
    #: True when a human review item must be raised for this call.
    needs_human_review: bool = False
    #: Populated for observability; never contains tool arguments.
    details: dict = field(default_factory=dict)

    @property
    def allowed(self) -> bool:
        return self.decision == "allowed"


def _deny(code: ReasonCode, reason: str, status: int = 403, **details) -> Decision:
    return Decision(
        decision="denied",
        reason_code=code,
        reason=reason,
        http_status=status,
        details=details,
    )


def evaluate(
    tool: ToolPolicy | None,
    *,
    agent_id: str | None,
    agent_known: bool,
    calls_in_window: int = 0,
) -> Decision:
    """Decide whether ``agent_id`` may invoke ``tool`` right now.

    ``tool`` is None when the requested tool does not exist in this
    organisation — which is itself a denial worth recording, not an error.
    ``calls_in_window`` is how many times this agent has already invoked this
    tool in the current rolling hour; the caller counts it, because counting is
    a database question and this function is not.
    """
    # 1. A caller we cannot identify gets nothing. Recorded rather than
    #    dropped, because repeated unknown-agent denials are how a stolen or
    #    stale token shows up.
    if not agent_id or not agent_known:
        return _deny(
            "unknown_agent",
            "The calling agent is not registered in this organisation.",
            status=401,
            agent_ref=agent_id,
        )

    # 2. Unknown tool. Named plainly so an operator can tell a typo from a
    #    revoked tool.
    if tool is None:
        return _deny(
            "unknown_tool",
            "No such tool is registered for this organisation.",
            status=404,
        )

    # 3. The server the tool lives on. A blocked server overrides everything
    #    below it — that is what makes it a useful kill switch.
    if tool.server_approval_state == "blocked":
        return _deny(
            "server_blocked",
            f"The server hosting {tool.tool_name!r} is blocked, so none of its "
            "tools can be called.",
        )

    # 4. The tool's own approval state.
    if tool.approval_state == "blocked":
        return _deny(
            "tool_blocked",
            f"{tool.tool_name!r} is blocked.",
        )
    if tool.approval_state != _APPROVED:
        return _deny(
            "tool_not_approved",
            f"{tool.tool_name!r} is {tool.approval_state.replace('_', ' ')}, "
            "not approved for use.",
            approval_state=tool.approval_state,
        )

    # 5. The grant. This is the check that makes `allowed_agent_ids` mean
    #    something; without it the column is documentation.
    if agent_id not in tool.allowed_agent_ids:
        return _deny(
            "agent_not_granted",
            f"This agent holds no grant for {tool.tool_name!r}.",
            granted_agents=len(tool.allowed_agent_ids),
        )

    # 5b. A restricted server is reachable only by a granted agent — which, by
    #     this point, the caller is. Anything other than approved/restricted is
    #     refused rather than assumed benign.
    if tool.server_approval_state not in (_APPROVED, "restricted"):
        return _deny(
            "server_restricted",
            f"The server hosting {tool.tool_name!r} is "
            f"{tool.server_approval_state.replace('_', ' ')}.",
            server_approval_state=tool.server_approval_state,
        )

    # 6. Rate limit. Only reached by a call that is otherwise permitted, so a
    #    429 here always means "later", never "never".
    limit = tool.rate_limit_per_hour
    if limit is not None and calls_in_window >= limit:
        return _deny(
            "rate_limited",
            f"{tool.tool_name!r} allows {limit} call(s) per hour per agent; "
            f"this agent has made {calls_in_window}.",
            status=429,
            limit=limit,
            calls_in_window=calls_in_window,
        )

    # 7. Human oversight (EU AI Act Art. 14). The call is permitted in
    #    principle and paused for a person — a distinct outcome from a denial,
    #    and the UI must not render it as one.
    if tool.requires_hitl:
        return Decision(
            decision="pending_approval",
            reason_code="approval_required",
            reason=f"{tool.tool_name!r} requires human approval before it runs.",
            http_status=202,
            needs_human_review=True,
            details={"risk_tier": tool.risk_tier, "side_effects": tool.side_effects},
        )

    # 8. Allowed.
    return Decision(
        decision="allowed",
        reason_code="allowed",
        reason=f"{tool.tool_name!r} is approved and granted to this agent.",
        http_status=200,
        details={"risk_tier": tool.risk_tier, "side_effects": tool.side_effects},
    )
