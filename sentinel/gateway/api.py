# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HTTP surface for agent tool-call authorization.

An agent runtime asks this endpoint whether a call may proceed **before**
making it. The answer is durable: every decision, allowed or denied, becomes a
``mcp_policy_decisions`` row, because a control that leaves no record of
operating cannot be evidence of anything.

Invariants, in order of importance:

1. **The organisation comes from the caller's verified token.** A client cannot
   authorize a call in someone else's tenant by editing a field, and the tool
   lookup is scoped to that organisation, so a tool id from another tenant
   reads as ``unknown_tool`` rather than leaking its existence.
2. **Tool arguments are never stored.** The request may carry them so the
   caller can fingerprint consistently, but only a SHA-256 of them is
   persisted. Tool arguments routinely carry customer data; an audit table is
   the wrong place for it.
3. **The decision is recorded even when recording is the only thing that
   happened.** A denial produces no ``tool_call_logs`` entry — the call never
   ran — so this table is the sole evidence the gateway did its job.
4. **Human approval is a distinct outcome.** ``pending_approval`` returns 202
   and raises a ``hitl_items`` row; it is not a denial and the caller must not
   treat it as one (EU AI Act Art. 14).

Mounted by the FastAPI app; see ``sentinel/proxy.py``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from sentinel.gateway.policy import Decision, ToolPolicy, evaluate
# Reuse the integrations router's tenant resolution rather than introducing a
# second way to authenticate — one auth path is easier to reason about and to
# audit than two that must be kept in step.
from sentinel.integrations.api import resolve_org

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/gateway", tags=["gateway"])

#: Rolling window the rate limit is measured over. One hour matches the unit
#: `mcp_tools.rate_limit_per_hour` is expressed in; changing one without the
#: other would silently mis-enforce every limit an operator has set.
_WINDOW = "1 hour"


class AuthorizeRequest(BaseModel):
    """Body of an authorization call.

    ``org_id`` is deliberately absent — it comes from the caller's verified
    identity. ``arguments`` is optional and never persisted in the clear.
    """

    agent_id: str = Field(..., min_length=1, max_length=64)
    tool_id: str = Field(..., min_length=1, max_length=64)
    #: Echoed back so the caller can correlate; also written to the decision
    #: row so an allowed decision can be joined to the call it produced.
    invocation_id: str | None = Field(default=None, max_length=128)
    #: Hashed, never stored. Present so repeated identical calls are
    #: recognisable without retaining what they contained.
    arguments: dict[str, Any] | None = None


class AuthorizeResponse(BaseModel):
    decision: str
    reason_code: str
    reason: str
    decision_id: str
    hitl_item_id: str | None = None
    invocation_id: str | None = None


async def _db() -> asyncpg.Connection:
    """Service-role connection. Writing a decision is a privileged act: the
    table has no client insert policy, precisely so evidence cannot be forged
    from a browser."""
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gateway is not configured (no database URL).",
        )
    return await asyncpg.connect(dsn)


