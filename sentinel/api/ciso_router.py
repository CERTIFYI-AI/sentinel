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

# ---------------------------------------------------------------------------
# Singleton posture calculator — shared across all requests
# ---------------------------------------------------------------------------
from sentinel.security.posture_calculator import PostureCalculator

_posture_calculator = PostureCalculator()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/posture", response_model=PostureSummary)
async def get_posture_summary(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> dict[str, Any]:
    """Return the current security posture summary for a tenant."""
    report = _posture_calculator.compute(tenant_id)
    return {
        "overall_score": report.overall_score,
        "trend": "stable",  # TODO: compute from PostureHistoryStore
        "open_findings": report.open_findings,
        "critical_findings": report.critical_findings,
        "categories": report.category_scores,
    }


@router.get("/compliance", response_model=list[ComplianceStatus])
async def get_compliance_status(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> list[dict[str, Any]]:
    """Return compliance status across all configured frameworks."""
    from sentinel.compliance.registry import FRAMEWORKS

    results = []
    for fw in FRAMEWORKS.values():
        total = fw.control_count
        technical = len(fw.technical_controls)
        results.append({
            "framework": fw.name,
            "coverage_pct": round((technical / total * 100) if total else 0, 1),
            "passing_controls": 0,  # TODO: wire to compliance evaluator results
            "total_controls": total,
        })
    return results


@router.get("/risk-heatmap", response_model=list[RiskHeatmapEntry])
async def get_risk_heatmap(
    tenant_id: str = Query(..., description="Tenant ID"),
) -> list[dict[str, Any]]:
    """Return risk heatmap data (category x severity matrix)."""
    findings = _posture_calculator.get_findings(tenant_id)
    heatmap: dict[tuple[str, str], int] = {}
    for f in findings:
        key = (f.category, f.severity.value)
        heatmap[key] = heatmap.get(key, 0) + 1
    return [
        {"category": cat, "severity": sev, "count": count}
        for (cat, sev), count in sorted(heatmap.items())
    ]


# ---------------------------------------------------------------------------
# compute_posture_score — called by automation rules
# ---------------------------------------------------------------------------


async def compute_posture_score(tenant_id: str) -> tuple[float, dict]:
    """Compute the security posture score for a tenant.

    Returns (overall_score, component_dict) so callers can emit the
    posture.score.updated event with structured payload.
    """
    report = _posture_calculator.compute(tenant_id)
    components = {
        "security_score": report.overall_score,
        "open_findings": report.open_findings,
        "critical_findings": report.critical_findings,
        "categories": report.category_scores,
    }
    return report.overall_score, components
