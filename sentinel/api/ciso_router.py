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
router = APIRouter(tags=["ciso"])

# ---------------------------------------------------------------------------
# Singleton posture calculator — shared across all requests.
#
# This must be the SAME instance that sentinel/layers/auditor.py feeds via
# record_pipeline_signals() after every audited request, and the same one
# sentinel/api/security_router.py reads via get_security_score() /
# get_open_findings() / get_top_findings(). Previously this router
# instantiated its own separate PostureCalculator(), so it never saw
# findings recorded anywhere else in the process.
# ---------------------------------------------------------------------------
from sentinel.security.posture_calculator import default_calculator as _posture_calculator


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
        "trend": report.trend,
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
    from sentinel.compliance.engine import compliance_engine

    results = []
    for fw in FRAMEWORKS.values():
        total = fw.control_count
        technical = len(fw.technical_controls)
        # ComplianceEngine.evaluate() enforces "never mark PASS without a
        # computed signal" — until a live per-tenant signals feed exists
        # (e.g. sourced from proxy.py inference telemetry), this correctly
        # reports 0 passing rather than a hardcoded/fabricated number. The
        # moment real signals are available, this call needs no changes.
        eval_result = compliance_engine.evaluate(
            framework=fw,
            signals={},
            tenant_id=tenant_id,
            request_id="ciso-dashboard",
        )
        results.append({
            "framework": fw.name,
            "coverage_pct": round((technical / total * 100) if total else 0, 1),
            "passing_controls": eval_result.pass_count,
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
