
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
