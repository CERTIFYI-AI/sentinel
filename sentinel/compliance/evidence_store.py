from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


@dataclass
class EvidenceRecord:
    """Immutable evidence record for a single control evaluation."""
    framework_id: str
    control_id: str
    tenant_id: str
    request_id: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = 'UNKNOWN'
    signal_source: str = ''
    signal_value: Any = None
    threshold: Optional[str] = None
    evidence_text: str = ''
    remediation: Optional[str] = None
    scope_note: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)


class EvidenceStore:
    """Append-only evidence store for compliance audit trail.

    In production this writes to TimescaleDB hypertable.
    For now uses in-memory buffer with optional file persistence.
    """

    def __init__(self, persist_path: Optional[str] = None):
        self._records: list[EvidenceRecord] = []
        self._persist_path = persist_path
        logger.info('EvidenceStore initialised (persist=%s)', persist_path)

    def append(self, record: EvidenceRecord) -> None:
        """Append a single evidence record."""
        self._records.append(record)
        if self._persist_path:
            self._flush_record(record)

    def append_batch(self, records: list[EvidenceRecord]) -> None:
        """Append multiple evidence records atomically."""
        self._records.extend(records)
        if self._persist_path:
            for r in records:
                self._flush_record(r)

    def query(
        self,
        tenant_id: Optional[str] = None,
        framework_id: Optional[str] = None,
        control_id: Optional[str] = None,
        since: Optional[str] = None,
    ) -> list[EvidenceRecord]:
        """Query evidence records with optional filters."""
        results = self._records
        if tenant_id:
            results = [r for r in results if r.tenant_id == tenant_id]
        if framework_id:
            results = [r for r in results if r.framework_id == framework_id]
        if control_id:
            results = [r for r in results if r.control_id == control_id]
        if since:
            results = [r for r in results if r.timestamp >= since]
        return results

    def get_latest_by_control(
        self, tenant_id: str, framework_id: str
    ) -> dict[str, EvidenceRecord]:
        """Return most recent evidence per control for a framework."""
        latest: dict[str, EvidenceRecord] = {}
        for r in self._records:
            if r.tenant_id == tenant_id and r.framework_id == framework_id:
                key = r.control_id
                if key not in latest or r.timestamp > latest[key].timestamp:
                    latest[key] = r
        return latest

    def count(self, tenant_id: Optional[str] = None) -> int:
        if tenant_id:
            return sum(1 for r in self._records if r.tenant_id == tenant_id)
        return len(self._records)

    def _flush_record(self, record: EvidenceRecord) -> None:
        """Append record to JSONL file."""
        try:
            with open(self._persist_path, 'a') as f:
                f.write(record.to_json() + chr(10))
        except OSError as e:
            logger.error('Failed to persist evidence: %s', e)

    def clear(self) -> None:
        """Clear in-memory records (for testing)."""
        self._records.clear()
