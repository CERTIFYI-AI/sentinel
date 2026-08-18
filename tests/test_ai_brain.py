# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the AI Brain: chunking, vector marshalling, and the decision path.

The load-bearing assertions are about what the platform DOES with a verdict,
not about the verdict itself:

  * a confident fail reaches the mesh,
  * an unconfident one reaches a person,
  * and a judge that cannot be reached never reads as a passing control.

The database tests run against a real PostgreSQL when SENTINEL_TEST_DATABASE_URL
points at one with the migrations applied; they skip otherwise rather than
mocking asyncpg, because a mocked database proves nothing about SQL.
"""

from __future__ import annotations

import json
import os
import uuid

import pytest
from pydantic import ValidationError

from sentinel.services.compliance_evaluator import (
    ComplianceEvaluator,
    ComplianceVerdict,
)
from sentinel.services.embedding_service import (
    EMBEDDING_DIMENSIONS,
    estimate_tokens,
    split_text,
    to_pgvector,
)

DSN = os.environ.get("SENTINEL_TEST_DATABASE_URL")
needs_db = pytest.mark.skipif(not DSN, reason="SENTINEL_TEST_DATABASE_URL not set")


# ── chunking ─────────────────────────────────────────────────────────────────

def test_empty_text_produces_no_chunks():
    # An embedding of "" is a real vector that matches nothing meaningfully and
    # would sit in the index forever looking like content.
    assert split_text("") == []
    assert split_text("   \n\n  ") == []


def test_chunks_respect_the_token_budget():
    chunks = split_text("Access must be reviewed quarterly. " * 400, chunk_tokens=500)
    assert len(chunks) > 1
    for c in chunks:
        # Allow the overlap prefix to push slightly past the target.
        assert c.token_estimate <= 500 * 1.3, c.token_estimate


def test_chunks_overlap_so_a_straddling_sentence_survives():
    text = "\n\n".join(f"Clause {i}: privileged access must be reviewed." for i in range(200))
    chunks = split_text(text, chunk_tokens=100, overlap_tokens=25)
    assert len(chunks) > 2
    # Consecutive chunks share text; without overlap the most retrievable
    # sentence in a policy is the one most likely to be cut in half.
    assert any(
        chunks[i].content[-40:] in chunks[i + 1].content for i in range(len(chunks) - 1)
    )


def test_prefers_paragraph_breaks_over_cutting_mid_word():
    text = "First paragraph about MFA.\n\nSecond paragraph about backups."
    chunks = split_text(text, chunk_tokens=8, overlap_tokens=0)
    joined = " ".join(c.content for c in chunks)
    assert "MFA" in joined and "backups" in joined


def test_identical_content_hashes_identically():
    a = split_text("Encryption at rest is mandatory.")
    b = split_text("Encryption at rest is mandatory.")
    assert a[0].content_hash == b[0].content_hash
    assert len(a[0].content_hash) == 64


def test_token_estimate_is_never_zero():
    assert estimate_tokens("") >= 1
    assert estimate_tokens("x") >= 1


# ── vector marshalling ───────────────────────────────────────────────────────

def test_pgvector_literal_round_trips_dimension():
    literal = to_pgvector([0.5] * EMBEDDING_DIMENSIONS)
    assert literal.startswith("[") and literal.endswith("]")
    assert literal.count(",") == EMBEDDING_DIMENSIONS - 1


def test_wrong_width_is_refused_with_a_message_that_names_the_cause():
    # The alternative is a Postgres dimension error that does not say which
    # model produced the vector.
    with pytest.raises(ValueError, match="1536"):
        to_pgvector([0.1, 0.2, 0.3])


# ── the verdict schema ───────────────────────────────────────────────────────

def test_confidence_is_bounded():
    with pytest.raises(ValidationError):
        ComplianceVerdict(status="pass", confidence=1.4, reasoning="x")


def test_only_pass_or_fail_is_accepted_from_the_judge():
    with pytest.raises(ValidationError):
        ComplianceVerdict(status="maybe", confidence=0.5, reasoning="x")


# ── the decision path, against a real database ───────────────────────────────

class _StubEmbedder:
    """Deterministic embeddings — no network, no key, no cost."""

    def __init__(self):
        self.model = "stub-embedding"

    async def connect(self):
        return None

    async def aclose(self):
        return None

    async def embed_one(self, text: str):
        return [1.0] + [0.0] * (EMBEDDING_DIMENSIONS - 1)


@pytest.fixture
async def evaluator(monkeypatch):
    ev = ComplianceEvaluator(dsn=DSN, judge_model="stub-judge")
    ev._embedder = _StubEmbedder()
    await ev.connect()
    org = str(uuid.uuid4())
    async with ev._pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO public.organizations (id, name) VALUES ($1,$2) "
            "ON CONFLICT (id) DO NOTHING",
            org, "AI Brain test org",
        )
    yield ev, org
    await ev.aclose()


def _judge_returning(status: str, confidence: float):
    async def _judge(self, control_requirement, raw_evidence_json, policy_chunks):
        return ComplianceVerdict(status=status, confidence=confidence, reasoning="test")
    return _judge


@needs_db
@pytest.mark.asyncio
async def test_confident_fail_reaches_the_mesh(evaluator, monkeypatch):
    ev, org = evaluator
    monkeypatch.setattr(ComplianceEvaluator, "judge", _judge_returning("fail", 0.95))

    out = await ev.evaluate(org, json.dumps({"mfa": False}), "MFA is enforced.")

    assert out.status == "fail"
    assert out.action_taken == "event_emitted"
    assert out.governance_event_id and not out.hitl_item_id
    async with ev._pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT event_type, source_module, payload FROM public.governance_events WHERE id=$1",
            uuid.UUID(out.governance_event_id),
        )
    assert row["event_type"] == "RISK_DETECTED"
    payload = json.loads(row["payload"]) if isinstance(row["payload"], str) else row["payload"]
    # Downstream agents and humans must be able to see this came from an
    # inference and trace it back.
    assert payload["auto_generated"] is True
    assert payload["verdict_id"] == out.verdict_id


@needs_db
@pytest.mark.asyncio
async def test_unconfident_fail_reaches_a_person_instead(evaluator, monkeypatch):
    ev, org = evaluator
    monkeypatch.setattr(ComplianceEvaluator, "judge", _judge_returning("fail", 0.40))

    out = await ev.evaluate(org, json.dumps({"mfa": "unclear"}), "MFA is enforced.")

    # RISK_DETECTED wakes AutoPauseAgent, which pauses production models. A
    # 0.40-confidence inference must not be able to do that unattended.
    assert out.action_taken == "review_queued"
    assert out.hitl_item_id and not out.governance_event_id
    async with ev._pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT entity_type, status, org_id FROM public.hitl_items WHERE id=$1",
            uuid.UUID(out.hitl_item_id),
        )
    assert row["entity_type"] == "ai_compliance_verdict"
    assert row["status"] == "pending"
    assert str(row["org_id"]) == org


@needs_db
@pytest.mark.asyncio
async def test_a_pass_acts_on_nothing(evaluator, monkeypatch):
    ev, org = evaluator
    monkeypatch.setattr(ComplianceEvaluator, "judge", _judge_returning("pass", 0.99))
    out = await ev.evaluate(org, json.dumps({"mfa": True}), "MFA is enforced.")
    assert out.status == "pass"
    assert out.action_taken == "none"
    assert not out.governance_event_id and not out.hitl_item_id


@needs_db
@pytest.mark.asyncio
async def test_an_unreachable_judge_is_never_a_pass(evaluator, monkeypatch):
    ev, org = evaluator

    async def _boom(self, *a, **k):
        raise RuntimeError("provider timeout")

    monkeypatch.setattr(ComplianceEvaluator, "judge", _boom)
    out = await ev.evaluate(org, json.dumps({"mfa": True}), "MFA is enforced.")

    # The failure mode that matters: an API outage marking controls satisfied.
    assert out.status == "inconclusive"
    assert out.action_taken == "review_queued"
    assert "provider timeout" in (out.error or "")


@needs_db
@pytest.mark.asyncio
async def test_every_judgement_is_recorded_with_its_provenance(evaluator, monkeypatch):
    ev, org = evaluator
    monkeypatch.setattr(ComplianceEvaluator, "judge", _judge_returning("fail", 0.95))
    # A value that could only have come from the evidence blob, so its absence
    # below is meaningful. Real provider payloads carry customer data.
    secret = "arn:aws:iam::999999999999:user/jane.doe@customer.example"
    out = await ev.evaluate(org, json.dumps({"principal": secret}), "MFA is enforced.")

    async with ev._pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM public.ai_compliance_verdicts WHERE id=$1", uuid.UUID(out.verdict_id)
        )
    assert row["model"] == "stub-judge"
    assert row["prompt_version"]
    assert row["action_taken"] == "event_emitted"
    # Only the fingerprint of the evidence is kept, never the evidence itself.
    assert len(row["evidence_fingerprint"]) == 64
    stored = json.dumps(dict(row), default=str)
    assert secret not in stored
    assert "999999999999" not in stored
    # The control requirement IS stored — it is what was judged, not the data.
    assert row["control_requirement"] == "MFA is enforced."

    # …and the event handed to the mesh must not leak it either.
    async with ev._pool.acquire() as conn:
        ev_row = await conn.fetchrow(
            "SELECT payload FROM public.governance_events WHERE id=$1",
            uuid.UUID(out.governance_event_id),
        )
    assert secret not in json.dumps(ev_row["payload"], default=str)
