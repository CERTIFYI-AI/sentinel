"""Security API Router — endpoints for red team campaigns and vulnerability management.

Endpoints:
  GET    /security/posture
  GET    /security/vulnerabilities
  GET    /security/campaigns
  POST   /security/campaigns
  GET    /security/campaigns/{id}
  POST   /security/campaigns/{id}/run
  GET    /security/campaigns/{id}/results
  GET    /security/frameworks/scores
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from sentinel.security.campaign_runner import CampaignRunner
from sentinel.security.vulnerability_store import VulnerabilityStore
from sentinel.security.posture_calculator import get_security_score, get_open_findings, get_top_findings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/security", tags=["security"])

_campaign_runner = CampaignRunner()
_vuln_store = VulnerabilityStore()


def _get_tenant_id() -> str:
    return "default-tenant"


class CreateCampaignRequest(BaseModel):
    name: str
    description: str = ""
    target_model_id: str | None = None
    techniques: list[str] | None = None


@router.get("/posture")
async def get_posture():
    tenant_id = _get_tenant_id()
    score = await get_security_score(tenant_id)
    open_findings = await get_open_findings(tenant_id)
    top = await get_top_findings(tenant_id)
    return {
        "score": score,
        "open_findings": open_findings,
        "top_findings": top,
    }


@router.get("/vulnerabilities")
async def list_vulnerabilities(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
):
    tenant_id = _get_tenant_id()
    vulns = await _vuln_store.get_all(
        tenant_id, severity=severity, status=status, page=page
    )
    return {"vulnerabilities": [asdict(v) for v in vulns], "total": len(vulns)}


@router.get("/campaigns")
async def list_campaigns(page: int = Query(1, ge=1)):
    tenant_id = _get_tenant_id()
    campaigns = await _campaign_runner.get_all_campaigns(tenant_id, page=page)
    return {"campaigns": [asdict(c) for c in campaigns], "total": len(campaigns)}


@router.post("/campaigns", status_code=201)
async def create_campaign(req: CreateCampaignRequest):
    tenant_id = _get_tenant_id()
    campaign = await _campaign_runner.create_campaign(
        tenant_id=tenant_id,
        name=req.name,
        description=req.description,
        target_model_id=req.target_model_id,
        techniques=req.techniques,
    )
    return asdict(campaign)


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    tenant_id = _get_tenant_id()
    campaign = await _campaign_runner.get_campaign(tenant_id, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return asdict(campaign)


@router.post("/campaigns/{campaign_id}/run")
async def run_campaign(campaign_id: str):
    tenant_id = _get_tenant_id()
    campaign = await _campaign_runner.run_campaign(tenant_id, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return asdict(campaign)


@router.get("/campaigns/{campaign_id}/results")
async def get_campaign_results(campaign_id: str):
    tenant_id = _get_tenant_id()
    findings = await _campaign_runner.get_campaign_results(tenant_id, campaign_id)
    return {"findings": [asdict(f) for f in findings], "total": len(findings)}


@router.get("/frameworks/scores")
async def get_framework_scores():
    tenant_id = _get_tenant_id()
    # Placeholder: return framework scores from compliance registry
    try:
        from sentinel.compliance.registry import ComplianceRegistry
        registry = ComplianceRegistry()
        scores = await registry.get_all_scores(tenant_id)
        return {"frameworks": scores}
    except Exception:
        return {"frameworks": []}
