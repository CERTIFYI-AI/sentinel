"""Evals API Router — endpoints for evaluation run management.

Endpoints:
  GET    /evals/runs
  POST   /evals/runs
  GET    /evals/runs/{id}
  GET    /evals/runs/{id}/results
  POST   /evals/runs/{id}/execute
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from sentinel.evals.eval_runner import EvalRunner
from sentinel.evals.eval_store import EvalStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evals", tags=["evals"])

_eval_runner = EvalRunner()
_eval_store = EvalStore()


def _get_tenant_id() -> str:
    return "default-tenant"


class CreateEvalRunRequest(BaseModel):
    dataset_id: str
    model_id: str | None = None
    metric_configs: list[dict[str, Any]] | None = None


@router.get("/runs")
async def list_runs(page: int = Query(1, ge=1)):
    tenant_id = _get_tenant_id()
    runs = await _eval_runner.get_all_runs(tenant_id, page=page)
    return {"runs": [asdict(r) for r in runs], "total": len(runs)}


@router.post("/runs", status_code=201)
async def create_run(req: CreateEvalRunRequest):
    tenant_id = _get_tenant_id()
    run = await _eval_runner.create_run(
        tenant_id=tenant_id,
        dataset_id=req.dataset_id,
        model_id=req.model_id,
        metric_configs=req.metric_configs,
    )
    return asdict(run)


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    tenant_id = _get_tenant_id()
    run = await _eval_runner.get_run(tenant_id, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")
    return asdict(run)


@router.get("/runs/{run_id}/results")
async def get_run_results(run_id: str):
    tenant_id = _get_tenant_id()
    results = await _eval_runner.get_run_results(tenant_id, run_id)
    return {"results": [asdict(r) for r in results], "total": len(results)}


@router.post("/runs/{run_id}/execute")
async def execute_run(run_id: str):
    tenant_id = _get_tenant_id()
    run = await _eval_runner.execute_run(tenant_id, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")
    return asdict(run)


@router.get("/datasets")
async def list_datasets():
    tenant_id = _get_tenant_id()
    datasets = await _eval_store.get_datasets(tenant_id)
    return {"datasets": datasets}


@router.get("/metrics")
async def list_metrics():
    tenant_id = _get_tenant_id()
    metrics = await _eval_store.get_metrics(tenant_id)
    return {"metrics": metrics}


@router.get("/pass-rate")
async def get_pass_rate(days: int = Query(30, ge=1)):
    tenant_id = _get_tenant_id()
    rate = await _eval_store.get_recent_pass_rate(tenant_id, days=days)
    return {"pass_rate": rate, "period_days": days}
