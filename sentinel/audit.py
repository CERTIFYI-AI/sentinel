"""Audit logging module for Certifyi Sentinel.

Provides structured, immutable audit trails for every request,
policy evaluation, and fact-check that passes through Sentinel.
Supports SQLite and JSON file backends.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sentinel.config import AuditConfig
from sentinel.models import AuditEvent

logger = logging.getLogger(__name__)


class AuditBackend:
    """Base interface for audit storage backends."""

    async def write(self, event: AuditEvent) -> None:
        raise NotImplementedError

    async def query(
        self,
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def is_healthy(self) -> bool:
        return True

    async def close(self) -> None:
        pass


class SQLiteBackend(AuditBackend):
    """SQLite-based audit storage."""

    def __init__(self, path: str) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._create_table()

    def _create_table(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                request_id TEXT,
                user_id TEXT,
                session_id TEXT,
                data TEXT,
                policy_result TEXT,
                fact_check_result TEXT,
                error TEXT
            )
            """
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_request_id ON audit_events(request_id)"
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_events(timestamp)"
        )
        self._conn.commit()

    async def write(self, event: AuditEvent) -> None:
        self._conn.execute(
            """
            INSERT OR REPLACE INTO audit_events
            (event_id, event_type, timestamp, request_id, user_id,
             session_id, data, policy_result, fact_check_result, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event.event_id,
                event.event_type.value,
                event.timestamp.isoformat(),
                event.request_id,
                event.user_id,
                event.session_id,
                json.dumps(event.data),
                json.dumps(event.policy_result) if event.policy_result else None,
                json.dumps(event.fact_check_result) if event.fact_check_result else None,
                event.error,
            ),
        )
        self._conn.commit()

    async def query(
        self,
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM audit_events WHERE 1=1"
        params: List[Any] = []
        if request_id:
            sql += " AND request_id = ?"
            params.append(request_id)
        if event_type:
            sql += " AND event_type = ?"
            params.append(event_type)
        if start:
            sql += " AND timestamp >= ?"
            params.append(start.isoformat())
        if end:
            sql += " AND timestamp <= ?"
            params.append(end.isoformat())
        sql += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor = self._conn.execute(sql, params)
        columns = [d[0] for d in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def is_healthy(self) -> bool:
        try:
            self._conn.execute("SELECT 1")
            return True
        except Exception:
            return False

    async def close(self) -> None:
        self._conn.close()


class JSONFileBackend(AuditBackend):
    """JSON lines file backend (append-only)."""

    def __init__(self, path: str) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    async def write(self, event: AuditEvent) -> None:
        with open(self._path, "a") as fh:
            fh.write(event.model_dump_json() + "\n")

    async def query(
        self,
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        if not self._path.exists():
            return []
        results: List[Dict[str, Any]] = []
        with open(self._path) as fh:
            for line in fh:
                record = json.loads(line)
                if request_id and record.get("request_id") != request_id:
                    continue
                if event_type and record.get("event_type") != event_type:
                    continue
                results.append(record)
                if len(results) >= limit:
                    break
        return results


class AuditLogger:
    """High-level audit logger."""

    def __init__(self, config: AuditConfig) -> None:
        self._config = config
        if config.storage_backend == "sqlite":
            self._backend: AuditBackend = SQLiteBackend(config.storage_path)
        else:
            self._backend = JSONFileBackend(config.storage_path)

    async def log(self, event: AuditEvent) -> None:
        """Write an audit event."""
        if not self._config.enabled:
            return
        try:
            await self._backend.write(event)
        except Exception:
            logger.exception("Failed to write audit event %s", event.event_id)

    async def query(
        self,
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Query audit events."""
        return await self._backend.query(
            request_id=request_id,
            event_type=event_type,
            start=start,
            end=end,
            limit=limit,
        )

    def is_healthy(self) -> bool:
        return self._backend.is_healthy()

    async def close(self) -> None:
        await self._backend.close()
