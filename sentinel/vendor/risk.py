
from __future__ import annotations
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

VENDOR_RISK_WEIGHTS = {
    "data_handling": 0.25,
    "security_posture": 0.25,
    "compliance_certs": 0.20,
    "contract_terms": 0.15,
    "incident_history": 0.15,
}

RISK_THRESHOLDS = {"low": 70, "medium": 50}

@dataclass
class VendorRiskResult:
    vendor_id: str
    vendor_name: str
    overall_score: float
    risk_level: str
    dimension_scores: Dict[str, float] = field(default_factory=dict)
    findings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

    @property
    def is_approved(self) -> bool:
        return self.overall_score >= 60

def score_vendor(vendor_id: str, vendor_name: str, answers: Dict[str, Any]) -> VendorRiskResult:
    dims = {}
    for dim in VENDOR_RISK_WEIGHTS:
        raw = answers.get(dim, 0)
        dims[dim] = min(max(float(raw), 0.0), 100.0)
    overall = round(sum(VENDOR_RISK_WEIGHTS[k] * dims[k] for k in VENDOR_RISK_WEIGHTS), 2)
    if overall >= RISK_THRESHOLDS["low"]:
        risk_level = "low"
    elif overall >= RISK_THRESHOLDS["medium"]:
        risk_level = "medium"
    else:
        risk_level = "high"
    recs = []
    if dims.get("data_handling", 100) < 70:
        recs.append("Review data handling practices and encryption standards.")
    if dims.get("security_posture", 100) < 70:
        recs.append("Request latest penetration test report and SOC 2 Type II.")
    if dims.get("compliance_certs", 100) < 60:
        recs.append("Verify vendor compliance certifications (ISO 27001, SOC2, etc.).")
    if dims.get("incident_history", 100) < 60:
        recs.append("Escalate review: vendor has incident history requiring investigation.")
    return VendorRiskResult(
        vendor_id=vendor_id, vendor_name=vendor_name,
        overall_score=overall, risk_level=risk_level,
        dimension_scores=dims, recommendations=recs,
    )
