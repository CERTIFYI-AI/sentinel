"""Cross-module event listeners.

When Module A emits an event, these handlers propagate state to Modules B, C, etc.
This is the INTERCONNECTION layer that makes Sentinel a continuous compliance platform.
"""
import logging
from datetime import datetime, timezone
from sentinel.events.bus import bus, EventType, SentinelEvent
from sentinel.api.db import get_db, Notification, ComplianceEvent, AuditLog, new_id, now
from sqlalchemy import select

logger = logging.getLogger(__name__)

async def _log_audit(db, action, entity_type, entity_id, details=""):
    entry = AuditLog(id=new_id(), action=action, entity_type=entity_type,
                     entity_id=entity_id, details=details, created_at=now())
    db.add(entry)
    await db.flush()

async def _create_notification(db, title, message, level="info", source="system", entity_id=None):
    notif = Notification(id=new_id(), title=title, message=message, level=level,
                         source_module=source, entity_id=entity_id, created_at=now())
    db.add(notif)
    await db.flush()

async def _create_compliance_event(db, event_type, source, entity_id=None, severity="info", desc=""):
    evt = ComplianceEvent(id=new_id(), event_type=event_type, source_module=source,
                          entity_id=entity_id, severity=severity, description=desc, created_at=now())
    db.add(evt)
    await db.flush()


async def handle_event(event: SentinelEvent):
    """Central event dispatcher - routes events to cross-module handlers."""
    etype = event.type if isinstance(event.type, str) else event.type.value
    payload = event.payload or {}
    entity_id = payload.get("id", "")
    
    async for db in get_db():
        try:
            # === Policy Events ===
            if etype == "policy.created":
                await _log_audit(db, "policy.created", "Policy", entity_id, "New policy created")
                await _create_notification(db, "New Policy Created", 
                    f"Policy {entity_id} requires review", "info", "policy", entity_id)
                await _create_compliance_event(db, "policy.created", "policy", entity_id, "info",
                    "New policy requires compliance review")
                
            elif etype == "policy.approved":
                await _log_audit(db, "policy.approved", "Policy", entity_id, "Policy approved")
                await _create_notification(db, "Policy Approved",
                    f"Policy {entity_id} has been approved", "success", "policy", entity_id)
                    
            # === Model Events ===
            elif etype == "model.registered":
                await _log_audit(db, "model.registered", "Model", entity_id, "New model registered")
                await _create_notification(db, "New Model Registered",
                    f"Model {entity_id} needs trust configuration", "warning", "model", entity_id)
                await _create_compliance_event(db, "model.registered", "model", entity_id, "medium",
                    "New model requires trust config and bias audit")
            
            # === Vendor Events ===
            elif etype == "vendor.created":
                await _log_audit(db, "vendor.created", "Vendor", entity_id, "New vendor added")
                await _create_notification(db, "New Vendor Added",
                    f"Vendor {entity_id} needs questionnaire", "info", "vendor", entity_id)
                    
            # === Trust Engine Events ===
            elif etype == "trust.score.computed":
                await _log_audit(db, "trust.computed", "TrustTrace", entity_id, "Trust score computed")
                await _create_compliance_event(db, "trust.score.computed", "trust_engine", entity_id,
                    "info", "Trust score evaluation completed")
            
            # === Shadow AI Events ===
            elif etype == "shadow_ai.detected":
                await _log_audit(db, "shadow_ai.detected", "ShadowAI", entity_id, "Shadow AI detected")
                await _create_notification(db, "Shadow AI Detected",
                    f"Unauthorized AI usage detected: {entity_id}", "critical", "shadow_ai", entity_id)
                await _create_compliance_event(db, "shadow_ai.detected", "shadow_ai", entity_id,
                    "critical", "Unauthorized AI tool detected - immediate review required")
            
            # === Bias Audit Events ===
            elif etype == "bias_audit.created":
                await _log_audit(db, "bias_audit.created", "BiasAudit", entity_id, "Bias audit initiated")
                await _create_compliance_event(db, "bias_audit.created", "bias_audit", entity_id,
                    "info", "Bias audit initiated for model")
            
            # === RBAC Events ===
            elif etype == "rbac.role.created":
                await _log_audit(db, "rbac.role.created", "RBACRole", entity_id, "New role created")
            
            # === Observability Events ===
            elif etype == "observability.alert":
                await _create_notification(db, "Observability Alert",
                    f"Metric anomaly detected: {entity_id}", "warning", "observability", entity_id)
                await _create_compliance_event(db, "observability.alert", "observability", entity_id,
                    "high", "Performance or reliability threshold breached")
            
            # === Control Events ===
            elif etype == "control.created":
                await _log_audit(db, "control.created", "Control", entity_id, "New control created")
            
            elif etype == "control.tested":
                await _create_compliance_event(db, "control.tested", "controls", entity_id,
                    "info", "Control test completed")
            
            # === Reg Radar Events ===
            elif etype == "reg_radar.created":
                await _log_audit(db, "reg_radar.created", "Regulation", entity_id, "New regulation tracked")
                await _create_notification(db, "New Regulation Tracked",
                    f"Regulation {entity_id} added to radar", "info", "reg_radar", entity_id)
            
            # === Questionnaire Events ===
            elif etype == "questionnaire.submitted":
                await _log_audit(db, "questionnaire.submitted", "Questionnaire", entity_id, "Questionnaire submitted")
                await _create_notification(db, "Questionnaire Submitted",
                    f"Vendor questionnaire {entity_id} submitted for review", "info", "questionnaire", entity_id)
            
            # === Agent Events ===
            elif etype == "agent.registered":
                await _log_audit(db, "agent.registered", "Agent", entity_id, "New AI agent registered")
                await _create_compliance_event(db, "agent.registered", "agent", entity_id,
                    "medium", "New agent requires discovery validation")
            
            await db.commit()
            logger.info(f"Cross-module propagation completed for {etype}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Event listener error for {etype}: {e}")


def register_listeners():
    """Register all cross-module event listeners on the EventBus."""
    q = bus.subscribe("__cross_module__")
    logger.info("Cross-module event listeners registered")
    return q
