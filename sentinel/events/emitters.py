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


# ---------------------------------------------------------------------------
# DB-backed notification emitters (persist to notifications table)
# ---------------------------------------------------------------------------
import logging
import uuid as _uuid
from datetime import datetime, timezone

_logger = logging.getLogger(__name__)


async def _insert_notification(
    tenant_id: str, user_id: str | None, ntype: str, title: str, body: str, db
) -> None:
    try:
        await db.execute(
            """INSERT INTO notifications (id, tenant_id, user_id, type, title, body, read, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)""",
            str(_uuid.uuid4()), tenant_id, user_id, ntype, title, body,
            datetime.now(timezone.utc),
        )
    except Exception as exc:
        _logger.warning("Failed to insert notification: %s", exc)


async def emit_approval_requested(
    tenant_id: str, approval_id: str, model_name: str,
    to_stage: str, first_reviewer_id: str, db
) -> None:
    await _insert_notification(
        tenant_id, first_reviewer_id, "APPROVAL_REQUESTED",
        f"Approval requested for {model_name}",
        f"Model {model_name} requires approval to advance to {to_stage}.", db,
    )


async def emit_approval_stage_advanced(
    tenant_id: str, approval_id: str, stage_index: int,
    reviewer_id: str, model_name: str, db
) -> None:
    await _insert_notification(
        tenant_id, None, "APPROVAL_STAGE_ADVANCED",
        f"Approval stage {stage_index} completed for {model_name}",
        f"Stage {stage_index} approved for {model_name}.", db,
    )


async def emit_approval_completed(
    tenant_id: str, approval_id: str, model_name: str, to_stage: str, db
) -> None:
    await _insert_notification(
        tenant_id, None, "APPROVAL_APPROVED",
        f"{model_name} approved for {to_stage}",
        f"All stages approved. {model_name} is now in {to_stage}.", db,
    )


async def emit_approval_rejected(
    tenant_id: str, approval_id: str, model_name: str,
    rejected_by_role: str, reason: str, requester_id: str, db
) -> None:
    await _insert_notification(
        tenant_id, requester_id, "APPROVAL_REJECTED",
        f"{model_name} approval rejected by {rejected_by_role}",
        f"Reason: {reason}", db,
    )


async def emit_nc_raised(
    tenant_id: str, nc_id: str, control_id: str, severity: str, db
) -> None:
    await _insert_notification(
        tenant_id, None, "NC_RAISED",
        f"Non-conformance raised: {control_id}",
        f"Severity: {severity}. NC ID: {nc_id}", db,
    )


async def emit_trust_score_alert(
    tenant_id: str, model_id: str, trust_score: float, db
) -> None:
    await _insert_notification(
        tenant_id, None, "TRUST_SCORE_ALERT",
        f"Trust score alert for model {model_id}",
        f"Trust score dropped to {trust_score:.2f}.", db,
    )


async def emit_attestation_overdue(
    tenant_id: str, control_id: str, days_overdue: int, db
) -> None:
    await _insert_notification(
        tenant_id, None, "ATTESTATION_OVERDUE",
        f"Attestation overdue: {control_id}",
        f"Attestation is {days_overdue} days overdue.", db,
    )


# Post-signup helpers
async def create_default_tenant_settings(tenant_id: str, db) -> None:
    try:
        await db.execute(
            """INSERT INTO tenant_settings (tenant_id, block_threshold, warn_threshold)
               VALUES ($1, 0.85, 0.70) ON CONFLICT (tenant_id) DO NOTHING""",
            tenant_id,
        )
    except Exception as exc:
        _logger.warning("create_default_tenant_settings failed: %s", exc)


async def seed_default_frameworks(tenant_id: str, db) -> None:
    try:
        for fw in ["GDPR", "EU_AI_ACT"]:
            await db.execute(
                """INSERT INTO tenant_frameworks (tenant_id, framework_id, enabled)
                   VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING""",
                tenant_id, fw,
            )
    except Exception as exc:
        _logger.warning("seed_default_frameworks failed: %s", exc)


async def create_welcome_notification(user_id: str, tenant_id: str, db) -> None:
    await _insert_notification(
        tenant_id, user_id, "WELCOME",
        "Welcome to Certifyi Sentinel",
        "Your AI governance platform is ready. Start by registering your first model.",
        db,
    )
