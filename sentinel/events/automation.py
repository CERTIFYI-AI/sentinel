"""Sentinel Automation Rules.

When an event fires, these rules determine what happens next:
- Create a compliance gap from a security finding
- Create a task from a compliance gap
- Create a HITL item from an eval failure
- Update the posture score from any significant change

Rules are deterministic and auditable.
"""
from __future__ import annotations

import logging
import uuid

from sentinel.events.bus import EventType, SentinelEvent

logger = logging.getLogger(__name__)

# Mapping: finding category -> compliance frameworks/controls
FINDING_TO_COMPLIANCE: dict[str, list[dict]] = {
    "promptinjection": [
        {"framework": "euaiact", "control": "C04"},
        {"framework": "owaspllm", "control": "LLM-01"},
    ],
    "jailbreak": [
        {"framework": "euaiact", "control": "C04"},
        {"framework": "nistairmf", "control": "GOVERN-1.1"},
    ],
    "dataexfiltration": [
        {"framework": "gdpr", "control": "Art-32"},
        {"framework": "iso42001", "control": "C07"},
    ],
    "piileakage": [
        {"framework": "gdpr", "control": "Art-5"},
        {"framework": "euaiact", "control": "C08"},
    ],
    "modelinversion": [
        {"framework": "iso42001", "control": "C09"},
    ],
    "excessiveagency": [
        {"framework": "euaiact", "control": "C11"},
        {"framework": "owaspagentic", "control": "Agent-01"},
    ],
    "hallucinationcritical": [
        {"framework": "euaiact", "control": "C03"},
        {"framework": "nistairmf", "control": "MANAGE-2.2"},
    ],
}


async def run_automation_rules(event: SentinelEvent) -> None:
    """Evaluate all automation rules for the given event."""
    rules = [
        _rule_campaign_finding_to_task,
        _rule_eval_failure_to_task,
        _rule_compliance_gap_to_task,
        _rule_recalculate_posture_score,
    ]
    for rule in rules:
        try:
            await rule(event)
        except Exception:
            logger.exception("Automation rule %s failed for event %s", rule.__name__, event.id)


async def _rule_campaign_finding_to_task(event: SentinelEvent) -> None:
    """CRITICAL findings always create a task."""
    if event.type not in (
        EventType.CAMPAIGN_FINDING_CRITICAL,
        EventType.CAMPAIGN_FINDING_HIGH,
    ):
        return
    from sentinel.tasks.task_store import TaskStore

    store = TaskStore()
    await store.create(
        tenant_id=event.tenant_id,
        title=f"Remediate {event.payload.get('title', 'Security Finding')}",
        description=(
            f"Security vulnerability detected in campaign {event.payload.get('campaignId')}. "
            f"Framework reference: {event.payload.get('frameworkRef', 'N/A')}."
        ),
        status="OPEN",
        priority=event.payload.get("severity", "HIGH"),
        source_module="security",
        source_type="vulnerability",
        source_id=event.payload.get("findingId", ""),
        model_id=event.payload.get("modelId"),
        framework_ref=event.payload.get("frameworkRef"),
    )


async def _rule_eval_failure_to_task(event: SentinelEvent) -> None:
    """Every eval metric failure creates a task."""
    if event.type != EventType.EVAL_METRIC_THRESHOLD_BREACH:
        return
    from sentinel.tasks.task_store import TaskStore

    store = TaskStore()
    await store.create(
        tenant_id=event.tenant_id,
        title=f"Eval quality issue: {event.payload.get('metricName')}",
        description=(
            f"Metric {event.payload.get('metricName')} scored "
            f"{float(event.payload.get('score', 0)):.2f} against "
            f"threshold {float(event.payload.get('threshold', 0)):.2f} "
            f"in eval run {event.payload.get('runId')}."
        ),
        status="OPEN",
        priority="HIGH",
        source_module="evals",
        source_type="evalfailure",
        source_id=event.payload.get("runId", ""),
        model_id=event.payload.get("modelId"),
        framework_ref=None,
    )


async def _rule_compliance_gap_to_task(event: SentinelEvent) -> None:
    """Only create a task for manually created gaps (no source event)."""
    if event.type != EventType.COMPLIANCE_GAP_CREATED:
        return
    if event.payload.get("sourceEventId"):
        return  # Originated from a security finding - task already created
    from sentinel.tasks.task_store import TaskStore

    store = TaskStore()
    await store.create(
        tenant_id=event.tenant_id,
        title=f"Close compliance gap: {event.payload.get('controlId')} ({event.payload.get('frameworkId')})",
        description=f"Compliance gap identified for control {event.payload.get('controlId')}.",
        status="OPEN",
        priority=event.payload.get("severity", "MEDIUM"),
        source_module="proxy",
        source_type="compliancegap",
        source_id=event.payload.get("gapId", ""),
        model_id=None,
        framework_ref=f"{event.payload.get('frameworkId')}/{event.payload.get('controlId')}",
    )


async def _rule_recalculate_posture_score(event: SentinelEvent) -> None:
    """After any significant event, recalculate and broadcast CISO posture."""
    recalculate_triggers = {
        EventType.CAMPAIGN_FINDING_CRITICAL,
        EventType.CAMPAIGN_FINDING_HIGH,
        EventType.EVAL_METRIC_THRESHOLD_BREACH,
        EventType.COMPLIANCE_GAP_CREATED,
        EventType.COMPLIANCE_GAP_RESOLVED,
        EventType.HITL_ITEM_RESOLVED,
    }
    if event.type not in recalculate_triggers:
        return
    from sentinel.api.ciso_router import compute_posture_score
    from sentinel.events.emitters import emit_posture_update

    score, components = await compute_posture_score(event.tenant_id)
    await emit_posture_update(
        tenant_id=event.tenant_id,
        score=score,
        components=components,
    )


def _extract_finding_category(framework_ref: str) -> str:
    """Map a framework reference string to an internal finding category key."""
    ref_lower = framework_ref.lower()
    if "prompt injection" in ref_lower or "llm-01" in ref_lower:
        return "promptinjection"
    if "jailbreak" in ref_lower or "llm-02" in ref_lower:
        return "jailbreak"
    if "data exfil" in ref_lower or "llm-06" in ref_lower:
        return "dataexfiltration"
    if "pii" in ref_lower or "llm-07" in ref_lower:
        return "piileakage"
    if "inversion" in ref_lower:
        return "modelinversion"
    if "agency" in ref_lower or "agent-01" in ref_lower:
        return "excessiveagency"
    if "hallucin" in ref_lower:
        return "hallucinationcritical"
    return ""
