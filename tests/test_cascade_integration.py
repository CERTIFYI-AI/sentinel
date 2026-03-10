"""Integration test: full cascade — campaign finding → compliance gap → task → posture update.

This test verifies that the automation pipeline in sentinel/events/automation.py
properly chains: security finding → compliance gap creation → task creation → posture recalculation.

Run with: pytest tests/test_cascade_integration.py -v
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

TENANT_ID = "tenant-test-001"
FINDING_ID = str(uuid.uuid4())
CAMPAIGN_ID = str(uuid.uuid4())


@pytest.fixture
def sample_finding():
    """Minimal vulnerability finding payload emitted by campaign_runner."""
    return SimpleNamespace(
        id=FINDING_ID,
        tenant_id=TENANT_ID,
        campaign_id=CAMPAIGN_ID,
        severity="HIGH",
        category="PROMPT_INJECTION",
        title="Prompt injection bypasses system prompt",
        description="Adversarial payload overrides instruction context.",
        framework_id="OWASP_LLM_TOP10",
        control_id="LLM01",
        remediation="Sanitise user inputs with allowlist before forwarding to LLM.",
        cvss_score=7.5,
        status="OPEN",
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def event_factory(sample_finding):
    """Build a SentinelEvent-like dict for a campaign finding."""
    return {
        "event_type": "security.campaign.finding",
        "tenant_id": TENANT_ID,
        "payload": {
            "finding_id": sample_finding.id,
            "severity": sample_finding.severity,
            "category": sample_finding.category,
            "framework_id": sample_finding.framework_id,
            "control_id": sample_finding.control_id,
            "title": sample_finding.title,
            "remediation": sample_finding.remediation,
            "campaign_id": sample_finding.campaign_id,
        },
        "emitted_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFindingToComplianceGapCascade:
    """security.campaign.finding → compliance gap is created."""

    @pytest.mark.asyncio
    async def test_finding_creates_compliance_gap(self, event_factory):
        gap_id = str(uuid.uuid4())

        mock_gap = SimpleNamespace(
            id=gap_id,
            tenant_id=TENANT_ID,
            framework_id="OWASP_LLM_TOP10",
            control_id="LLM01",
            severity="HIGH",
            source_finding_id=FINDING_ID,
            status="OPEN",
        )

        with patch(
            "sentinel.compliance.registry.ComplianceRegistry.create_gap",
            new_callable=AsyncMock,
            return_value=mock_gap,
        ) as mock_create_gap:
            from sentinel.events.automation import _rule_campaign_finding_to_compliance_gap  # noqa: PLC0415

            result = await _rule_campaign_finding_to_compliance_gap(event_factory)

            mock_create_gap.assert_awaited_once()
            call_kwargs = mock_create_gap.call_args.kwargs
            assert call_kwargs["tenant_id"] == TENANT_ID
            assert call_kwargs["framework_id"] == "OWASP_LLM_TOP10"
            assert call_kwargs["control_id"] == "LLM01"
            assert call_kwargs["severity"] == "HIGH"
            assert result is not None


class TestFindingToTaskCascade:
    """security.campaign.finding → remediation task is created."""

    @pytest.mark.asyncio
    async def test_finding_creates_remediation_task(self, event_factory):
        task_id = str(uuid.uuid4())

        mock_task = SimpleNamespace(
            id=task_id,
            tenant_id=TENANT_ID,
            title="Remediate: Prompt injection bypasses system prompt",
            priority="HIGH",
            source_module="security",
            source_id=FINDING_ID,
            status="OPEN",
        )

        with patch(
            "sentinel.tasks.task_store.TaskStore.create",
            new_callable=AsyncMock,
            return_value=mock_task,
        ) as mock_create_task:
            from sentinel.events.automation import _rule_campaign_finding_to_task  # noqa: PLC0415

            result = await _rule_campaign_finding_to_task(event_factory)

            mock_create_task.assert_awaited_once()
            call_kwargs = mock_create_task.call_args.kwargs
            assert call_kwargs["tenant_id"] == TENANT_ID
            assert call_kwargs["source_module"] == "security"
            assert call_kwargs["source_id"] == FINDING_ID
            assert call_kwargs["priority"] == "HIGH"
            assert result.id == task_id


class TestPostureRecalculationCascade:
    """security.campaign.finding → posture score is recalculated."""

    @pytest.mark.asyncio
    async def test_finding_triggers_posture_recalculation(self, event_factory):
        mock_posture = SimpleNamespace(
            tenant_id=TENANT_ID,
            overall_score=72.4,
            security_score=68.0,
            compliance_score=75.0,
            quality_score=80.0,
            hitl_score=90.0,
            risk_trend="degrading",
            trend_delta=-3.2,
        )

        with patch(
            "sentinel.api.ciso_router.compute_posture_score",
            new_callable=AsyncMock,
            return_value=mock_posture,
        ) as mock_posture_fn:
            from sentinel.events.automation import _rule_recalculate_posture  # noqa: PLC0415

            await _rule_recalculate_posture(event_factory)
            mock_posture_fn.assert_awaited_once_with(TENANT_ID)


class TestFullCascadeEndToEnd:
    """Full cascade: finding → gap → task → posture update fires in sequence."""

    @pytest.mark.asyncio
    async def test_full_cascade_all_steps_fire(self, event_factory, sample_finding):
        gap_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())

        mock_gap = SimpleNamespace(id=gap_id, status="OPEN")
        mock_task = SimpleNamespace(id=task_id, status="OPEN")
        mock_posture = SimpleNamespace(overall_score=70.0, risk_trend="stable", trend_delta=0)

        with (
            patch(
                "sentinel.compliance.registry.ComplianceRegistry.create_gap",
                new_callable=AsyncMock,
                return_value=mock_gap,
            ),
            patch(
                "sentinel.tasks.task_store.TaskStore.create",
                new_callable=AsyncMock,
                return_value=mock_task,
            ),
            patch(
                "sentinel.api.ciso_router.compute_posture_score",
                new_callable=AsyncMock,
                return_value=mock_posture,
            ),
            patch(
                "sentinel.events.bus.EventBus.publish",
                new_callable=AsyncMock,
            ) as mock_publish,
        ):
            from sentinel.events.automation import run_automation_rules  # noqa: PLC0415

            await run_automation_rules(event_factory)

            # Downstream events should have been emitted for gap and task creation
            assert mock_publish.await_count >= 1


class TestEvalFailureToCascade:
    """evals.run.failed → HITL item created + task created."""

    @pytest.mark.asyncio
    async def test_eval_failure_creates_hitl_and_task(self):
        run_id = str(uuid.uuid4())
        eval_event = {
            "event_type": "evals.run.failed",
            "tenant_id": TENANT_ID,
            "payload": {
                "run_id": run_id,
                "metric": "safety",
                "score": 0.42,
                "threshold": 0.80,
                "model_id": "gpt-4o",
            },
            "emitted_at": datetime.now(timezone.utc).isoformat(),
        }

        hitl_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())

        mock_hitl = SimpleNamespace(id=hitl_id, status="PENDING")
        mock_task = SimpleNamespace(id=task_id, status="OPEN")

        with (
            patch(
                "sentinel.hitl.store.HitlStore.create",
                new_callable=AsyncMock,
                return_value=mock_hitl,
            ) as mock_hitl_create,
            patch(
                "sentinel.tasks.task_store.TaskStore.create",
                new_callable=AsyncMock,
                return_value=mock_task,
            ) as mock_task_create,
        ):
            from sentinel.events.automation import _rule_eval_failure_to_hitl  # noqa: PLC0415
            from sentinel.events.automation import _rule_eval_failure_to_task  # noqa: PLC0415

            await _rule_eval_failure_to_hitl(eval_event)
            await _rule_eval_failure_to_task(eval_event)

            mock_hitl_create.assert_awaited_once()
            mock_task_create.assert_awaited_once()

            hitl_kwargs = mock_hitl_create.call_args.kwargs
            assert hitl_kwargs["tenant_id"] == TENANT_ID
            assert hitl_kwargs["source_id"] == run_id

            task_kwargs = mock_task_create.call_args.kwargs
            assert task_kwargs["tenant_id"] == TENANT_ID
            assert task_kwargs["source_module"] == "evals"


class TestGapToTaskCascade:
    """compliance.gap.created → remediation task is created."""

    @pytest.mark.asyncio
    async def test_gap_creates_task(self):
        gap_id = str(uuid.uuid4())
        gap_event = {
            "event_type": "compliance.gap.created",
            "tenant_id": TENANT_ID,
            "payload": {
                "gap_id": gap_id,
                "framework_id": "EU_AI_ACT",
                "control_id": "Art9",
                "severity": "CRITICAL",
                "title": "Risk management system not documented",
            },
            "emitted_at": datetime.now(timezone.utc).isoformat(),
        }

        task_id = str(uuid.uuid4())
        mock_task = SimpleNamespace(id=task_id, status="OPEN", priority="CRITICAL")

        with patch(
            "sentinel.tasks.task_store.TaskStore.create",
            new_callable=AsyncMock,
            return_value=mock_task,
        ) as mock_create:
            from sentinel.events.automation import _rule_compliance_gap_to_task  # noqa: PLC0415

            result = await _rule_compliance_gap_to_task(gap_event)

            mock_create.assert_awaited_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["source_module"] == "compliance"
            assert call_kwargs["source_id"] == gap_id
            assert call_kwargs["priority"] == "CRITICAL"
            assert result.id == task_id
