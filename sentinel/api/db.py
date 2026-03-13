
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Text, DateTime, Boolean, Float, Integer, JSON
from datetime import datetime, timezone
import uuid
import os

DB_PATH = os.environ.get("SQLITE_DB", "/tmp/sentinel.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

def now():
    return datetime.now(timezone.utc)

def new_id():
    return str(uuid.uuid4())

# ---- Models ----
class Policy(Base):
    __tablename__ = "policies"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, default="AI Governance")
    framework = Column(String, default="EU AI Act")
    status = Column(String, default="Draft")
    version = Column(String, default="1.0")
    owner = Column(String)
    tags = Column(JSON, default=list)
    content = Column(Text)
    remarks = Column(Text)
    approval_date = Column(DateTime)
    approver = Column(String)
    compliance_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class PolicyVersion(Base):
    __tablename__ = "policy_versions"
    id = Column(String, primary_key=True, default=new_id)
    policy_id = Column(String, nullable=False)
    version = Column(String)
    content = Column(Text)
    status = Column(String)
    changed_by = Column(String)
    changelog = Column(Text)
    created_at = Column(DateTime, default=now)

class ModelInventory(Base):
    __tablename__ = "model_inventory"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    name = Column(String, nullable=False)
    version = Column(String, default="1.0")
    model_type = Column(String, default="LLM")
    risk_level = Column(String, default="Medium")
    lifecycle_stage = Column(String, default="Draft")
    owner = Column(String)
    vendor_id = Column(String)
    description = Column(Text)
    endpoint_url = Column(String)
    compliance_score = Column(Float, default=0.0)
    bias_score = Column(Float)
    drift_score = Column(Float)
    linked_policies = Column(JSON, default=list)
    linked_datasets = Column(JSON, default=list)
    linked_controls = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    is_external = Column(Boolean, default=False)
    deployment_date = Column(DateTime)
    last_audit_date = Column(DateTime)
    hitl_pending = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class Control(Base):
    __tablename__ = "controls"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    control_id = Column(String)
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    framework = Column(String, default="EU AI Act")
    owner = Column(String)
    risk_level = Column(String, default="Medium")
    status = Column(String, default="Not Implemented")
    frequency = Column(String, default="Annual")
    linked_policy_id = Column(String)
    effectiveness_score = Column(Float, default=0.0)
    linked_models = Column(JSON, default=list)
    test_results = Column(JSON, default=list)
    evidence_items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    name = Column(String, nullable=False)
    version = Column(String, default="1.0")
    category = Column(String)
    sensitivity = Column(String, default="Internal")
    data_owner = Column(String)
    source = Column(String)
    volume = Column(String)
    contains_pii = Column(Boolean, default=False)
    contains_demographic = Column(Boolean, default=False)
    linked_models = Column(JSON, default=list)
    lineage_notes = Column(Text)
    description = Column(Text)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    name = Column(String)
    agent_type = Column(String)
    source = Column(String, default="manual")
    status = Column(String, default="Discovered")
    risk_level = Column(String, default="Medium")
    linked_model_id = Column(String)
    owner = Column(String)
    governing_policy_id = Column(String)
    vendor = Column(String)
    discovery_metadata = Column(JSON, default=dict)
    rejection_reason = Column(Text)
    compliance_score = Column(Float, default=0.0)
    discovered_at = Column(DateTime, default=now)
    confirmed_at = Column(DateTime)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    name = Column(String, nullable=False)
    category = Column(String, default="Foundation Model")
    risk_tier = Column(Integer, default=2)
    status = Column(String, default="Active")
    contract_expiry = Column(DateTime)
    has_data_sharing_agreement = Column(Boolean, default=False)
    soc2_certified = Column(Boolean, default=False)
    iso_certified = Column(Boolean, default=False)
    contact_info = Column(JSON, default=dict)
    linked_models = Column(JSON, default=list)
    linked_agents = Column(JSON, default=list)
    compliance_score = Column(Float, default=0.0)
    description = Column(Text)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class BiasAudit(Base):
    __tablename__ = "bias_audits"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    model_id = Column(String)
    dataset_id = Column(String)
    framework = Column(String, default="EU AI Act")
    status = Column(String, default="Draft")
    overall_score = Column(Float)
    breakdown = Column(JSON, default=dict)
    metrics = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    threshold = Column(Float, default=0.1)
    passed = Column(Boolean)
    triggered_by = Column(String, default="manual")
    remediation_task_id = Column(String)
    created_at = Column(DateTime, default=now)
    completed_at = Column(DateTime)

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    title = Column(String, nullable=False)
    evidence_type = Column(String, default="report")
    source = Column(String)
    collection_date = Column(DateTime, default=now)
    linked_controls = Column(JSON, default=list)
    linked_models = Column(JSON, default=list)
    is_auto_collected = Column(Boolean, default=False)
    file_url = Column(String)
    freshness_status = Column(String, default="fresh")
    tags = Column(JSON, default=list)
    activity_log = Column(JSON, default=list)
    created_at = Column(DateTime, default=now)

class HITLReview(Base):
    __tablename__ = "hitl_reviews"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    entity_type = Column(String)
    entity_id = Column(String)
    entity_name = Column(String)
    risk_level = Column(String, default="Medium")
    trigger_reason = Column(String)
    status = Column(String, default="Pending")
    assigned_to = Column(String)
    decision = Column(String)
    remarks = Column(Text)
    sla_hours = Column(Integer, default=48)
    is_overdue = Column(Boolean, default=False)
    decided_at = Column(DateTime)
    decided_by = Column(String)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    entity_type = Column(String)
    entity_id = Column(String)
    action = Column(String)
    actor = Column(String, default="system")
    details = Column(JSON, default=dict)
    ip_address = Column(String)
    created_at = Column(DateTime, default=now)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    user_id = Column(String, default="system")
    title = Column(String)
    message = Column(Text)
    notification_type = Column(String, default="info")
    entity_type = Column(String)
    entity_id = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)

class ComplianceEvent(Base):
    __tablename__ = "compliance_events"
    id = Column(String, primary_key=True, default=new_id)
    tenant_id = Column(String, default="default")
    event_type = Column(String)
    entity_type = Column(String)
    entity_id = Column(String)
    entity_name = Column(String)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=now)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
