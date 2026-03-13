
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
