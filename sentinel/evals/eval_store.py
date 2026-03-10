"""In-memory Evaluation Store for Sentinel.

Tracks evaluation runs (accuracy, latency, toxicity, etc.) per tenant
and model, providing CRUD + basic aggregation.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class EvalRun:
    """A single evaluation run record."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    model_id: str = ""
    eval_type: str = "accuracy"  # accuracy | latency | toxicity | custom
    score: float = 0.0
    sample_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    status: str = "completed"  # pending | running | completed | failed


class EvalStore:
    """In-memory store for evaluation runs."""

    def __init__(self) -> None:
        self._runs: dict[str, list[EvalRun]] = {}

    # -- mutations ----------------------------------------------------------

    async def create(self, tenant_id: str, run: EvalRun) -> EvalRun:
        run.tenant_id = tenant_id
        if not run.id:
            run.id = str(uuid.uuid4())
        self._runs.setdefault(tenant_id, []).append(run)
        logger.info(
            "EvalRun %s created for tenant %s (type=%s, score=%.4f)",
            run.id,
            tenant_id,
            run.eval_type,
            run.score,
        )
        return run

    async def delete(self, tenant_id: str, run_id: str) -> bool:
        runs = self._runs.get(tenant_id, [])
        for i, r in enumerate(runs):
            if r.id == run_id:
                runs.pop(i)
                logger.info(
                    "EvalRun %s deleted for tenant %s", run_id, tenant_id
                )
                return True
        return False

    # -- queries ------------------------------------------------------------

    async def get(self, tenant_id: str, run_id: str) -> EvalRun | None:
        for r in self._runs.get(tenant_id, []):
            if r.id == run_id:
                return r
        return None

    async def get_all(
        self,
        tenant_id: str,
        filters: dict[str, Any] | None = None,
    ) -> list[EvalRun]:
        runs = self._runs.get(tenant_id, [])
        if not filters:
            return list(runs)
        result = list(runs)
        if "eval_type" in filters:
            result = [r for r in result if r.eval_type == filters["eval_type"]]
        if "model_id" in filters:
            result = [r for r in result if r.model_id == filters["model_id"]]
        if "status" in filters:
            result = [r for r in result if r.status == filters["status"]]
        return result

    async def get_average_score(
        self,
        tenant_id: str,
        eval_type: str | None = None,
        model_id: str | None = None,
    ) -> float:
        """Return the mean score across matching runs, or 0.0 if none."""
        runs = self._runs.get(tenant_id, [])
        if eval_type:
            runs = [r for r in runs if r.eval_type == eval_type]
        if model_id:
            runs = [r for r in runs if r.model_id == model_id]
        if not runs:
            return 0.0
        return sum(r.score for r in runs) / len(runs)
