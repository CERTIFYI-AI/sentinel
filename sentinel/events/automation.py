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


# ---------------------------------------------------------------------------
# Dict-based automation rules (accept plain dict events)
# ---------------------------------------------------------------------------

async def _rule_campaign_finding_to_compliance_gap(event: dict) -> object:
    """Create a compliance gap from a security campaign finding event."""
    payload = event.get("payload", {})
    tenant_id = event.get("tenant_id", "")
    from sentinel.compliance.registry import ComplianceRegistry
    registry = ComplianceRegistry()
    gap = await registry.create_gap(
        tenant_id=tenant_id,
        framework_id=payload.get("framework_id", ""),
        control_id=payload.get("control_id", ""),
        severity=payload.get("severity", "MEDIUM"),
        title=payload.get("title", ""),
        source_finding_id=payload.get("finding_id"),
    )
    from sentinel.events.bus import EventBus
    bus = EventBus()
    await bus.publish({
        "event_type": "compliance.gap.created",
        "tenant_id": tenant_id,
        "payload": {"gap_id": gap.id},
    })
    return gap


async def _rule_recalculate_posture(event: dict) -> None:
    """Recalculate posture score after a significant event."""
    tenant_id = event.get("tenant_id", "")
    from sentinel.api.ciso_router import compute_posture_score
    await compute_posture_score(tenant_id)


async def _rule_eval_failure_to_hitl(event: dict) -> object:
    """Create a HITL review item from an eval failure event."""
    payload = event.get("payload", {})
    tenant_id = event.get("tenant_id", "")
    from sentinel.hitl.store import HitlStore
    store = HitlStore()
    item = await store.create(
        tenant_id=tenant_id,
        source_id=payload.get("run_id", ""),
        source_module="evals",
        metric=payload.get("metric"),
        score=payload.get("score"),
        threshold=payload.get("threshold"),
        model_id=payload.get("model_id"),
    )
    return item


async def _rule_eval_failure_to_task(event: dict) -> object:  # type: ignore[override]
    """Create a remediation task from an eval failure event."""
    payload = event.get("payload", {})
    tenant_id = event.get("tenant_id", "")
    from sentinel.tasks.task_store import TaskStore
    store = TaskStore()
    task = await store.create(
        tenant_id=tenant_id,
        title=f"Eval quality issue: {payload.get('metric', 'unknown')}",
        description=(
            f"Metric {payload.get('metric')} scored "
            f"{float(payload.get('score', 0)):.2f} against "
            f"threshold {float(payload.get('threshold', 0)):.2f}."
        ),
        status="OPEN",
        priority="HIGH",
        source_module="evals",
        source_type="evalfailure",
        source_id=payload.get("run_id", ""),
        model_id=payload.get("model_id"),
        framework_ref=None,
    )
    return task


async def _rule_compliance_gap_to_task(event: dict) -> object:  # type: ignore[override]
    """Create a remediation task from a compliance gap created event."""
    payload = event.get("payload", {})
    tenant_id = event.get("tenant_id", "")
    from sentinel.tasks.task_store import TaskStore
    store = TaskStore()
    task = await store.create(
        tenant_id=tenant_id,
        title=f"Close compliance gap: {payload.get('control_id', '')} ({payload.get('framework_id', '')})",
        description=f"Compliance gap: {payload.get('title', '')}",
        status="OPEN",
        priority=payload.get("severity", "MEDIUM"),
        source_module="compliance",
        source_type="compliancegap",
        source_id=payload.get("gap_id", ""),
        model_id=None,
        framework_ref=f"{payload.get('framework_id', '')}/{payload.get('control_id', '')}",
    )
    return task

async def run_automation_rules(event: object) -> None:  # type: ignore[override]
    """Evaluate all automation rules for the given event (dict or SentinelEvent)."""
    if isinstance(event, dict):
        rules = [
            _rule_campaign_finding_to_compliance_gap,
            _rule_campaign_finding_to_task,
            _rule_eval_failure_to_hitl,
            _rule_eval_failure_to_task,
            _rule_compliance_gap_to_task,
            _rule_recalculate_posture,
        ]
        for rule in rules:
            try:
                await rule(event)  # type: ignore[arg-type]
            except Exception:
                logger.exception("Automation rule %s failed", rule.__name__)
    else:
        # Legacy SentinelEvent path
        _legacy_rules = [
            _rule_campaign_finding_to_task,
            _rule_eval_failure_to_task,
            _rule_compliance_gap_to_task,
            _rule_recalculate_posture_score,
        ]
        for rule in _legacy_rules:
            try:
                await rule(event)  # type: ignore[arg-type]
            except Exception:
                logger.exception("Automation rule %s failed for event", rule.__name__)

async def _rule_campaign_finding_to_task(event: object) -> object:  # type: ignore[override]
    """Create a remediation task from a campaign finding (dict or SentinelEvent)."""
    if isinstance(event, dict):
        payload = event.get("payload", {})
        tenant_id = event.get("tenant_id", "")
        from sentinel.tasks.task_store import TaskStore
        store = TaskStore()
        task = await store.create(
            tenant_id=tenant_id,
            title=f"Remediate: {payload.get('title', 'Security Finding')}",
            description=(
                f"Security vulnerability detected in campaign {payload.get('campaign_id')}."
            ),
            status="OPEN",
            priority=payload.get("severity", "HIGH"),
            source_module="security",
            source_type="vulnerability",
            source_id=payload.get("finding_id", ""),
            model_id=None,
            framework_ref=payload.get("framework_id"),
        )
        return task
    else:
        # Legacy SentinelEvent path
        _event = event
        from sentinel.events.bus import EventType
        if _event.type not in (  # type: ignore[union-attr]
            EventType.CAMPAIGN_FINDING_CRITICAL,
            EventType.CAMPAIGN_FINDING_HIGH,
        ):
            return None
        from sentinel.tasks.task_store import TaskStore
        store = TaskStore()
        return await store.create(
            tenant_id=_event.tenant_id,  # type: ignore[union-attr]
            title=f"Remediate {_event.payload.get('title', 'Security Finding')}",  # type: ignore[union-attr]
            description="",
            status="OPEN",
            priority=_event.payload.get("severity", "HIGH"),  # type: ignore[union-attr]
            source_module="security",
            source_type="vulnerability",
            source_id=_event.payload.get("findingId", ""),  # type: ignore[union-attr]
            model_id=None,
            framework_ref=None,
        )
