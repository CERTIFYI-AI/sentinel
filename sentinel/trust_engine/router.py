
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