def fingerprint(arguments: dict[str, Any] | None) -> str | None:
    """SHA-256 over canonical JSON, or None when there is nothing to hash.

    Sorted keys so the same call fingerprints the same way regardless of how
    the caller happened to serialise it.
    """
    if not arguments:
        return None
    canonical = json.dumps(arguments, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


async def _load_tool(conn: asyncpg.Connection, org_id: str, tool_id: str) -> ToolPolicy | None:
    """The tool joined to its server, scoped to the caller's organisation.

    Out-of-tenant ids return None and therefore read as ``unknown_tool`` — the
    same answer as a genuinely absent tool, which is the answer that leaks the
    least.
    """
    row = await conn.fetchrow(
        """
        SELECT t.id, t.name, t.approval_state, t.requires_hitl, t.risk_tier,
               t.side_effects, t.allowed_agent_ids, t.rate_limit_per_hour,
               s.id AS server_id, s.approval_state AS server_approval_state
          FROM public.mcp_tools t
          JOIN public.mcp_servers s ON s.id = t.server_id
         WHERE t.id = $1::uuid AND t.org_id = $2::uuid
           AND t.is_deleted = false AND s.is_deleted = false
        """,
        tool_id, org_id,
    )
    if row is None:
        return None
    return ToolPolicy(
        tool_id=str(row["id"]),
        tool_name=row["name"],
        server_id=str(row["server_id"]),
        server_approval_state=row["server_approval_state"],
        approval_state=row["approval_state"],
        requires_hitl=bool(row["requires_hitl"]),
        risk_tier=row["risk_tier"] or "low",
        side_effects=bool(row["side_effects"]),
        allowed_agent_ids=tuple(str(a) for a in (row["allowed_agent_ids"] or ())),
        rate_limit_per_hour=row["rate_limit_per_hour"],
    )


async def _agent_exists(conn: asyncpg.Connection, org_id: str, agent_id: str) -> bool:
    try:
        row = await conn.fetchrow(
            "SELECT 1 FROM public.agents WHERE id = $1::uuid AND org_id = $2::uuid",
            agent_id, org_id,
        )
    except (asyncpg.DataError, ValueError):
        # A malformed id is an unknown agent, not a 500.
        return False
    return row is not None


async def _calls_in_window(
    conn: asyncpg.Connection, agent_id: str, tool_id: str
) -> int:
    """Allowed invocations by this agent for this tool in the rolling window.

    Counts ALLOWED decisions only. Counting denials would let a blocked agent
    exhaust its own limit and mask the real reason it is being refused.
    """
    row = await conn.fetchrow(
        f"""
        SELECT count(*) AS n FROM public.mcp_policy_decisions
         WHERE agent_id = $1::uuid AND tool_id = $2::uuid
           AND decision = 'allowed'
           AND decided_at > now() - interval '{_WINDOW}'
        """,
        agent_id, tool_id,
    )
    return int(row["n"]) if row else 0


async def _raise_hitl(
    conn: asyncpg.Connection, org_id: str, tool: ToolPolicy, agent_id: str
) -> str | None:
    """Queue the human review a `requires_hitl` tool demands.

    Best effort by design: if the review row cannot be written the call still
    does not proceed, so failing here can never turn a paused call into an
    allowed one.
    """
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO public.hitl_items
                (org_id, entity_type, entity_id, entity_name, risk_level,
                 trigger_reason, status)
            VALUES ($1, 'mcp_tool_call', $2, $3, $4,
                    'Tool requires human approval before invocation', 'pending')
            RETURNING id
            """,
            org_id, tool.tool_id, tool.tool_name, tool.risk_tier,
        )
        return str(row["id"]) if row else None
    except asyncpg.PostgresError:
        logger.exception("could not queue HITL review for tool=%s", tool.tool_id)
        return None


async def _record(
    conn: asyncpg.Connection,
    *,
    org_id: str,
    decision: Decision,
    agent_id: str | None,
    agent_known: bool,
    tool: ToolPolicy | None,
    tool_ref: str,
    hitl_item_id: str | None,
    invocation_id: str | None,
    request_fingerprint: str | None,
) -> str:
    row = await conn.fetchrow(
        """
        INSERT INTO public.mcp_policy_decisions
            (org_id, agent_id, agent_ref, tool_id, server_id, tool_ref,
             decision, reason_code, reason, hitl_item_id, invocation_id,
             request_fingerprint)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        """,
        org_id,
        agent_id if agent_known else None,
        agent_id,
        tool.tool_id if tool else None,
        tool.server_id if tool else None,
        tool.tool_name if tool else tool_ref,
        decision.decision,
        decision.reason_code,
        decision.reason,
        hitl_item_id,
        invocation_id,
        request_fingerprint,
    )
    return str(row["id"])


@router.post("/authorize", response_model=AuthorizeResponse)
async def authorize(
    body: AuthorizeRequest, org_id: str = Depends(resolve_org)
) -> AuthorizeResponse:
    """Decide whether an agent may invoke a tool, and record the decision."""
    conn = await _db()
    try:
        tool = await _load_tool(conn, org_id, body.tool_id)
        agent_known = await _agent_exists(conn, org_id, body.agent_id)

        # The rate-limit count is only consulted for a call that has cleared
        # authorization, so an unauthorized agent never causes the query.
        calls = 0
        if tool is not None and agent_known and body.agent_id in tool.allowed_agent_ids:
            calls = await _calls_in_window(conn, body.agent_id, tool.tool_id)

        decision = evaluate(
            tool,
            agent_id=body.agent_id,
            agent_known=agent_known,
            calls_in_window=calls,
        )

        hitl_item_id = None
        if decision.needs_human_review and tool is not None:
            hitl_item_id = await _raise_hitl(conn, org_id, tool, body.agent_id)

        decision_id = await _record(
            conn,
            org_id=org_id,
            decision=decision,
            agent_id=body.agent_id,
            agent_known=agent_known,
            tool=tool,
            tool_ref=body.tool_id,
            hitl_item_id=hitl_item_id,
            invocation_id=body.invocation_id,
            request_fingerprint=fingerprint(body.arguments),
        )
    except asyncpg.PostgresError:
        # Never surface the driver message: it can quote the row, and the row
        # carries the request fingerprint and identifiers.
        logger.exception("gateway authorization failed for tool=%s", body.tool_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not evaluate the tool policy. The call was not authorized.",
        ) from None
    finally:
        await conn.close()

    logger.info(
        "gateway decision=%s reason=%s agent=%s tool=%s org=%s",
        decision.decision, decision.reason_code, body.agent_id, body.tool_id, org_id,
    )
    return AuthorizeResponse(
        decision=decision.decision,
        reason_code=decision.reason_code,
        reason=decision.reason,
        decision_id=decision_id,
        hitl_item_id=hitl_item_id,
        invocation_id=body.invocation_id,
    )
