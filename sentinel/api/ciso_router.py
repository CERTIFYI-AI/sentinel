"""CISO Dashboard API Router for Sentinel.

Provides executive-level endpoints: security posture summary,
risk heatmap data, compliance status, and top findings.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ciso", tags=["ciso"])


class PostureSummary(BaseModel):
    overall_score: float
    trend: str  # improving | stable | declining
    open_findings: int
    critical_findings: int
    categories: dict[str, float]


class ComplianceStatus(BaseModel):
    framework: str
    coverage_pct: float
    passing_controls: int
    total_controls: int


class RiskHeatmapEntry(BaseModel):
    category: str
    severity: str
    count: int


@router.get("/posture", response_model=PostureSummary)
async def get_posture_summary(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> dict[str, Any]:
    """Return the current security posture summary for a tenant."""
    # TODO: wire to PostureCalculator singleton
    return {
        "overall_score": 0.0,
        "trend": "stable",
        "open_findings": 0,
        "critical_findings": 0,
        "categories": {},
    }


@router.get("/compliance", response_model=list[ComplianceStatus])
async def get_compliance_status(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> list[dict[str, Any]]:
    """Return compliance status across all configured frameworks."""
    # TODO: wire to compliance auditor
    return []


@router.get("/risk-heatmap", response_model=list[RiskHeatmapEntry])
async def get_risk_heatmap(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> list[dict[str, Any]]:
    """Return risk heatmap data (category x severity matrix)."""
    # TODO: wire to PostureCalculator findings
    return []


async def compute_posture_score(tenant_id: str) -> object:
    """Compute the security posture score for a tenant.

    Returns a SimpleNamespace with overall_score, security_score,
    compliance_score, quality_score, hitl_score, risk_trend, trend_delta.
    """
    from types import SimpleNamespace

    # TODO: wire to real PostureCalculator
    return SimpleNamespace(
        tenant_id=tenant_id,
        overall_score=75.0,
        security_score=70.0,
        compliance_score=78.0,
        quality_score=80.0,
        hitl_score=85.0,
        risk_trend="stable",
        trend_delta=0.0,
    )
