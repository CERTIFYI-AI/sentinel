"""Compliance propagation engine - handles all cross-module state updates."""
from __future__ import annotations
import asyncio
import logging
from typing import Optional
from sentinel.events.bus import bus, SentinelEvent

logger = logging.getLogger(__name__)

async def handle_policy_approved(event: SentinelEvent, db) -> None:
    """POLICY_APPROVED -> check linked controls/models/agents, create HITL gaps."""
    payload = event.payload
    tenant_id = event.tenant_id
    policy_id = payload.get('policy_id')
    try:
        # Get all models linked to this policy
        models = await db.fetch(
            "SELECT id, name, owner FROM model_inventory WHERE tenant_id=$1 AND $2=ANY(linked_policy_ids)",
            tenant_id, policy_id
        )
        for model in models:
            # Check alignment - if model has no controls, flag as gap
            control_count = await db.fetchval(
                "SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND $2=ANY(linked_policy_ids)",
                tenant_id, policy_id
            )
            if control_count == 0:
                await db.execute("""
                    INSERT INTO hitl_items(tenant_id, entity_type, entity_id, entity_name, trigger_reason,
                        risk_level, status, sla_hours)
                    VALUES($1,'model',$2,$3,'POLICY_APPROVED_NO_CONTROLS','high','pending',48)
                    ON CONFLICT DO NOTHING
                """, tenant_id, model['id'], model['name'])
        # Recalculate compliance score
        await recalculate_compliance_score(tenant_id, db)
        logger.info(f"Policy approved propagation: {policy_id}, {len(models)} models checked")
    except Exception as e:
        logger.error(f"Error in handle_policy_approved: {e}")

async def handle_model_registered(event: SentinelEvent, db) -> None:
    """MODEL_REGISTERED -> auto-trigger bias audit + control mapping + HITL gate."""
    payload = event.payload
    tenant_id = event.tenant_id
    model_id = payload.get('model_id')
    model_name = payload.get('name')
    risk_level = payload.get('risk_level', 'medium')
    try:
        # Create HITL approval task
        await db.execute("""
            INSERT INTO hitl_items(tenant_id, entity_type, entity_id, entity_name, trigger_reason,
                risk_level, status, sla_hours)
            VALUES($1,'model',$2,$3,'MODEL_REGISTERED_NEEDS_APPROVAL',$4,'pending',$5)
            ON CONFLICT DO NOTHING
        """, tenant_id, model_id, model_name, risk_level,
            48 if risk_level in ('high','critical') else 120 if risk_level=='medium' else 240)
        # Auto-create bias audit draft
        await db.execute("""
            INSERT INTO bias_audits(tenant_id, model_id, model_name, status, trigger_reason)
            VALUES($1,$2,$3,'draft','MODEL_REGISTERED')
            ON CONFLICT DO NOTHING
        """, tenant_id, model_id, model_name)
        await recalculate_compliance_score(tenant_id, db)
        logger.info(f"Model registered propagation: {model_id}")
    except Exception as e:
        logger.error(f"Error in handle_model_registered: {e}")

async def handle_bias_audit_complete(event: SentinelEvent, db) -> None:
    """BIAS_AUDIT_COMPLETE -> if exceeded threshold, flag model non-compliant."""
    payload = event.payload
    tenant_id = event.tenant_id
    model_id = payload.get('model_id')
    bias_score = payload.get('bias_score', 0)
    threshold = payload.get('threshold', 0.1)
    passed = payload.get('passed', True)
    try:
        if not passed:
            await db.execute("""
                UPDATE model_inventory SET compliance_status='non_compliant',
                    bias_score=$1, last_audit_date=NOW()
                WHERE id=$2 AND tenant_id=$3
            """, bias_score, model_id, tenant_id)
            await db.execute("""
                INSERT INTO hitl_items(tenant_id, entity_type, entity_id, trigger_reason, risk_level, status, sla_hours)
                SELECT $1,'model',$2,'BIAS_THRESHOLD_EXCEEDED','high','pending',48
                WHERE NOT EXISTS(SELECT 1 FROM hitl_items WHERE entity_id=$2 AND trigger_reason='BIAS_THRESHOLD_EXCEEDED' AND status='pending')
            """, tenant_id, model_id)
        else:
            await db.execute("""
                UPDATE model_inventory SET bias_score=$1, last_audit_date=NOW()
                WHERE id=$2 AND tenant_id=$3
            """, bias_score, model_id, tenant_id)
        await recalculate_compliance_score(tenant_id, db)
    except Exception as e:
        logger.error(f"Error in handle_bias_audit_complete: {e}")

