# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the agent tool-call authorization rules.

`evaluate` is pure, so these cover the decision table exhaustively rather than
sampling it. The assertions are about the choices that are easy to get subtly
wrong and impossible to notice afterwards:

  * an empty grant list means NOBODY, not everybody;
  * authorization is decided before rate limiting, so a 429 always means
    "later" and never "never";
  * human approval is a third outcome, not a flavour of denial;
  * a tool from another tenant is indistinguishable from a tool that does not
    exist.
"""

from __future__ import annotations

import pytest

from sentinel.gateway.policy import ToolPolicy, evaluate

AGENT = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"


def tool(**over) -> ToolPolicy:
    base = dict(
        tool_id="t-1",
        tool_name="create_ticket",
        server_id="s-1",
        server_approval_state="approved",
        approval_state="approved",
        requires_hitl=False,
        risk_tier="low",
        side_effects=False,
        allowed_agent_ids=(AGENT,),
        rate_limit_per_hour=None,
    )
    base.update(over)
    return ToolPolicy(**base)


def decide(t: ToolPolicy | None, *, agent=AGENT, known=True, calls=0):
    return evaluate(t, agent_id=agent, agent_known=known, calls_in_window=calls)


# ── the happy path ──────────────────────────────────────────────────────────


class TestAllowed:
    def test_approved_and_granted_is_allowed(self):
        d = decide(tool())
        assert d.decision == "allowed"
        assert d.allowed is True
        assert d.http_status == 200
        assert d.needs_human_review is False

    def test_allowed_decision_carries_the_risk_context(self):
        # The record has to say what was permitted, not just that something was.
        d = decide(tool(risk_tier="high", side_effects=True))
        assert d.details["risk_tier"] == "high"
        assert d.details["side_effects"] is True


# ── identity ────────────────────────────────────────────────────────────────


class TestIdentity:
    def test_unknown_agent_is_401_not_403(self):
        # 403 would say "you may not"; the truth is "we do not know who you are".
        d = decide(tool(), known=False)
        assert d.reason_code == "unknown_agent"
        assert d.http_status == 401

    def test_missing_agent_id_is_refused(self):
        d = decide(tool(), agent="", known=True)
        assert d.reason_code == "unknown_agent"

    def test_unknown_agent_is_still_recorded_with_the_id_presented(self):
        # Repeated unknown-agent denials are how a stale or stolen token shows
        # up, so the presented id must survive into the record.
        d = decide(tool(), agent="ghost", known=False)
        assert d.details["agent_ref"] == "ghost"

    def test_unknown_tool_is_404(self):
        d = decide(None)
        assert d.reason_code == "unknown_tool"
        assert d.http_status == 404

    def test_identity_is_checked_before_the_tool_exists(self):
        # An unknown caller asking for an unknown tool learns nothing about
        # whether that tool exists.
        d = decide(None, known=False)
        assert d.reason_code == "unknown_agent"


# ── approval state ──────────────────────────────────────────────────────────


class TestApprovalState:
    def test_blocked_server_overrides_an_approved_tool(self):
        d = decide(tool(server_approval_state="blocked"))
        assert d.reason_code == "server_blocked"

    def test_blocked_tool_is_denied(self):
        d = decide(tool(approval_state="blocked"))
        assert d.reason_code == "tool_blocked"

    @pytest.mark.parametrize("state", ["under_review", "restricted"])
    def test_anything_short_of_approved_is_denied(self, state):
        d = decide(tool(approval_state=state))
        assert d.decision == "denied"
        assert d.reason_code == "tool_not_approved"
        # The operator needs to know which state refused them.
        assert d.details["approval_state"] == state

    def test_the_reason_names_the_tool(self):
        d = decide(tool(approval_state="under_review", tool_name="wire_transfer"))
        assert "wire_transfer" in d.reason


# ── grants: the check that makes allowed_agent_ids mean something ───────────


class TestGrants:
    def test_agent_without_a_grant_is_denied(self):
        d = decide(tool(allowed_agent_ids=(OTHER,)))
        assert d.reason_code == "agent_not_granted"

    def test_empty_grant_list_means_nobody(self):
        # The opposite reading — empty means everybody — would silently open
        # every tool the moment someone cleared the field. Fail closed.
        d = decide(tool(allowed_agent_ids=()))
        assert d.decision == "denied"
        assert d.reason_code == "agent_not_granted"
        assert d.details["granted_agents"] == 0

    def test_one_of_several_granted_agents_is_allowed(self):
        d = decide(tool(allowed_agent_ids=(OTHER, AGENT)))
        assert d.allowed

    def test_a_restricted_server_is_reachable_by_a_granted_agent(self):
        # "restricted" means reachable only under an explicit grant, which this
        # agent holds — so it is allowed, unlike "blocked".
        d = decide(tool(server_approval_state="restricted"))
        assert d.allowed

    def test_a_restricted_server_still_refuses_an_ungranted_agent(self):
        d = decide(tool(server_approval_state="restricted", allowed_agent_ids=(OTHER,)))
        assert d.reason_code == "agent_not_granted"

    def test_an_unrecognised_server_state_is_refused_not_assumed_benign(self):
        d = decide(tool(server_approval_state="under_review"))
        assert d.decision == "denied"
        assert d.reason_code == "server_restricted"


# ── rate limiting ───────────────────────────────────────────────────────────


class TestRateLimit:
    def test_none_means_unlimited(self):
        assert decide(tool(rate_limit_per_hour=None), calls=10_000).allowed

    def test_zero_means_never(self):
        # A way to suspend a tool without changing its approval state.
        d = decide(tool(rate_limit_per_hour=0), calls=0)
        assert d.reason_code == "rate_limited"

    def test_under_the_limit_is_allowed(self):
        assert decide(tool(rate_limit_per_hour=5), calls=4).allowed

    def test_at_the_limit_is_refused(self):
        # The Nth call is the last allowed one, so a count equal to the limit
        # means the budget is spent.
        d = decide(tool(rate_limit_per_hour=5), calls=5)
        assert d.reason_code == "rate_limited"
        assert d.http_status == 429
        assert d.details == {"limit": 5, "calls_in_window": 5}

    def test_authorization_is_decided_before_rate_limiting(self):
        # An agent with no grant must be told that, not told to slow down —
        # a 429 on a call that would never be permitted invites a retry loop.
        d = decide(tool(allowed_agent_ids=(OTHER,), rate_limit_per_hour=0), calls=99)
        assert d.reason_code == "agent_not_granted"
        assert d.http_status == 403


# ── human oversight ─────────────────────────────────────────────────────────


class TestHumanApproval:
    def test_requires_hitl_is_a_third_outcome_not_a_denial(self):
        d = decide(tool(requires_hitl=True))
        assert d.decision == "pending_approval"
        assert d.allowed is False
        assert d.decision != "denied"
        assert d.http_status == 202
        assert d.needs_human_review is True

    def test_approval_is_evaluated_last(self):
        # No point queueing a person to approve what policy already refuses;
        # a reviewer's attention is the scarcest thing in the loop.
        d = decide(tool(requires_hitl=True, approval_state="blocked"))
        assert d.decision == "denied"
        assert d.needs_human_review is False

    def test_approval_is_not_requested_for_an_ungranted_agent(self):
        d = decide(tool(requires_hitl=True, allowed_agent_ids=(OTHER,)))
        assert d.reason_code == "agent_not_granted"
        assert d.needs_human_review is False

    def test_a_rate_limited_call_does_not_queue_a_human(self):
        d = decide(tool(requires_hitl=True, rate_limit_per_hour=1), calls=1)
        assert d.reason_code == "rate_limited"
        assert d.needs_human_review is False


# ── record shape ────────────────────────────────────────────────────────────


class TestRecordShape:
    def test_every_outcome_carries_a_machine_code_and_human_prose(self):
        cases = [
            decide(tool()),
            decide(tool(), known=False),
            decide(None),
            decide(tool(approval_state="blocked")),
            decide(tool(allowed_agent_ids=())),
            decide(tool(rate_limit_per_hour=0)),
            decide(tool(requires_hitl=True)),
        ]
        for d in cases:
            assert d.reason_code, "a decision with no code cannot be grouped"
            assert d.reason and d.reason[0].isupper() or "'" in d.reason
            assert d.decision in {"allowed", "denied", "pending_approval"}
            assert 200 <= d.http_status < 500

    def test_no_decision_leaks_tool_arguments(self):
        # `details` reaches the database; arguments must never travel with it.
        for d in [decide(tool()), decide(tool(rate_limit_per_hour=0))]:
            assert "arguments" not in d.details
            assert "payload" not in d.details

    def test_reason_codes_match_the_database_constraint(self):
        # The CHECK constraint in 20260831000001 lists exactly these. A code
        # the column rejects would make the write fail after the decision.
        allowed = {
            "allowed", "unknown_agent", "unknown_tool", "server_blocked",
            "server_restricted", "tool_blocked", "tool_not_approved",
            "agent_not_granted", "rate_limited", "approval_required",
        }
        produced = {
            decide(tool()).reason_code,
            decide(tool(), known=False).reason_code,
            decide(None).reason_code,
            decide(tool(server_approval_state="blocked")).reason_code,
            decide(tool(server_approval_state="under_review")).reason_code,
            decide(tool(approval_state="blocked")).reason_code,
            decide(tool(approval_state="under_review")).reason_code,
            decide(tool(allowed_agent_ids=())).reason_code,
            decide(tool(rate_limit_per_hour=0)).reason_code,
            decide(tool(requires_hitl=True)).reason_code,
        }
        assert produced <= allowed
        # And every code the constraint allows is reachable, or it is dead
        # vocabulary that will drift out of step with the rules.
        assert produced == allowed
