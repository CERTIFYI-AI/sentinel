
from __future__ import annotations
import json, logging, uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import Request

logger = logging.getLogger("sentinel.audit")

_audit_store: List[Dict[str, Any]] = []

class AuditRecord:
    def __init__(self, action: str, actor: str, resource_type: str, resource_id: str,
                 before_state: Optional[Dict] = None, after_state: Optional[Dict] = None,
                 metadata: Optional[Dict] = None, tenant_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.action = action
        self.actor = actor
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.before_state = before_state
        self.after_state = after_state
        self.metadata = metadata or {}
        self.tenant_id = tenant_id
        self.checksum = self._compute_checksum()

    def _compute_checksum(self) -> str:
        import hashlib
        payload = json.dumps({"id": self.id, "timestamp": self.timestamp, "action": self.action,
            "actor": self.actor, "resource_type": self.resource_type, "resource_id": self.resource_id,
            "before_state": self.before_state, "after_state": self.after_state}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "timestamp": self.timestamp, "action": self.action,
            "actor": self.actor, "resource_type": self.resource_type,
            "resource_id": self.resource_id, "before_state": self.before_state,
            "after_state": self.after_state, "metadata": self.metadata,
            "tenant_id": self.tenant_id, "checksum": self.checksum,
        }

def log_audit(action: str, actor: str, resource_type: str, resource_id: str,
             before_state: Optional[Dict] = None, after_state: Optional[Dict] = None,
             metadata: Optional[Dict] = None, tenant_id: Optional[str] = None) -> AuditRecord:
    record = AuditRecord(action=action, actor=actor, resource_type=resource_type,
        resource_id=resource_id, before_state=before_state, after_state=after_state,
        metadata=metadata, tenant_id=tenant_id)
    _audit_store.append(record.to_dict())
    logger.info("AUDIT: [%s] %s %s/%s by=%s checksum=%s", record.timestamp,
        action, resource_type, resource_id, actor, record.checksum)
    return record

def get_audit_log(resource_type: Optional[str] = None, resource_id: Optional[str] = None,
                  actor: Optional[str] = None, limit: int = 100) -> List[Dict]:
    records = _audit_store[:]
    if resource_type:
        records = [r for r in records if r["resource_type"] == resource_type]
    if resource_id:
        records = [r for r in records if r["resource_id"] == resource_id]
    if actor:
        records = [r for r in records if r["actor"] == actor]
    return sorted(records, key=lambda r: r["timestamp"], reverse=True)[:limit]

def verify_audit_integrity(record_id: str) -> bool:
    record = next((r for r in _audit_store if r["id"] == record_id), None)
    if not record:
        return False
    recomputed = AuditRecord(
        action=record["action"], actor=record["actor"],
        resource_type=record["resource_type"], resource_id=record["resource_id"],
        before_state=record["before_state"], after_state=record["after_state"],
    )
    recomputed.id = record["id"]
    recomputed.timestamp = record["timestamp"]
    return recomputed._compute_checksum() == record["checksum"]
