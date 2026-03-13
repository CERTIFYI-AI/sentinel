#!/usr/bin/env python3
"""Sentinel GRC - Comprehensive Feature Fix Script
Runs one feature at a time. Execute: python3 gen.py
"""
import os, sys

B = os.path.dirname(os.path.abspath(__file__))

def W(path, content):
    full = os.path.join(B, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  [OK] {path}')

print('\n=== FEATURE 1: TRUST ENGINE (Weighted 0-100 Scoring) ===')

# ----- sentinel/trust_engine/__init__.py -----
W('sentinel/trust_engine/__init__.py', '''from sentinel.trust_engine.engine import TrustEngine, compute_trust_score
from sentinel.trust_engine.router import router as trust_engine_router
__all__ = ["TrustEngine", "compute_trust_score", "trust_engine_router"]
''')

# ----- sentinel/trust_engine/engine.py -----
W('sentinel/trust_engine/engine.py', '''
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: Dict[str, float] = {
    "compliance": 0.30,
    "bias_fairness": 0.25,
    "performance": 0.25,
    "security": 0.20,
}

@dataclass
class TrustSignal:
    name: str
    score: float          # 0.0 - 100.0
    weight: float         # 0.0 - 1.0
    confidence: float = 1.0
    notes: str = ""
    details: Dict[str, Any] = field(default_factory=dict)

    @property
    def weighted(self) -> float:
        return round(self.weight * self.score, 4)

@dataclass
class TrustResult:
    overall_score: float
    grade: str
    label: str
    signals: Dict[str, TrustSignal] = field(default_factory=dict)
    model_id: Optional[str] = None
    tenant_id: Optional[str] = None
    computed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    recommendations: List[str] = field(default_factory=list)

    @property
    def is_trusted(self) -> bool:
        return self.overall_score >= 70.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": self.overall_score,
            "grade": self.grade,
            "label": self.label,
            "is_trusted": self.is_trusted,
            "signals": {k: {"score": v.score, "weight": v.weight, "weighted": v.weighted, "confidence": v.confidence, "notes": v.notes} for k, v in self.signals.items()},
            "model_id": self.model_id,
            "tenant_id": self.tenant_id,
            "computed_at": self.computed_at,
            "recommendations": self.recommendations,
        }

def _grade(score: float) -> tuple:
    if score >= 90: return ("A", "Highly Trusted")
    if score >= 80: return ("B", "Trusted")
    if score >= 70: return ("C", "Provisionally Trusted")
    if score >= 60: return ("D", "Low Trust - Review Required")
    return ("F", "Untrusted - Immediate Action Required")

def _clamp(v: float) -> float:
    return min(max(float(v or 0), 0.0), 100.0)

def _recommendations(signals: Dict[str, TrustSignal]) -> List[str]:
    recs = []
    thresholds = {"compliance": 75, "bias_fairness": 70, "performance": 70, "security": 80}
    messages = {
        "compliance": "Review compliance controls and run a full framework assessment.",
        "bias_fairness": "Conduct a bias audit across protected attributes and demographic groups.",
        "performance": "Investigate latency spikes, error rates, and model drift indicators.",
        "security": "Run a security assessment including prompt injection and data leakage tests.",
    }
    for k, sig in signals.items():
        if sig.score < thresholds.get(k, 70):
            recs.append(messages.get(k, f"Improve {k} score (currently {sig.score:.1f})."))
    return recs

class TrustEngine:
    """Computes weighted trust score (0-100) across compliance, bias, performance, security."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or dict(DEFAULT_WEIGHTS)
        total = sum(self.weights.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Trust weights must sum to 1.0, got {total:.4f}")

    def compute(
        self,
        compliance_score: float = 0.0,
        bias_fairness_score: float = 0.0,
        performance_score: float = 0.0,
        security_score: float = 0.0,
        model_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> TrustResult:
        notes = notes or {}
        raw = {
            "compliance": _clamp(compliance_score),
            "bias_fairness": _clamp(bias_fairness_score),
            "performance": _clamp(performance_score),
            "security": _clamp(security_score),
        }
        signals = {k: TrustSignal(name=k, score=raw[k], weight=self.weights[k], notes=notes.get(k, "")) for k in self.weights}
        overall = round(sum(s.weighted for s in signals.values()), 2)
        grade, label = _grade(overall)
        result = TrustResult(
            overall_score=overall, grade=grade, label=label,
            signals=signals, model_id=model_id, tenant_id=tenant_id,
            recommendations=_recommendations(signals),
        )
        logger.info("TrustEngine: %.2f (%s) model=%s tenant=%s", overall, grade, model_id, tenant_id)
        return result

    def compute_from_dict(self, scores: Dict[str, float], **kwargs) -> TrustResult:
        return self.compute(
            compliance_score=scores.get("compliance", 0),
            bias_fairness_score=scores.get("bias_fairness", 0),
            performance_score=scores.get("performance", 0),
            security_score=scores.get("security", 0),
            **kwargs,
        )

def compute_trust_score(compliance=0, bias_fairness=0, performance=0, security=0, weights=None) -> float:
    return TrustEngine(weights=weights).compute(compliance, bias_fairness, performance, security).overall_score
''')

# ----- sentinel/trust_engine/router.py -----
W('sentinel/trust_engine/router.py', '''
from __future__ import annotations
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sentinel.api.db import get_db
from sentinel.models import TrustTrace, ModelInventory
from sentinel.trust_engine.engine import TrustEngine, TrustResult
from sentinel.events.emitters import emit
import uuid, logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trust-engine", tags=["Trust Engine"])

class ComputeTrustRequest(BaseModel):
    model_id: str = Field(..., description="Model ID to score")
    compliance_score: float = Field(default=0.0, ge=0, le=100)
    bias_fairness_score: float = Field(default=0.0, ge=0, le=100)
    performance_score: float = Field(default=0.0, ge=0, le=100)
    security_score: float = Field(default=0.0, ge=0, le=100)
    weights: Optional[Dict[str, float]] = None
    notes: Optional[Dict[str, str]] = None

class TrustScoreResponse(BaseModel):
    id: str
    model_id: str
    overall_score: float
    grade: str
    label: str
    is_trusted: bool
    signals: Dict
    recommendations: List[str]
    computed_at: str

class TrustSummaryResponse(BaseModel):
    total_models: int
    avg_trust_score: float
    grade_distribution: Dict[str, int]
    untrusted_models: List[Dict]

@router.post("/compute", response_model=TrustScoreResponse, status_code=status.HTTP_201_CREATED)
async def compute_trust_score(req: ComputeTrustRequest, db: AsyncSession = Depends(get_db)):
    engine = TrustEngine(weights=req.weights)
    result: TrustResult = engine.compute(
        compliance_score=req.compliance_score,
        bias_fairness_score=req.bias_fairness_score,
        performance_score=req.performance_score,
        security_score=req.security_score,
        model_id=req.model_id,
        notes=req.notes,
    )
    trace = TrustTrace(
        id=str(uuid.uuid4()),
        model_id=req.model_id,
        trust_score=result.overall_score,
        grade=result.grade,
        compliance_score=req.compliance_score,
        bias_fairness_score=req.bias_fairness_score,
        performance_score=req.performance_score,
        security_score=req.security_score,
        recommendations=result.recommendations,
        created_at=datetime.now(timezone.utc),
    )
    db.add(trace)
    await db.flush()
    await emit("trust.score.computed", "trust_engine", payload={"id": trace.id, "model_id": req.model_id, "score": result.overall_score, "grade": result.grade})
    return TrustScoreResponse(
        id=trace.id, model_id=req.model_id,
        overall_score=result.overall_score, grade=result.grade,
        label=result.label, is_trusted=result.is_trusted,
        signals=result.to_dict()["signals"],
        recommendations=result.recommendations,
        computed_at=result.computed_at,
    )

@router.get("/model/{model_id}/history", response_model=List[TrustScoreResponse])
async def get_trust_history(model_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(TrustTrace).where(TrustTrace.model_id == model_id).order_by(desc(TrustTrace.created_at)).limit(limit))
    traces = r.scalars().all()
    return [TrustScoreResponse(
        id=t.id, model_id=t.model_id,
        overall_score=getattr(t, "trust_score", 0) or 0,
        grade=getattr(t, "grade", "?") or "?",
        label="", is_trusted=(getattr(t, "trust_score", 0) or 0) >= 70,
        signals={}, recommendations=getattr(t, "recommendations", []) or [],
        computed_at=str(getattr(t, "created_at", "")),
    ) for t in traces]

@router.get("/model/{model_id}/latest")
async def get_latest_trust_score(model_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(TrustTrace).where(TrustTrace.model_id == model_id).order_by(desc(TrustTrace.created_at)).limit(1))
    trace = r.scalar_one_or_none()
    if not trace:
        raise HTTPException(404, f"No trust score found for model {model_id}")
    return {"model_id": model_id, "trust_score": getattr(trace, "trust_score", 0), "grade": getattr(trace, "grade", "?"), "computed_at": str(getattr(trace, "created_at", ""))}

@router.get("/summary", response_model=TrustSummaryResponse)
async def trust_summary(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(TrustTrace.model_id, func.max(TrustTrace.created_at).label("latest")).group_by(TrustTrace.model_id))
    model_latest = {row.model_id: row.latest for row in r}
    total = len(model_latest)
    if total == 0:
        return TrustSummaryResponse(total_models=0, avg_trust_score=0.0, grade_distribution={}, untrusted_models=[])
    scores_r = await db.execute(select(TrustTrace).where(TrustTrace.created_at.in_(model_latest.values())))
    traces = scores_r.scalars().all()
    scores = [getattr(t, "trust_score", 0) or 0 for t in traces]
    avg = round(sum(scores) / len(scores), 2) if scores else 0.0
    grade_dist: Dict[str, int] = {}
    untrusted = []
    for t in traces:
        g = getattr(t, "grade", "?") or "?"
        grade_dist[g] = grade_dist.get(g, 0) + 1
        if (getattr(t, "trust_score", 0) or 0) < 70:
            untrusted.append({"model_id": t.model_id, "trust_score": getattr(t, "trust_score", 0)})
    return TrustSummaryResponse(total_models=total, avg_trust_score=avg, grade_distribution=grade_dist, untrusted_models=untrusted)

@router.get("/weights")
async def get_default_weights():
    from sentinel.trust_engine.engine import DEFAULT_WEIGHTS
    return {"weights": DEFAULT_WEIGHTS, "description": {"compliance": "Regulatory adherence (30%)", "bias_fairness": "Equitable outcomes (25%)", "performance": "Reliability and uptime (25%)", "security": "Attack resistance (20%)"}}
''')

print('Trust Engine: engine.py + router.py written')

print('\n=== FEATURE 2: VENDOR MANAGEMENT (Risk Scoring + Questionnaires) ===')

W('sentinel/vendor/__init__.py', 'from sentinel.vendor.router import router as vendor_router\n__all__ = ["vendor_router"]\n')

W('sentinel/vendor/risk.py', '''
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
''')

W('sentinel/vendor/router.py', '''
from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sentinel.api.db import get_db
from sentinel.models import Vendor, VendorQuestionnaire
from sentinel.vendor.risk import score_vendor, VendorRiskResult
import uuid, logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendors", tags=["Vendor Management"])

QUESTIONNAIRE_TEMPLATE = [
    {"id": "q1", "section": "data_handling", "question": "Does the vendor encrypt data at rest and in transit?", "type": "score"},
    {"id": "q2", "section": "data_handling", "question": "Does the vendor have a documented data retention and deletion policy?", "type": "score"},
    {"id": "q3", "section": "security_posture", "question": "Does the vendor hold a current SOC 2 Type II certification?", "type": "score"},
    {"id": "q4", "section": "security_posture", "question": "Has the vendor conducted a penetration test in the last 12 months?", "type": "score"},
    {"id": "q5", "section": "compliance_certs", "question": "Does the vendor hold ISO 27001 or equivalent certification?", "type": "score"},
    {"id": "q6", "section": "compliance_certs", "question": "Is the vendor compliant with applicable AI/data regulations (GDPR, EU AI Act)?", "type": "score"},
    {"id": "q7", "section": "contract_terms", "question": "Does the contract include data processing agreements and liability clauses?", "type": "score"},
    {"id": "q8", "section": "contract_terms", "question": "Are SLA terms clearly defined with penalties for breaches?", "type": "score"},
    {"id": "q9", "section": "incident_history", "question": "Has the vendor had a reportable security incident in the last 24 months?", "type": "score"},
    {"id": "q10", "section": "incident_history", "question": "Does the vendor have an incident response plan with defined RTOs?", "type": "score"},
]

class VendorCreate(BaseModel):
    name: str
    category: str = "AI Provider"
    contact_email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class VendorResponse(BaseModel):
    id: str
    name: str
    category: str
    contact_email: Optional[str]
    website: Optional[str]
    description: Optional[str]
    risk_score: Optional[float]
    risk_level: Optional[str]
    created_at: Optional[str]

class SubmitQuestionnaireRequest(BaseModel):
    vendor_id: str
    answers: Dict[str, Any] = Field(..., description="Map of section -> score 0-100")

class RiskAssessmentResponse(BaseModel):
    vendor_id: str
    vendor_name: str
    overall_score: float
    risk_level: str
    dimension_scores: Dict[str, float]
    recommendations: List[str]
    is_approved: bool

@router.get("/questionnaire/template")
async def get_questionnaire_template():
    return {"template": QUESTIONNAIRE_TEMPLATE, "scoring_guide": {"0-100": "Score each section 0 (worst) to 100 (best)", "sections": list({q["section"] for q in QUESTIONNAIRE_TEMPLATE})},}

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(data: VendorCreate, db: AsyncSession = Depends(get_db)):
    vendor = Vendor(id=str(uuid.uuid4()), name=data.name, category=data.category, contact_email=data.contact_email, website=data.website, description=data.description, created_at=datetime.now(timezone.utc))
    db.add(vendor)
    await db.flush()
    return VendorResponse(id=vendor.id, name=vendor.name, category=vendor.category, contact_email=vendor.contact_email, website=vendor.website, description=vendor.description, risk_score=None, risk_level=None, created_at=str(vendor.created_at))

@router.get("/", response_model=List[VendorResponse])
async def list_vendors(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Vendor).order_by(desc(Vendor.created_at)).offset(skip).limit(limit))
    vendors = r.scalars().all()
    results = []
    for v in vendors:
        latest_q = await db.execute(select(VendorQuestionnaire).where(VendorQuestionnaire.vendor_id == v.id).order_by(desc(VendorQuestionnaire.created_at)).limit(1))
        q = latest_q.scalar_one_or_none()
        results.append(VendorResponse(id=v.id, name=v.name, category=getattr(v, "category", "AI Provider") or "AI Provider", contact_email=getattr(v, "contact_email", None), website=getattr(v, "website", None), description=getattr(v, "description", None), risk_score=getattr(q, "risk_score", None) if q else None, risk_level=getattr(q, "risk_level", None) if q else None, created_at=str(v.created_at) if hasattr(v, "created_at") else None))
    return results

@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    v = r.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Vendor not found")
    return VendorResponse(id=v.id, name=v.name, category=getattr(v, "category", "AI Provider") or "AI Provider", contact_email=getattr(v, "contact_email", None), website=getattr(v, "website", None), description=getattr(v, "description", None), risk_score=None, risk_level=None, created_at=str(getattr(v, "created_at", "")))

@router.post("/assess", response_model=RiskAssessmentResponse)
async def assess_vendor_risk(req: SubmitQuestionnaireRequest, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Vendor).where(Vendor.id == req.vendor_id))
    vendor = r.scalar_one_or_none()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    result: VendorRiskResult = score_vendor(vendor_id=req.vendor_id, vendor_name=vendor.name, answers=req.answers)
    q = VendorQuestionnaire(id=str(uuid.uuid4()), vendor_id=req.vendor_id, answers=req.answers, risk_score=result.overall_score, risk_level=result.risk_level, created_at=datetime.now(timezone.utc))
    db.add(q)
    await db.flush()
    return RiskAssessmentResponse(vendor_id=req.vendor_id, vendor_name=vendor.name, overall_score=result.overall_score, risk_level=result.risk_level, dimension_scores=result.dimension_scores, recommendations=result.recommendations, is_approved=result.is_approved)

@router.get("/{vendor_id}/assessments")
async def list_vendor_assessments(vendor_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(VendorQuestionnaire).where(VendorQuestionnaire.vendor_id == vendor_id).order_by(desc(VendorQuestionnaire.created_at)))
    qs = r.scalars().all()
    return [{"id": q.id, "risk_score": getattr(q, "risk_score", None), "risk_level": getattr(q, "risk_level", None), "created_at": str(getattr(q, "created_at", ""))} for q in qs]
''')

print('Vendor Management: risk.py + router.py written')

print('\n=== FEATURE 3: GOVERNANCE / REGULATORY CHANGE MANAGEMENT ===')

W('sentinel/governance/__init__.py', 'from sentinel.governance.router import router as governance_router\n__all__ = ["governance_router"]\n')

W('sentinel/governance/router.py', '''
from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sentinel.api.db import get_db
from sentinel.models import RegulationEntry
import uuid, logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/governance", tags=["Governance & Regulatory"])

REGULATION_CATALOG = [
    {"id": "eu-ai-act", "name": "EU AI Act", "region": "EU", "category": "AI Regulation", "effective_date": "2024-08-01", "description": "Comprehensive EU framework regulating AI systems by risk level.", "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0206"},
    {"id": "iso-42001", "name": "ISO/IEC 42001", "region": "Global", "category": "AI Management", "effective_date": "2023-12-01", "description": "International standard for AI management systems.", "url": "https://www.iso.org/standard/81230.html"},
    {"id": "nist-ai-rmf", "name": "NIST AI Risk Management Framework", "region": "US", "category": "AI Risk", "effective_date": "2023-01-26", "description": "NIST framework for managing AI risks across the AI lifecycle.", "url": "https://airc.nist.gov/"},
    {"id": "gdpr", "name": "GDPR", "region": "EU", "category": "Data Privacy", "effective_date": "2018-05-25", "description": "EU General Data Protection Regulation covering AI data processing.", "url": "https://gdpr.eu"},
    {"id": "soc2", "name": "SOC 2 Type II", "region": "US", "category": "Security Audit", "effective_date": "2022-01-01", "description": "AICPA Trust Service Criteria covering security, availability, and confidentiality.", "url": "https://www.aicpa.org/resources/landing/system-and-organization-controls-soc-suite-of-services"},
    {"id": "iso-27001", "name": "ISO/IEC 27001:2022", "region": "Global", "category": "Information Security", "effective_date": "2022-10-25", "description": "International standard for information security management systems.", "url": "https://www.iso.org/standard/27001"},
    {"id": "owasp-llm", "name": "OWASP LLM Top 10", "region": "Global", "category": "AI Security", "effective_date": "2023-08-01", "description": "Top 10 security risks for LLM applications.", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"},
    {"id": "ccpa", "name": "CCPA", "region": "US", "category": "Data Privacy", "effective_date": "2020-01-01", "description": "California Consumer Privacy Act governing personal data use.", "url": "https://oag.ca.gov/privacy/ccpa"},
]

STATUS_OPTIONS = ["monitoring", "in_progress", "compliant", "non_compliant", "not_applicable"]

class RegulationStatusUpdate(BaseModel):
    regulation_id: str
    status: str = Field(..., description="One of: monitoring, in_progress, compliant, non_compliant, not_applicable")
    notes: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None

class RegulationStatusResponse(BaseModel):
    id: str
    regulation_id: str
    regulation_name: str
    status: str
    notes: Optional[str]
    owner: Optional[str]
    due_date: Optional[str]
    updated_at: Optional[str]

class RegulatoryChangeLog(BaseModel):
    regulation_id: str
    change_type: str
    summary: str
    impact_level: str
    effective_date: Optional[str]

@router.get("/catalog")
async def list_regulation_catalog(region: Optional[str] = None, category: Optional[str] = None):
    regs = REGULATION_CATALOG
    if region:
        regs = [r for r in regs if r["region"].lower() == region.lower()]
    if category:
        regs = [r for r in regs if r["category"].lower() == category.lower()]
    return {"regulations": regs, "total": len(regs)}

@router.get("/catalog/{regulation_id}")
async def get_regulation_detail(regulation_id: str):
    reg = next((r for r in REGULATION_CATALOG if r["id"] == regulation_id), None)
    if not reg:
        raise HTTPException(404, f"Regulation {regulation_id} not in catalog")
    return reg

@router.post("/status", response_model=RegulationStatusResponse, status_code=status.HTTP_201_CREATED)
async def update_regulation_status(data: RegulationStatusUpdate, db: AsyncSession = Depends(get_db)):
    if data.status not in STATUS_OPTIONS:
        raise HTTPException(400, f"Invalid status. Must be one of: {STATUS_OPTIONS}")
    reg_meta = next((r for r in REGULATION_CATALOG if r["id"] == data.regulation_id), None)
    reg_name = reg_meta["name"] if reg_meta else data.regulation_id
    entry = RegulationEntry(
        id=str(uuid.uuid4()),
        regulation_id=data.regulation_id,
        regulation_name=reg_name,
        status=data.status,
        notes=data.notes,
        owner=data.owner,
        due_date=data.due_date,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.flush()
    return RegulationStatusResponse(id=entry.id, regulation_id=entry.regulation_id, regulation_name=reg_name, status=entry.status, notes=entry.notes, owner=entry.owner, due_date=entry.due_date, updated_at=str(entry.updated_at))

@router.get("/status", response_model=List[RegulationStatusResponse])
async def list_regulation_statuses(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RegulationEntry).order_by(desc(RegulationEntry.updated_at)))
    entries = r.scalars().all()
    return [RegulationStatusResponse(id=e.id, regulation_id=e.regulation_id, regulation_name=getattr(e, "regulation_name", e.regulation_id), status=e.status, notes=getattr(e, "notes", None), owner=getattr(e, "owner", None), due_date=getattr(e, "due_date", None), updated_at=str(getattr(e, "updated_at", ""))) for e in entries]

@router.get("/status/{regulation_id}", response_model=RegulationStatusResponse)
async def get_regulation_status(regulation_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RegulationEntry).where(RegulationEntry.regulation_id == regulation_id).order_by(desc(RegulationEntry.updated_at)).limit(1))
    entry = r.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, f"No status found for regulation {regulation_id}")
    return RegulationStatusResponse(id=entry.id, regulation_id=entry.regulation_id, regulation_name=getattr(entry, "regulation_name", regulation_id), status=entry.status, notes=getattr(entry, "notes", None), owner=getattr(entry, "owner", None), due_date=getattr(entry, "due_date", None), updated_at=str(getattr(entry, "updated_at", "")))

@router.get("/dashboard")
async def governance_dashboard(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RegulationEntry).order_by(desc(RegulationEntry.updated_at)))
    entries = r.scalars().all()
    # Build latest-per-regulation map
    latest: Dict[str, Any] = {}
    for e in entries:
        if e.regulation_id not in latest:
            latest[e.regulation_id] = e
    status_counts: Dict[str, int] = {}
    for e in latest.values():
        status_counts[e.status] = status_counts.get(e.status, 0) + 1
    tracked = len(latest)
    total_in_catalog = len(REGULATION_CATALOG)
    untracked = [r for r in REGULATION_CATALOG if r["id"] not in latest]
    return {
        "summary": {"tracked": tracked, "total_in_catalog": total_in_catalog, "untracked_count": len(untracked)},
        "status_breakdown": status_counts,
        "compliant_count": status_counts.get("compliant", 0),
        "attention_required": status_counts.get("non_compliant", 0) + status_counts.get("in_progress", 0),
        "untracked_regulations": untracked[:5],
    }

@router.post("/change-log", status_code=status.HTTP_201_CREATED)
async def log_regulatory_change(data: RegulatoryChangeLog):
    logger.info("Regulatory change logged: %s - %s (%s)", data.regulation_id, data.change_type, data.impact_level)
    return {"id": str(uuid.uuid4()), "regulation_id": data.regulation_id, "change_type": data.change_type, "summary": data.summary, "impact_level": data.impact_level, "effective_date": data.effective_date, "logged_at": datetime.now(timezone.utc).isoformat()}
''')

print('Governance: router.py written')

print('\n=== FEATURE 4: EXPANDED AUDIT LOGGING (Immutable + Before/After State) ===')

W('sentinel/audit.py', '''
from __future__ import annotations
import json, logging, uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import Request

logger = logging.getLogger("sentinel.audit")

_audit_store: List[Dict[str, Any]] = []

class AuditRecord:
    def __init__(self, action: str, actor: str, resource_type: str, resource_id: str,
                 before_state: Optional[Dict] = None, after_state: Optional[Dict] = None,
                 metadata: Optional[Dict] = None, tenant_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.action = action
        self.actor = actor
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.before_state = before_state
        self.after_state = after_state
        self.metadata = metadata or {}
        self.tenant_id = tenant_id
        self.checksum = self._compute_checksum()

    def _compute_checksum(self) -> str:
        import hashlib
        payload = json.dumps({"id": self.id, "timestamp": self.timestamp, "action": self.action,
            "actor": self.actor, "resource_type": self.resource_type, "resource_id": self.resource_id,
            "before_state": self.before_state, "after_state": self.after_state}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "timestamp": self.timestamp, "action": self.action,
            "actor": self.actor, "resource_type": self.resource_type,
            "resource_id": self.resource_id, "before_state": self.before_state,
            "after_state": self.after_state, "metadata": self.metadata,
            "tenant_id": self.tenant_id, "checksum": self.checksum,
        }

def log_audit(action: str, actor: str, resource_type: str, resource_id: str,
             before_state: Optional[Dict] = None, after_state: Optional[Dict] = None,
             metadata: Optional[Dict] = None, tenant_id: Optional[str] = None) -> AuditRecord:
    record = AuditRecord(action=action, actor=actor, resource_type=resource_type,
        resource_id=resource_id, before_state=before_state, after_state=after_state,
        metadata=metadata, tenant_id=tenant_id)
    _audit_store.append(record.to_dict())
    logger.info("AUDIT: [%s] %s %s/%s by=%s checksum=%s", record.timestamp,
        action, resource_type, resource_id, actor, record.checksum)
    return record

def get_audit_log(resource_type: Optional[str] = None, resource_id: Optional[str] = None,
                  actor: Optional[str] = None, limit: int = 100) -> List[Dict]:
    records = _audit_store[:]
    if resource_type:
        records = [r for r in records if r["resource_type"] == resource_type]
    if resource_id:
        records = [r for r in records if r["resource_id"] == resource_id]
    if actor:
        records = [r for r in records if r["actor"] == actor]
    return sorted(records, key=lambda r: r["timestamp"], reverse=True)[:limit]

def verify_audit_integrity(record_id: str) -> bool:
    record = next((r for r in _audit_store if r["id"] == record_id), None)
    if not record:
        return False
    recomputed = AuditRecord(
        action=record["action"], actor=record["actor"],
        resource_type=record["resource_type"], resource_id=record["resource_id"],
        before_state=record["before_state"], after_state=record["after_state"],
    )
    recomputed.id = record["id"]
    recomputed.timestamp = record["timestamp"]
    return recomputed._compute_checksum() == record["checksum"]
''')

print('Audit Logging: audit.py expanded with immutable records + checksums')

print('\n=== FEATURE 5: BIAS/FAIRNESS AUDITING ===')

W('sentinel/evals/bias_fairness.py', '''
from __future__ import annotations
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
import logging, uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PROTECTED_ATTRIBUTES = ["gender", "race", "age", "disability", "ethnicity", "religion", "sexual_orientation"]

@dataclass
class BiasMetric:
    attribute: str
    metric_name: str
    value: float
    threshold: float
    passed: bool
    details: str = ""

@dataclass
class FairnessReport:
    id: str
    model_id: str
    overall_fairness_score: float
    metrics: List[BiasMetric] = field(default_factory=list)
    protected_attributes_tested: List[str] = field(default_factory=list)
    issues_found: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def is_fair(self) -> bool:
        return self.overall_fairness_score >= 80.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "model_id": self.model_id,
            "overall_fairness_score": self.overall_fairness_score,
            "is_fair": self.is_fair,
            "metrics": [{"attribute": m.attribute, "metric": m.metric_name, "value": m.value, "threshold": m.threshold, "passed": m.passed, "details": m.details} for m in self.metrics],
            "protected_attributes_tested": self.protected_attributes_tested,
            "issues_found": self.issues_found,
            "recommendations": self.recommendations,
            "created_at": self.created_at,
        }

def run_bias_audit(
    model_id: str,
    predictions: Optional[Dict[str, List[float]]] = None,
    demographic_parity_threshold: float = 0.1,
    equalized_odds_threshold: float = 0.1,
) -> FairnessReport:
    report_id = str(uuid.uuid4())
    metrics: List[BiasMetric] = []
    issues: List[str] = []
    recs: List[str] = []
    tested_attrs: List[str] = []
    scores: List[float] = []

    if not predictions:
        return FairnessReport(id=report_id, model_id=model_id, overall_fairness_score=0.0,
            issues_found=["No prediction data provided for bias assessment."],
            recommendations=["Provide demographic-disaggregated prediction data to run a meaningful bias audit."])

    for attr, values in predictions.items():
        if attr not in PROTECTED_ATTRIBUTES:
            continue
        tested_attrs.append(attr)
        if len(values) < 2:
            continue
        mean_val = sum(values) / len(values)
        max_val = max(values)
        min_val = min(values)
        disparity = abs(max_val - min_val)
        dp_passed = disparity <= demographic_parity_threshold
        dp_score = max(0.0, 100.0 - (disparity * 500.0))
        scores.append(dp_score)
        metrics.append(BiasMetric(attribute=attr, metric_name="demographic_parity", value=round(disparity, 4),
            threshold=demographic_parity_threshold, passed=dp_passed, details=f"Disparity between groups: {disparity:.4f}"))
        if not dp_passed:
            issues.append(f"Demographic parity violation for '{attr}': disparity={disparity:.4f} > threshold={demographic_parity_threshold}")
            recs.append(f"Investigate and mitigate bias in '{attr}' predictions. Consider re-balancing training data or applying fairness constraints.")

    overall = round(sum(scores) / len(scores), 2) if scores else 0.0
    if not tested_attrs:
        issues.append("No protected attributes found in prediction data.")
        recs.append("Include data disaggregated by protected attributes (gender, race, age, etc.).")

    report = FairnessReport(id=report_id, model_id=model_id, overall_fairness_score=overall,
        metrics=metrics, protected_attributes_tested=tested_attrs, issues_found=issues, recommendations=recs)
    logger.info("Bias audit for model %s: score=%.2f, issues=%d", model_id, overall, len(issues))
    return report
''')

print('Bias/Fairness: bias_fairness.py written')

print('\n=== CLEANUP: Fix empty sentinel_ui_gen.py ===')

W('sentinel_ui_gen.py', '''
# Sentinel UI Generator - Placeholder
# This module provides utilities for generating UI scaffolding for the Sentinel dashboard.
# It is invoked by the build pipeline to generate frontend components.

import json, os, sys

def generate_dashboard_config():
    return {
        "modules": [
            {"id": "trust-engine", "label": "Trust Engine", "icon": "shield-check", "route": "/trust-engine"},
            {"id": "compliance", "label": "Compliance", "icon": "clipboard-check", "route": "/compliance"},
            {"id": "vendor-management", "label": "Vendor Management", "icon": "building", "route": "/vendors"},
            {"id": "governance", "label": "Governance", "icon": "gavel", "route": "/governance"},
            {"id": "model-inventory", "label": "Model Inventory", "icon": "cpu", "route": "/models"},
            {"id": "audit-log", "label": "Audit Log", "icon": "scroll", "route": "/audit"},
            {"id": "bias-fairness", "label": "Bias & Fairness", "icon": "balance-scale", "route": "/bias-fairness"},
            {"id": "security", "label": "Security", "icon": "lock", "route": "/security"},
            {"id": "hitl", "label": "Human-in-the-Loop", "icon": "users", "route": "/hitl"},
            {"id": "settings", "label": "Settings", "icon": "cog", "route": "/settings"},
        ],
        "version": "1.0.0",
    }

if __name__ == "__main__":
    config = generate_dashboard_config()
    print(json.dumps(config, indent=2))
''')

print('sentinel_ui_gen.py fixed (was 0 bytes, now has content)')

print('\n=== ALL FEATURES WRITTEN ===')
print('Files created/modified:')
print('  sentinel/trust_engine/__init__.py')
print('  sentinel/trust_engine/engine.py')
print('  sentinel/trust_engine/router.py')
print('  sentinel/vendor/__init__.py')
print('  sentinel/vendor/risk.py')
print('  sentinel/vendor/router.py')
print('  sentinel/governance/__init__.py')
print('  sentinel/governance/router.py')
print('  sentinel/audit.py')
print('  sentinel/evals/bias_fairness.py')
print('  sentinel_ui_gen.py')
print('\nRun: python3 gen.py')
