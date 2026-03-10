# sentinel/model_inventory/inventory.py
# Model lifecycle state machine and inventory management — Sprint 4 #27
# States: REGISTERED -> SCANNING -> ACTIVE -> DEPRECATED -> RETIRED

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)


class ModelState(str, Enum):
    REGISTERED = "REGISTERED"
    SCANNING = "SCANNING"
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    RETIRED = "RETIRED"


# Valid state transitions
_TRANSITIONS: dict[ModelState, set[ModelState]] = {
    ModelState.REGISTERED: {ModelState.SCANNING, ModelState.ACTIVE},
    ModelState.SCANNING: {ModelState.ACTIVE, ModelState.REGISTERED},
    ModelState.ACTIVE: {ModelState.DEPRECATED},
    ModelState.DEPRECATED: {ModelState.RETIRED, ModelState.ACTIVE},
    ModelState.RETIRED: set(),  # terminal
}


class InvalidTransitionError(ValueError):
    """Raised when attempting an invalid state transition."""


@dataclass
class ModelRecord:
    id: str
    tenant_id: str
    name: str
    provider: str
    version: str
    state: ModelState
    risk_level: str = "medium"  # low, medium, high, critical
    description: str = ""
    trust_score: Optional[float] = None
    metadata: dict = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def validate_transition(current: ModelState, target: ModelState) -> None:
    """Validate that a state transition is allowed."""
    allowed = _TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidTransitionError(
            f"Cannot transition from {current.value} to {target.value}. "
            f"Allowed: {[s.value for s in allowed]}"
        )


def classify_risk(provider: str, use_case: str = "") -> str:
    """Auto-classify model risk based on provider and use case."""
    high_risk_keywords = ["medical", "financial", "legal", "safety", "pii"]
    if any(kw in use_case.lower() for kw in high_risk_keywords):
        return "critical"
    if provider.lower() in ["custom", "fine-tuned", "self-hosted"]:
        return "high"
    return "medium"


class ModelInventoryStore:
    """PostgreSQL-backed model inventory with lifecycle state machine."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def register(
        self,
        tenant_id: str,
        name: str,
        provider: str,
        version: str,
        risk_level: Optional[str] = None,
        description: str = "",
        metadata: Optional[dict] = None,
    ) -> ModelRecord:
        """Register a new model (initial state: REGISTERED)."""
        model_id = str(uuid.uuid4())
        risk = risk_level or classify_risk(provider, description)
        now = datetime.utcnow()

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO model_inventory
                    (id, tenant_id, name, provider, version, state,
                     risk_level, description, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                model_id, tenant_id, name, provider, version,
                ModelState.REGISTERED.value, risk, description,
                metadata or {}, now, now,
            )

        record = ModelRecord(
            id=model_id, tenant_id=tenant_id, name=name,
            provider=provider, version=version,
            state=ModelState.REGISTERED, risk_level=risk,
            description=description, metadata=metadata or {},
            created_at=now, updated_at=now,
        )
        logger.info("Model registered: %s (%s/%s)", model_id, provider, name)
        return record

    async def transition(
        self, tenant_id: str, model_id: str, target_state: ModelState
    ) -> ModelRecord:
        """Transition a model to a new lifecycle state."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM model_inventory WHERE id = $1 AND tenant_id = $2",
                model_id, tenant_id,
            )
            if not row:
                raise ValueError(f"Model {model_id} not found")

            current = ModelState(row["state"])
            validate_transition(current, target_state)

            now = datetime.utcnow()
            await conn.execute(
                """
                UPDATE model_inventory
                SET state = $1, updated_at = $2
                WHERE id = $3 AND tenant_id = $4
                """,
                target_state.value, now, model_id, tenant_id,
            )

        logger.info(
            "Model %s transitioned: %s -> %s",
            model_id, current.value, target_state.value,
        )
        return self._row_to_record(dict(row) | {"state": target_state.value, "updated_at": now})

    async def get(self, tenant_id: str, model_id: str) -> Optional[ModelRecord]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM model_inventory WHERE id = $1 AND tenant_id = $2",
                model_id, tenant_id,
            )
        return self._row_to_record(row) if row else None

    async def list_models(
        self,
        tenant_id: str,
        state: Optional[ModelState] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[ModelRecord]:
        offset = (page - 1) * page_size
        async with self._pool.acquire() as conn:
            if state:
                rows = await conn.fetch(
                    """
                    SELECT * FROM model_inventory
                    WHERE tenant_id = $1 AND state = $2
                    ORDER BY updated_at DESC LIMIT $3 OFFSET $4
                    """,
                    tenant_id, state.value, page_size, offset,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT * FROM model_inventory
                    WHERE tenant_id = $1
                    ORDER BY updated_at DESC LIMIT $2 OFFSET $3
                    """,
                    tenant_id, page_size, offset,
                )
        return [self._row_to_record(r) for r in rows]

    async def update_trust_score(
        self, tenant_id: str, model_id: str, score: float
    ) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE model_inventory
                SET trust_score = $1, updated_at = $2
                WHERE id = $3 AND tenant_id = $4
                """,
                score, datetime.utcnow(), model_id, tenant_id,
            )

    async def create_version(
        self,
        tenant_id: str,
        parent_model_id: str,
        new_version: str,
    ) -> ModelRecord:
        """Create an immutable new version (copy-on-write)."""
        parent = await self.get(tenant_id, parent_model_id)
        if not parent:
            raise ValueError(f"Parent model {parent_model_id} not found")

        return await self.register(
            tenant_id=tenant_id,
            name=parent.name,
            provider=parent.provider,
            version=new_version,
            risk_level=parent.risk_level,
            description=parent.description,
            metadata={**parent.metadata, "parent_version_id": parent_model_id},
        )

    @staticmethod
    def _row_to_record(row) -> ModelRecord:
        return ModelRecord(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            name=row["name"],
            provider=row["provider"],
            version=row["version"],
            state=ModelState(row["state"]),
            risk_level=row.get("risk_level", "medium"),
            description=row.get("description", ""),
            trust_score=row.get("trust_score"),
            metadata=row.get("metadata", {}),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
