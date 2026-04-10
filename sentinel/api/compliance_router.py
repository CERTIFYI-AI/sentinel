"""Compliance API Router — endpoints for compliance framework management.

Endpoints:
  GET    /proxy/compliance/status
  GET    /proxy/compliance/{framework_id}
  GET    /compliance/gaps
  GET    /compliance/attestations
  GET    /compliance/frameworks
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
        from sentinel.compliance.registry import ComplianceRegistry
        registry = ComplianceRegistry()
        scores = await registry.get_all_scores(tenant_id)
        return {"tenant_id": tenant_id, "frameworks": scores}
    except Exception as exc:
        logger.error("Failed to get compliance status: %s", exc)
        return {"tenant_id": tenant_id, "frameworks": []}


@router.get("/frameworks")
async def list_frameworks():
    """List all available compliance frameworks."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.engine import compliance_engine
        frameworks = compliance_engine.list_frameworks()
        return {"frameworks": frameworks}
    except Exception:
        return {"frameworks": []}


@router.get("/frameworks/{framework_id}")
async def get_framework(framework_id: str):
    """Get detailed compliance status for a specific framework."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.engine import compliance_engine
        result = await compliance_engine.evaluate_framework(
            tenant_id=tenant_id, framework_id=framework_id
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Framework not found: {exc}")


@router.get("/gaps")
async def list_compliance_gaps(
    framework_id: str | None = Query(None),
    severity: str | None = Query(None),
):
    """List compliance gaps (auto-created from security findings)."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.registry import ComplianceRegistry
        registry = ComplianceRegistry()
        gaps = await registry.get_gaps(
            tenant_id, framework_id=framework_id, severity=severity
        )
        return {"gaps": gaps, "total": len(gaps)}
    except Exception:
        return {"gaps": [], "total": 0}


@router.get("/attestations")
async def list_attestations(
    status: str | None = Query(None),
):
    """List compliance attestations."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.engine import compliance_engine
        attestations = await compliance_engine.get_attestations(
            tenant_id=tenant_id, status=status
        )
        return {"attestations": attestations, "total": len(attestations)}
    except Exception:
        return {"attestations": [], "total": 0}


@router.get("/report")
async def get_compliance_report():
    """Generate compliance report data."""
    tenant_id = _get_tenant_id()
    try:
        from sentinel.compliance.report_builder import build_compliance_report
        report = await build_compliance_report(tenant_id)
        return report
    except Exception as exc:
        logger.error("Failed to build compliance report: %s", exc)
        return {"error": "Report generation failed"}
