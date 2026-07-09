"""Compliance API Router — endpoints for compliance framework management.

Endpoints:
  GET    /proxy/compliance/status
  GET    /proxy/compliance/{framework_id}
  GET    /compliance/gaps
  GET    /compliance/attestations
  GET    /compliance/frameworks
  GET    /compliance/report
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["compliance"])


def _get_tenant_id() -> str:
    return "default-tenant"


@router.get("/status")
async def get_compliance_status():
    """Overall compliance status across all frameworks."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.registry import get_registry

        registry = get_registry()
        scores = await registry.get_all_scores(tenant_id)
        return {"tenant_id": tenant_id, "frameworks": scores}
    except Exception:
        logger.exception(
            "Failed to get compliance status for tenant %s", tenant_id
        )
        raise HTTPException(
            status_code=500, detail="Failed to compute compliance status"
        )


@router.get("/frameworks")
async def list_frameworks():
    """List all available compliance frameworks."""
    try:
        from sentinel.compliance.registry import FRAMEWORKS

        frameworks = [
            {
                "framework_id": fw.framework_id,
                "name": fw.name,
                "version": fw.version,
                "description": fw.description,
                "control_count": fw.control_count,
            }
            for fw in FRAMEWORKS.values()
        ]
        return {"frameworks": frameworks}
    except Exception:
        logger.exception("Failed to list compliance frameworks")
        raise HTTPException(status_code=500, detail="Failed to list frameworks")


@router.get("/frameworks/{framework_id}")
async def get_framework(framework_id: str):
    """Get detailed compliance status for a specific framework."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.engine import compliance_engine
        from sentinel.compliance.registry import get_framework as _get_framework

        framework = _get_framework(framework_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    try:
        result = compliance_engine.evaluate(
            framework=framework,
            signals={},
            tenant_id=tenant_id,
            request_id=f"api-framework-{framework_id}",
        )
        return result.to_dict()
    except Exception:
        logger.exception(
            "Failed to evaluate framework %s for tenant %s",
            framework_id,
            tenant_id,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate framework: {framework_id}"
        )


@router.get("/gaps")
async def list_compliance_gaps(
    framework_id: str | None = Query(None),
    severity: str | None = Query(None),
):
    """List compliance gaps (derived from FAIL/PARTIAL control evidence)."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.registry import get_registry

        registry = get_registry()
        gaps = await registry.get_gaps(
            tenant_id, framework_id=framework_id, severity=severity
        )
        return {"gaps": gaps, "total": len(gaps)}
    except Exception:
        logger.exception(
            "Failed to list compliance gaps for tenant %s", tenant_id
        )
        raise HTTPException(status_code=500, detail="Failed to list compliance gaps")


@router.get("/attestations")
async def list_attestations(
    status: str | None = Query(None),
):
    """List controls requiring manual attestation.

    There is no attestation-submission store in this codebase yet (no
    table, no service), so this returns the real set of MANUAL-eval-type
    controls from the control registry with status fixed at "pending"
    rather than calling a persistence method that doesn't exist.
    """
    try:
        from sentinel.compliance.control_registry import ALL_CONTROLS, EvalType

        attestations = [
            {
                "control_id": c.id,
                "framework_id": c.framework_id,
                "title": c.title,
                "attestation_interval_days": getattr(
                    c, "attestation_interval_days", None
                ),
                "status": "pending",
            }
            for c in ALL_CONTROLS
            if c.eval_type == EvalType.MANUAL
        ]
        if status:
            attestations = [a for a in attestations if a["status"] == status]
        return {"attestations": attestations, "total": len(attestations)}
    except Exception:
        logger.exception("Failed to list attestations")
        raise HTTPException(status_code=500, detail="Failed to list attestations")


@router.get("/report")
async def get_compliance_report():
    """Generate a compliance report across all frameworks.

    Built directly on ComplianceEngine.evaluate_all() — the same evaluator
    used by /frameworks/{framework_id} — rather than ReportBuilder, whose
    expected FrameworkEvalResult shape (Control objects with category/
    signal_source/threshold fields) doesn't match what any evaluator in
    this codebase currently produces (EvidenceRecord objects). Wiring
    ReportBuilder correctly is a separate, larger fix.
    """
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.engine import compliance_engine
        from sentinel.compliance.registry import FRAMEWORKS

        results = compliance_engine.evaluate_all(
            frameworks=list(FRAMEWORKS.values()),
            signals={},
            tenant_id=tenant_id,
            request_id="compliance-report",
        )
        return {
            "tenant_id": tenant_id,
            "frameworks": [r.to_dict() for r in results],
            "summary": {
                "total_frameworks": len(results),
                "total_controls": sum(len(r.controls) for r in results),
                "total_pass": sum(r.pass_count for r in results),
                "total_fail": sum(r.fail_count for r in results),
            },
        }
    except Exception:
        logger.error("Failed to build compliance report for tenant %s", tenant_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Report generation failed")
