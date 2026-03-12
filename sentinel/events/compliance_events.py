"""Compliance-specific event emitters for all GRC modules."""
from __future__ import annotations
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional
from sentinel.events.bus import bus, SentinelEvent, EventType

async def emit_compliance_event(
    event_type: str,
    tenant_id: str,
    source_module: str,
    payload: dict
) -> None:
    """Generic compliance event emitter."""
    evt = SentinelEvent(
        type=event_type,  # type: ignore
        source_module=source_module,
        tenant_id=tenant_id,
        payload=payload
    )
    await bus.publish(evt)

async def emit_policy_approved(tenant_id: str, policy_id: str, policy_title: str, approver: str) -> None:
    await emit_compliance_event('policy.approved', tenant_id, 'policy', {
        'policy_id': policy_id, 'title': policy_title, 'approver': approver,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_model_registered(tenant_id: str, model_id: str, model_name: str, risk_level: str, owner: str) -> None:
    await emit_compliance_event('model.registered', tenant_id, 'model_inventory', {
        'model_id': model_id, 'name': model_name, 'risk_level': risk_level, 'owner': owner,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_dataset_registered(tenant_id: str, dataset_id: str, name: str, has_pii: bool, has_demographic: bool) -> None:
    await emit_compliance_event('dataset.registered', tenant_id, 'dataset_registry', {
        'dataset_id': dataset_id, 'name': name, 'has_pii': has_pii, 'has_demographic': has_demographic,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_bias_audit_complete(tenant_id: str, audit_id: str, model_id: str, bias_score: float, threshold: float, passed: bool) -> None:
    await emit_compliance_event('bias.audit.complete', tenant_id, 'bias_audit', {
        'audit_id': audit_id, 'model_id': model_id, 'bias_score': bias_score,
        'threshold': threshold, 'passed': passed,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_control_status_changed(tenant_id: str, control_id: str, old_status: str, new_status: str, owner: str) -> None:
    await emit_compliance_event('control.status.changed', tenant_id, 'controls', {
        'control_id': control_id, 'old_status': old_status, 'new_status': new_status, 'owner': owner,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_hitl_decision(tenant_id: str, item_id: str, entity_type: str, entity_id: str, decision: str, actor: str, remarks: str) -> None:
    await emit_compliance_event('hitl.decision', tenant_id, 'hitl', {
        'item_id': item_id, 'entity_type': entity_type, 'entity_id': entity_id,
        'decision': decision, 'actor': actor, 'remarks': remarks,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_vendor_status_changed(tenant_id: str, vendor_id: str, name: str, old_status: str, new_status: str) -> None:
    await emit_compliance_event('vendor.status.changed', tenant_id, 'vendor_registry', {
        'vendor_id': vendor_id, 'name': name, 'old_status': old_status, 'new_status': new_status,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_evidence_synced(tenant_id: str, evidence_id: str, title: str, control_ids: list, model_ids: list) -> None:
    await emit_compliance_event('evidence.synced', tenant_id, 'evidence_sync', {
        'evidence_id': evidence_id, 'title': title, 'control_ids': control_ids, 'model_ids': model_ids,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

async def emit_agent_discovered(tenant_id: str, agent_id: str, source: str, agent_type: str, risk_level: str) -> None:
    await emit_compliance_event('agent.discovered', tenant_id, 'agent_discovery', {
        'agent_id': agent_id, 'source': source, 'type': agent_type, 'risk_level': risk_level,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
