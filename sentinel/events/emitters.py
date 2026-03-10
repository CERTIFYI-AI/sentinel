"""Sentinel Event Emitters.

Call these from any async context in any module.
They emit to the bus AND trigger automation rules.
"""
from __future__ import annotations

from sentinel.events.bus import EventType, SentinelEvent, bus


async def emit_campaign_finding(
    *,
    tenant_id: str,
    campaign_id: str,
    finding_id: str,
    severity: str,
    title: str,
    framework_ref: str,
    model_id: str,
) -> None:
    event_type = (
        EventType.CAMPAIGN_FINDING_CRITICAL
        if severity == "CRITICAL"
        else EventType.CAMPAIGN_FINDING_HIGH
    )
    event = SentinelEvent(
        type=event_type,
        source_module="security",
        tenant_id=tenant_id,
        payload={
            "campaignId": campaign_id,
            "findingId": finding_id,
            "severity": severity,
            "title": title,
            "frameworkRef": framework_ref,
            "modelId": model_id,
        },
    )
    await bus.publish(event)
    from sentinel.events.automation import run_automation_rules
    await run_automation_rules(event)


async def emit_eval_failure(
    *,
    tenant_id: str,
    run_id: str,
    metric_id: str,
    metric_name: str,
    score: float,
    threshold: float,
    model_id: str,
) -> None:
    event = SentinelEvent(
        type=EventType.EVAL_METRIC_THRESHOLD_BREACH,
        source_module="evals",
        tenant_id=tenant_id,
        payload={
            "runId": run_id,
            "metricId": metric_id,
            "metricName": metric_name,
            "score": score,
            "threshold": threshold,
            "modelId": model_id,
        },
    )
    await bus.publish(event)
    from sentinel.events.automation import run_automation_rules
    await run_automation_rules(event)


async def emit_compliance_gap(
    *,
    tenant_id: str,
    gap_id: str,
    framework_id: str,
    control_id: str,
    severity: str,
    source_event_id: str | None = None,
) -> None:
    event = SentinelEvent(
        type=EventType.COMPLIANCE_GAP_CREATED,
        source_module="proxy",
        tenant_id=tenant_id,
        payload={
            "gapId": gap_id,
            "frameworkId": framework_id,
            "controlId": control_id,
            "severity": severity,
            "sourceEventId": source_event_id,
        },
    )
    await bus.publish(event)
    from sentinel.events.automation import run_automation_rules
    await run_automation_rules(event)


async def emit_hitl_created(
    *,
    tenant_id: str,
    hitl_id: str,
    trust_score: float,
    priority: str,
    model_id: str,
) -> None:
    event = SentinelEvent(
        type=EventType.HITL_ITEM_CREATED,
        source_module="proxy",
        tenant_id=tenant_id,
        payload={
            "hitlId": hitl_id,
            "trustScore": trust_score,
            "priority": priority,
            "modelId": model_id,
        },
    )
    await bus.publish(event)


async def emit_posture_update(
    *,
    tenant_id: str,
    score: float,
    components: dict,
) -> None:
    event = SentinelEvent(
        type=EventType.POSTURE_SCORE_UPDATED,
        source_module="security",
        tenant_id=tenant_id,
        payload={"score": score, "components": components},
    )
    await bus.publish(event)
