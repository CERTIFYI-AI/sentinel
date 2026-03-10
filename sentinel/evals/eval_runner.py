"""Eval Runner — executes evaluation suites against LLM outputs.

Runs eval suites, measures metrics (relevance, faithfulness, safety, factuality),
compares against thresholds, and emits events when thresholds are breached.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class EvalMetricResult:
    metric_id: str
    metric_name: str
    score: float
    threshold: float
    passed: bool
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalRunResult:
    id: str
    tenant_id: str
    run_id: str
    dataset_id: str
    model_id: str | None
    status: str  # QUEUED | RUNNING | COMPLETE | FAILED
    metrics: list[EvalMetricResult] = field(default_factory=list)
    overall_pass: bool = True
    error: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class EvalRunner:
    """Orchestrates evaluation runs with event emission on failure."""

    _runs: dict[str, list[EvalRunResult]] = {}  # tenant_id -> runs

    async def create_run(
        self,
        *,
        tenant_id: str,
        dataset_id: str,
        model_id: str | None = None,
        metric_configs: list[dict[str, Any]] | None = None,
    ) -> EvalRunResult:
        run = EvalRunResult(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            run_id=str(uuid.uuid4()),
            dataset_id=dataset_id,
            model_id=model_id,
            status="QUEUED",
        )
        if tenant_id not in self._runs:
            self._runs[tenant_id] = []
        self._runs[tenant_id].append(run)
        logger.info("Eval run created: %s for tenant %s", run.id, tenant_id)
        return run

    async def execute_run(
        self,
        tenant_id: str,
        run_id: str,
        metric_configs: list[dict[str, Any]] | None = None,
    ) -> EvalRunResult | None:
        run = await self.get_run(tenant_id, run_id)
        if not run:
            return None

        run.status = "RUNNING"
        run.started_at = datetime.now(timezone.utc).isoformat()

        try:
            configs = metric_configs or [
                {"name": "relevance", "threshold": 0.7},
                {"name": "faithfulness", "threshold": 0.8},
                {"name": "safety", "threshold": 0.9},
                {"name": "factuality", "threshold": 0.75},
            ]

            for config in configs:
                result = await self._evaluate_metric(
                    metric_name=config["name"],
                    threshold=config.get("threshold", 0.7),
                    dataset_id=run.dataset_id,
                    model_id=run.model_id,
                )
                run.metrics.append(result)
                if not result.passed:
                    run.overall_pass = False

            run.status = "COMPLETE"
            run.completed_at = datetime.now(timezone.utc).isoformat()

            # Wire: emit_eval_failure when any metric fails threshold
            if not run.overall_pass:
                await self._emit_eval_failure(run)

            logger.info(
                "Eval run %s completed: pass=%s", run.id, run.overall_pass
            )

        except Exception as exc:
            run.status = "FAILED"
            run.error = str(exc)
            run.completed_at = datetime.now(timezone.utc).isoformat()
            logger.error("Eval run %s failed: %s", run.id, exc)

        return run

    async def _evaluate_metric(
        self,
        *,
        metric_name: str,
        threshold: float,
        dataset_id: str,
        model_id: str | None,
    ) -> EvalMetricResult:
        """Evaluate a single metric against the dataset.
        Production: integrate with actual eval providers (DeepEval, RAGAS, etc.).
        """
        # Placeholder: production should call actual evaluation logic
        score = 0.85  # Replace with real evaluation
        return EvalMetricResult(
            metric_id=str(uuid.uuid4()),
            metric_name=metric_name,
            score=score,
            threshold=threshold,
            passed=score >= threshold,
            details={"dataset_id": dataset_id, "model_id": model_id},
        )

    async def _emit_eval_failure(self, run: EvalRunResult) -> None:
        """Emit eval.failure event to trigger automation cascade.

        This wires into sentinel.events.emitters.emit_eval_failure()
        to cascade: eval failure -> HITL item + remediation task.
        """
        try:
            from sentinel.events.emitters import emit_eval_failure

            failed_metrics = [
                {"name": m.metric_name, "score": m.score, "threshold": m.threshold}
                for m in run.metrics
                if not m.passed
            ]
            await emit_eval_failure(
                tenant_id=run.tenant_id,
                run_id=run.id,
                model_id=run.model_id or "",
                failed_metrics=failed_metrics,
            )
            logger.info("Emitted eval failure event for run %s", run.id)
        except Exception as exc:
            logger.error("Failed to emit eval failure for run %s: %s", run.id, exc)

    async def get_run(
        self, tenant_id: str, run_id: str
    ) -> EvalRunResult | None:
        for run in self._runs.get(tenant_id, []):
            if run.id == run_id:
                return run
        return None

    async def get_all_runs(
        self, tenant_id: str, page: int = 1, page_size: int = 20
    ) -> list[EvalRunResult]:
        runs = self._runs.get(tenant_id, [])
        start = (page - 1) * page_size
        return runs[start : start + page_size]

    async def get_run_results(
        self, tenant_id: str, run_id: str
    ) -> list[EvalMetricResult]:
        run = await self.get_run(tenant_id, run_id)
        if not run:
            return []
        return run.metrics