async def handle_control_status_changed(event: SentinelEvent, db) -> None:
    """CONTROL_STATUS_CHANGED -> update linked policy compliance scores."""
    payload = event.payload
    tenant_id = event.tenant_id
    control_id = payload.get('control_id')
    new_status = payload.get('new_status')
    try:
        await recalculate_compliance_score(tenant_id, db)
        if new_status == 'failed':
            await db.execute("""
                INSERT INTO hitl_items(tenant_id, entity_type, entity_id, trigger_reason, risk_level, status, sla_hours)
                VALUES($1,'control',$2,'CONTROL_FAILED','high','pending',48)
                ON CONFLICT DO NOTHING
            """, tenant_id, control_id)
    except Exception as e:
        logger.error(f"Error in handle_control_status_changed: {e}")

async def handle_vendor_status_changed(event: SentinelEvent, db) -> None:
    """VENDOR_STATUS_CHANGED -> cascade risk to linked models/agents."""
    payload = event.payload
    tenant_id = event.tenant_id
    vendor_id = payload.get('vendor_id')
    new_status = payload.get('new_status')
    try:
        if new_status == 'suspended':
            await db.execute("""
                UPDATE model_inventory SET compliance_status='at_risk',
                    notes=COALESCE(notes,'')||' [VENDOR SUSPENDED]'
                WHERE tenant_id=$1 AND vendor_id=$2
            """, tenant_id, vendor_id)
        await recalculate_compliance_score(tenant_id, db)
    except Exception as e:
        logger.error(f"Error in handle_vendor_status_changed: {e}")

async def handle_hitl_decision(event: SentinelEvent, db) -> None:
    """HITL_DECISION -> update entity status, log decision."""
    payload = event.payload
    tenant_id = event.tenant_id
    entity_type = payload.get('entity_type')
    entity_id = payload.get('entity_id')
    decision = payload.get('decision')
    try:
        if entity_type == 'model' and decision == 'approved':
            await db.execute("""
                UPDATE model_inventory SET status='production', hitl_status='approved'
                WHERE id=$1 AND tenant_id=$2 AND status='staging'
            """, entity_id, tenant_id)
        elif entity_type == 'model' and decision == 'rejected':
            await db.execute("""
                UPDATE model_inventory SET hitl_status='rejected', status='draft'
                WHERE id=$1 AND tenant_id=$2
            """, entity_id, tenant_id)
        await recalculate_compliance_score(tenant_id, db)
    except Exception as e:
        logger.error(f"Error in handle_hitl_decision: {e}")

async def recalculate_compliance_score(tenant_id: str, db) -> float:
    """Recalculate global compliance score: (implemented/required) * policy_weight * freshness."""
    try:
        total = await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1", tenant_id) or 1
        implemented = await db.fetchval(
            "SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status='implemented'", tenant_id
        ) or 0
        score = round((implemented / total) * 100, 1)
        await db.execute("""
            INSERT INTO compliance_scores(tenant_id, score, calculated_at)
            VALUES($1,$2,NOW())
            ON CONFLICT(tenant_id) DO UPDATE SET score=$2, calculated_at=NOW()
        """, tenant_id, score)
        return score
    except Exception as e:
        logger.error(f"Score calc error: {e}")
        return 0.0
