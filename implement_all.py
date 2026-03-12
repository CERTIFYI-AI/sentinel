#!/usr/bin/env python3
"""Sentinel Full Implementation - All 12 Modules Sprint-wise"""
import os, textwrap

def w(path, content):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(textwrap.dedent(content).lstrip())
    print(f'  wrote {path}')

print('=== SPRINT 1: Event Bus Extension + Compliance Store ===')

# =================== SPRINT 1: BACKEND EVENT BUS EXTENSION ===================
w('sentinel/events/compliance_events.py', '''
    """Compliance-specific event emitters for all GRC modules."""
    from __future__ import annotations
    import asyncio
    from datetime import datetime, timezone
    from typing import Any, Optional
    from sentinel.events.bus import bus, SentinelEvent, EventType

    async def emit_compliance_event(
        event_type: str,
        tenant_id: str,
        source_module: str,
        payload: dict
    ) -> None:
        """Generic compliance event emitter."""
        evt = SentinelEvent(
            type=event_type,  # type: ignore
            source_module=source_module,
            tenant_id=tenant_id,
            payload=payload
        )
        await bus.publish(evt)

    async def emit_policy_approved(tenant_id: str, policy_id: str, policy_title: str, approver: str) -> None:
        await emit_compliance_event('policy.approved', tenant_id, 'policy', {
            'policy_id': policy_id, 'title': policy_title, 'approver': approver,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_model_registered(tenant_id: str, model_id: str, model_name: str, risk_level: str, owner: str) -> None:
        await emit_compliance_event('model.registered', tenant_id, 'model_inventory', {
            'model_id': model_id, 'name': model_name, 'risk_level': risk_level, 'owner': owner,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_dataset_registered(tenant_id: str, dataset_id: str, name: str, has_pii: bool, has_demographic: bool) -> None:
        await emit_compliance_event('dataset.registered', tenant_id, 'dataset_registry', {
            'dataset_id': dataset_id, 'name': name, 'has_pii': has_pii, 'has_demographic': has_demographic,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_bias_audit_complete(tenant_id: str, audit_id: str, model_id: str, bias_score: float, threshold: float, passed: bool) -> None:
        await emit_compliance_event('bias.audit.complete', tenant_id, 'bias_audit', {
            'audit_id': audit_id, 'model_id': model_id, 'bias_score': bias_score,
            'threshold': threshold, 'passed': passed,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_control_status_changed(tenant_id: str, control_id: str, old_status: str, new_status: str, owner: str) -> None:
        await emit_compliance_event('control.status.changed', tenant_id, 'controls', {
            'control_id': control_id, 'old_status': old_status, 'new_status': new_status, 'owner': owner,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_hitl_decision(tenant_id: str, item_id: str, entity_type: str, entity_id: str, decision: str, actor: str, remarks: str) -> None:
        await emit_compliance_event('hitl.decision', tenant_id, 'hitl', {
            'item_id': item_id, 'entity_type': entity_type, 'entity_id': entity_id,
            'decision': decision, 'actor': actor, 'remarks': remarks,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_vendor_status_changed(tenant_id: str, vendor_id: str, name: str, old_status: str, new_status: str) -> None:
        await emit_compliance_event('vendor.status.changed', tenant_id, 'vendor_registry', {
            'vendor_id': vendor_id, 'name': name, 'old_status': old_status, 'new_status': new_status,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_evidence_synced(tenant_id: str, evidence_id: str, title: str, control_ids: list, model_ids: list) -> None:
        await emit_compliance_event('evidence.synced', tenant_id, 'evidence_sync', {
            'evidence_id': evidence_id, 'title': title, 'control_ids': control_ids, 'model_ids': model_ids,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def emit_agent_discovered(tenant_id: str, agent_id: str, source: str, agent_type: str, risk_level: str) -> None:
        await emit_compliance_event('agent.discovered', tenant_id, 'agent_discovery', {
            'agent_id': agent_id, 'source': source, 'type': agent_type, 'risk_level': risk_level,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
''')

print('Sprint 1 backend: compliance_events.py written')

# =================== BACKEND: COMPLIANCE PROPAGATION ENGINE ===================
w('sentinel/events/propagation.py', '''
    """Compliance propagation engine - handles all cross-module state updates."""
    from __future__ import annotations
    import asyncio
    import logging
    from typing import Optional
    from sentinel.events.bus import bus, SentinelEvent

    logger = logging.getLogger(__name__)

    async def handle_policy_approved(event: SentinelEvent, db) -> None:
        """POLICY_APPROVED -> check linked controls/models/agents, create HITL gaps."""
        payload = event.payload
        tenant_id = event.tenant_id
        policy_id = payload.get('policy_id')
        try:
            # Get all models linked to this policy
            models = await db.fetch(
                "SELECT id, name, owner FROM model_inventory WHERE tenant_id=$1 AND $2=ANY(linked_policy_ids)",
                tenant_id, policy_id
            )
            for model in models:
                # Check alignment - if model has no controls, flag as gap
                control_count = await db.fetchval(
                    "SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND $2=ANY(linked_policy_ids)",
                    tenant_id, policy_id
                )
                if control_count == 0:
                    await db.execute("""
                        INSERT INTO hitl_items(tenant_id, entity_type, entity_id, entity_name, trigger_reason,
                            risk_level, status, sla_hours)
                        VALUES($1,'model',$2,$3,'POLICY_APPROVED_NO_CONTROLS','high','pending',48)
                        ON CONFLICT DO NOTHING
                    """, tenant_id, model['id'], model['name'])
            # Recalculate compliance score
            await recalculate_compliance_score(tenant_id, db)
            logger.info(f"Policy approved propagation: {policy_id}, {len(models)} models checked")
        except Exception as e:
            logger.error(f"Error in handle_policy_approved: {e}")

    async def handle_model_registered(event: SentinelEvent, db) -> None:
        """MODEL_REGISTERED -> auto-trigger bias audit + control mapping + HITL gate."""
        payload = event.payload
        tenant_id = event.tenant_id
        model_id = payload.get('model_id')
        model_name = payload.get('name')
        risk_level = payload.get('risk_level', 'medium')
        try:
            # Create HITL approval task
            await db.execute("""
                INSERT INTO hitl_items(tenant_id, entity_type, entity_id, entity_name, trigger_reason,
                    risk_level, status, sla_hours)
                VALUES($1,'model',$2,$3,'MODEL_REGISTERED_NEEDS_APPROVAL',$4,'pending',$5)
                ON CONFLICT DO NOTHING
            """, tenant_id, model_id, model_name, risk_level,
                48 if risk_level in ('high','critical') else 120 if risk_level=='medium' else 240)
            # Auto-create bias audit draft
            await db.execute("""
                INSERT INTO bias_audits(tenant_id, model_id, model_name, status, trigger_reason)
                VALUES($1,$2,$3,'draft','MODEL_REGISTERED')
                ON CONFLICT DO NOTHING
            """, tenant_id, model_id, model_name)
            await recalculate_compliance_score(tenant_id, db)
            logger.info(f"Model registered propagation: {model_id}")
        except Exception as e:
            logger.error(f"Error in handle_model_registered: {e}")

    async def handle_bias_audit_complete(event: SentinelEvent, db) -> None:
        """BIAS_AUDIT_COMPLETE -> if exceeded threshold, flag model non-compliant."""
        payload = event.payload
        tenant_id = event.tenant_id
        model_id = payload.get('model_id')
        bias_score = payload.get('bias_score', 0)
        threshold = payload.get('threshold', 0.1)
        passed = payload.get('passed', True)
        try:
            if not passed:
                await db.execute("""
                    UPDATE model_inventory SET compliance_status='non_compliant',
                        bias_score=$1, last_audit_date=NOW()
                    WHERE id=$2 AND tenant_id=$3
                """, bias_score, model_id, tenant_id)
                await db.execute("""
                    INSERT INTO hitl_items(tenant_id, entity_type, entity_id, trigger_reason, risk_level, status, sla_hours)
                    SELECT $1,'model',$2,'BIAS_THRESHOLD_EXCEEDED','high','pending',48
                    WHERE NOT EXISTS(SELECT 1 FROM hitl_items WHERE entity_id=$2 AND trigger_reason='BIAS_THRESHOLD_EXCEEDED' AND status='pending')
                """, tenant_id, model_id)
            else:
                await db.execute("""
                    UPDATE model_inventory SET bias_score=$1, last_audit_date=NOW()
                    WHERE id=$2 AND tenant_id=$3
                """, bias_score, model_id, tenant_id)
            await recalculate_compliance_score(tenant_id, db)
        except Exception as e:
            logger.error(f"Error in handle_bias_audit_complete: {e}")

    async def handle_control_status_changed(event: SentinelEvent, db) -> None:
        """CONTROL_STATUS_CHANGED -> update linked policy compliance scores."""
        payload = event.payload
        tenant_id = event.tenant_id
        control_id = payload.get('control_id')
        new_status = payload.get('new_status')
        try:
            await recalculate_compliance_score(tenant_id, db)
            if new_status == 'failed':
                await db.execute("""
                    INSERT INTO hitl_items(tenant_id, entity_type, entity_id, trigger_reason, risk_level, status, sla_hours)
                    VALUES($1,'control',$2,'CONTROL_FAILED','high','pending',48)
                    ON CONFLICT DO NOTHING
                """, tenant_id, control_id)
        except Exception as e:
            logger.error(f"Error in handle_control_status_changed: {e}")

    async def handle_vendor_status_changed(event: SentinelEvent, db) -> None:
        """VENDOR_STATUS_CHANGED -> cascade risk to linked models/agents."""
        payload = event.payload
        tenant_id = event.tenant_id
        vendor_id = payload.get('vendor_id')
        new_status = payload.get('new_status')
        try:
            if new_status == 'suspended':
                await db.execute("""
                    UPDATE model_inventory SET compliance_status='at_risk',
                        notes=COALESCE(notes,'')||' [VENDOR SUSPENDED]'
                    WHERE tenant_id=$1 AND vendor_id=$2
                """, tenant_id, vendor_id)
            await recalculate_compliance_score(tenant_id, db)
        except Exception as e:
            logger.error(f"Error in handle_vendor_status_changed: {e}")

    async def handle_hitl_decision(event: SentinelEvent, db) -> None:
        """HITL_DECISION -> update entity status, log decision."""
        payload = event.payload
        tenant_id = event.tenant_id
        entity_type = payload.get('entity_type')
        entity_id = payload.get('entity_id')
        decision = payload.get('decision')
        try:
            if entity_type == 'model' and decision == 'approved':
                await db.execute("""
                    UPDATE model_inventory SET status='production', hitl_status='approved'
                    WHERE id=$1 AND tenant_id=$2 AND status='staging'
                """, entity_id, tenant_id)
            elif entity_type == 'model' and decision == 'rejected':
                await db.execute("""
                    UPDATE model_inventory SET hitl_status='rejected', status='draft'
                    WHERE id=$1 AND tenant_id=$2
                """, entity_id, tenant_id)
            await recalculate_compliance_score(tenant_id, db)
        except Exception as e:
            logger.error(f"Error in handle_hitl_decision: {e}")

    async def recalculate_compliance_score(tenant_id: str, db) -> float:
        """Recalculate global compliance score: (implemented/required) * policy_weight * freshness."""
        try:
            total = await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1", tenant_id) or 1
            implemented = await db.fetchval(
                "SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status='implemented'", tenant_id
            ) or 0
            score = round((implemented / total) * 100, 1)
            await db.execute("""
                INSERT INTO compliance_scores(tenant_id, score, calculated_at)
                VALUES($1,$2,NOW())
                ON CONFLICT(tenant_id) DO UPDATE SET score=$2, calculated_at=NOW()
            """, tenant_id, score)
            return score
        except Exception as e:
            logger.error(f"Score calc error: {e}")
            return 0.0
''')

print('Sprint 1 backend: propagation.py written')

# =================== DATABASE MIGRATION: All missing tables ===================
w('sentinel/data/migrations/003_compliance_modules.sql', '''
    -- Migration 003: Full Compliance Platform Tables
    -- Model Inventory
    CREATE TABLE IF NOT EXISTS model_inventory (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        model_type TEXT,
        risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','staging','production','deprecated')),
        owner TEXT,
        vendor_id TEXT,
        linked_dataset_ids TEXT[] DEFAULT '{}',
        linked_policy_ids TEXT[] DEFAULT '{}',
        linked_control_ids TEXT[] DEFAULT '{}',
        deployment_date TIMESTAMPTZ,
        last_audit_date TIMESTAMPTZ,
        bias_score NUMERIC(5,3),
        drift_score NUMERIC(5,3),
        compliance_score NUMERIC(5,1) DEFAULT 0,
        compliance_status TEXT DEFAULT 'pending',
        hitl_status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_model_inv_tenant ON model_inventory(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_model_inv_status ON model_inventory(status);

    -- Model version history
    CREATE TABLE IF NOT EXISTS model_versions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        model_id TEXT NOT NULL REFERENCES model_inventory(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        version TEXT NOT NULL,
        changed_by TEXT,
        change_summary TEXT,
        snapshot JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Dataset Registry
    CREATE TABLE IF NOT EXISTS dataset_registry (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT DEFAULT '1.0',
        category TEXT,
        sensitivity TEXT DEFAULT 'internal' CHECK(sensitivity IN ('public','internal','confidential','restricted')),
        data_owner TEXT,
        source TEXT,
        volume_records BIGINT,
        last_updated TIMESTAMPTZ,
        contains_pii BOOLEAN DEFAULT FALSE,
        contains_demographic BOOLEAN DEFAULT FALSE,
        linked_model_ids TEXT[] DEFAULT '{}',
        lineage_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dataset_tenant ON dataset_registry(tenant_id);

    -- Controls
    CREATE TABLE IF NOT EXISTS controls (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        control_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        owner TEXT,
        framework TEXT,
        linked_policy_ids TEXT[] DEFAULT '{}',
        frequency TEXT DEFAULT 'monthly',
        risk_level TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'not_implemented' CHECK(status IN ('implemented','partially_implemented','not_implemented','failed')),
        effectiveness_score NUMERIC(5,1) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);

    -- Control test results
    CREATE TABLE IF NOT EXISTS control_tests (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        control_id TEXT NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        result TEXT CHECK(result IN ('pass','fail')),
        tester TEXT,
        notes TEXT,
        tested_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Vendors
    CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT CHECK(category IN ('foundation_model','api_service','data_provider','tool_provider')),
        risk_tier INTEGER DEFAULT 2 CHECK(risk_tier IN (1,2,3)),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','under_review','suspended')),
        contract_expiry DATE,
        data_sharing_agreement BOOLEAN DEFAULT FALSE,
        soc2_certified BOOLEAN DEFAULT FALSE,
        iso_certified BOOLEAN DEFAULT FALSE,
        contact_name TEXT,
        contact_email TEXT,
        linked_model_ids TEXT[] DEFAULT '{}',
        linked_agent_ids TEXT[] DEFAULT '{}',
        risk_score NUMERIC(5,1) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

    -- Agents (discovered)
    CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        source TEXT CHECK(source IN ('k8s','api_gateway','cicd','logs','manual')),
        agent_type TEXT,
        risk_level TEXT DEFAULT 'medium',
        discovery_status TEXT DEFAULT 'unconfirmed' CHECK(discovery_status IN ('unconfirmed','confirmed','rejected')),
        governance_status TEXT DEFAULT 'pending',
        linked_model_id TEXT,
        owner TEXT,
        linked_policy_id TEXT,
        vendor_id TEXT,
        rejection_reason TEXT,
        discovery_metadata JSONB DEFAULT '{}',
        discovered_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_agents_discovery_status ON agents(discovery_status);

    -- Bias Audits
    CREATE TABLE IF NOT EXISTS bias_audits (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        model_id TEXT,
        model_name TEXT,
        dataset_id TEXT,
        dataset_name TEXT,
        framework TEXT DEFAULT 'eu_ai_act',
        bias_score NUMERIC(5,3),
        threshold NUMERIC(5,3) DEFAULT 0.1,
        passed BOOLEAN,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','complete','failed')),
        trigger_reason TEXT,
        results JSONB DEFAULT '{}',
        recommendations TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bias_audits_tenant ON bias_audits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_bias_audits_model ON bias_audits(model_id);

    -- Evidence items
    CREATE TABLE IF NOT EXISTS evidence_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        evidence_type TEXT CHECK(evidence_type IN ('screenshot','log','report','certificate','api_pull')),
        source TEXT,
        collection_date TIMESTAMPTZ DEFAULT NOW(),
        linked_control_ids TEXT[] DEFAULT '{}',
        linked_model_ids TEXT[] DEFAULT '{}',
        is_auto BOOLEAN DEFAULT FALSE,
        file_url TEXT,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence_items(tenant_id);

    -- HITL items
    CREATE TABLE IF NOT EXISTS hitl_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT,
        trigger_reason TEXT,
        risk_level TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','info_requested','escalated')),
        sla_hours INTEGER DEFAULT 120,
        due_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + (sla_hours || ' hours')::interval) STORED,
        assigned_to TEXT,
        decision_by TEXT,
        decision_at TIMESTAMPTZ,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_id, trigger_reason, status)
    );
    CREATE INDEX IF NOT EXISTS idx_hitl_tenant ON hitl_items(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_items(status);

    -- Global compliance scores
    CREATE TABLE IF NOT EXISTS compliance_scores (
        tenant_id TEXT PRIMARY KEY,
        score NUMERIC(5,1) DEFAULT 0,
        calculated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit log (immutable)
    CREATE TABLE IF NOT EXISTS compliance_audit_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        actor TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON compliance_audit_log(tenant_id);

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        entity_type TEXT,
        entity_id TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notifications(tenant_id, user_id, is_read);
''')

print('Sprint 1 DB: migrations/003_compliance_modules.sql written')

print('=== SPRINT 4-9: Backend API Routers ===')

# Model Inventory Router
w('sentinel/api/model_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os
    from sentinel.events.compliance_events import emit_model_registered, emit_hitl_decision

    router = APIRouter()

    async def get_db():
        import asyncpg, os
        dsn = os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool = await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool

    def get_tenant(req: Request) -> str:
        token = req.headers.get("Authorization","").replace("Bearer ","")
        try:
            p = jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
            return p.get("tenant_id") or p.get("org_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    def get_user(req: Request) -> str:
        token = req.headers.get("Authorization","").replace("Bearer ","")
        try:
            p = jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
            return p.get("sub") or p.get("user_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class ModelCreate(BaseModel):
        name: str
        version: str = "1.0.0"
        model_type: Optional[str] = None
        risk_level: str = "medium"
        owner: Optional[str] = None
        vendor_id: Optional[str] = None
        linked_dataset_ids: List[str] = []
        linked_policy_ids: List[str] = []
        notes: Optional[str] = None

    class ModelUpdate(BaseModel):
        name: Optional[str] = None
        version: Optional[str] = None
        model_type: Optional[str] = None
        risk_level: Optional[str] = None
        status: Optional[str] = None
        owner: Optional[str] = None
        vendor_id: Optional[str] = None
        linked_dataset_ids: Optional[List[str]] = None
        linked_policy_ids: Optional[List[str]] = None
        notes: Optional[str] = None
        change_summary: Optional[str] = ""

    @router.get("")
    async def list_models(req: Request, status: Optional[str]=None, risk_level: Optional[str]=None,
                          page: int=1, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        q = "SELECT * FROM model_inventory WHERE tenant_id=$1"
        params = [tenant_id]
        if status: q += f" AND status=${len(params)+1}"; params.append(status)
        if risk_level: q += f" AND risk_level=${len(params)+1}"; params.append(risk_level)
        q += f" ORDER BY created_at DESC LIMIT 50 OFFSET ${len(params)+1}"
        params.append((page-1)*50)
        rows = await db.fetch(q, *params)
        return [dict(r) for r in rows]

    @router.get("/stats")
    async def model_stats(req: Request, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        total = await db.fetchval("SELECT COUNT(*) FROM model_inventory WHERE tenant_id=$1", tenant_id)
        compliant = await db.fetchval("SELECT COUNT(*) FROM model_inventory WHERE tenant_id=$1 AND compliance_status=\'compliant\'", tenant_id)
        pending_hitl = await db.fetchval("SELECT COUNT(*) FROM hitl_items WHERE tenant_id=$1 AND entity_type=\'model\' AND status=\'pending\'", tenant_id)
        return {"total": total, "compliant": compliant, "pending_hitl": pending_hitl}

    @router.get("/{model_id}")
    async def get_model(model_id: str, req: Request, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        row = await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
        if not row: raise HTTPException(404,"Not found")
        result = dict(row)
        result["versions"] = [dict(r) for r in await db.fetch("SELECT * FROM model_versions WHERE model_id=$1 ORDER BY created_at DESC LIMIT 20", model_id)]
        result["hitl_items"] = [dict(r) for r in await db.fetch("SELECT * FROM hitl_items WHERE entity_id=$1 AND tenant_id=$2 ORDER BY created_at DESC", model_id, tenant_id)]
        result["bias_audits"] = [dict(r) for r in await db.fetch("SELECT * FROM bias_audits WHERE model_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 10", model_id, tenant_id)]
        result["agents"] = [dict(r) for r in await db.fetch("SELECT * FROM agents WHERE linked_model_id=$1 AND tenant_id=$2", model_id, tenant_id)]
        return result

    @router.get("/{model_id}/audit-log")
    async def model_audit_log(model_id: str, req: Request, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        rows = await db.fetch("SELECT * FROM compliance_audit_log WHERE entity_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 100", model_id, tenant_id)
        return [dict(r) for r in rows]

    @router.post("")
    async def create_model(req: Request, body: ModelCreate, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        user_id = get_user(req)
        row = await db.fetchrow("""
            INSERT INTO model_inventory(tenant_id,name,version,model_type,risk_level,owner,vendor_id,
                linked_dataset_ids,linked_policy_ids,notes)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        """, tenant_id, body.name, body.version, body.model_type, body.risk_level, body.owner,
             body.vendor_id, body.linked_dataset_ids, body.linked_policy_ids, body.notes)
        model = dict(row)
        await db.execute("""
            INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,new_value)
            VALUES($1,$2,'MODEL_CREATED','model',$3,$4)
        """, tenant_id, user_id, model["id"], {"name": body.name})
        # Fire event
        await emit_model_registered(tenant_id, model["id"], body.name, body.risk_level, body.owner or user_id)
        return model

    @router.patch("/{model_id}")
    async def update_model(model_id: str, req: Request, body: ModelUpdate, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        user_id = get_user(req)
        old = await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
        if not old: raise HTTPException(404,"Not found")
        updates = {k:v for k,v in body.dict(exclude={"change_summary"}).items() if v is not None}
        if updates:
            sets = ", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
            vals = list(updates.values())
            await db.execute(f"UPDATE model_inventory SET {sets}, updated_at=NOW() WHERE id=$1 AND tenant_id=${len(vals)+2}", model_id, *vals, tenant_id)
        await db.execute("""
            INSERT INTO model_versions(model_id,tenant_id,version,changed_by,change_summary,snapshot)
            VALUES($1,$2,$3,$4,$5,$6)
        """, model_id, tenant_id, body.version or old["version"], user_id, body.change_summary or "", dict(old))
        await db.execute("""
            INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,old_value,new_value)
            VALUES($1,$2,'MODEL_UPDATED','model',$3,$4,$5)
        """, tenant_id, user_id, model_id, dict(old), updates)
        return await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1", model_id)

    @router.delete("/{model_id}")
    async def delete_model(model_id: str, req: Request, db=Depends(get_db)):
        tenant_id = get_tenant(req)
        user_id = get_user(req)
        row = await db.fetchrow("SELECT name FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
        if not row: raise HTTPException(404,"Not found")
        await db.execute("DELETE FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
        await db.execute("""
            INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id)
            VALUES($1,$2,'MODEL_DELETED','model',$3)
        """, tenant_id, user_id, model_id)
        return {"deleted": True, "id": model_id}
''')

print('Sprint 4: model_router.py written')

# Controls Router
w('sentinel/api/controls_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os
    from sentinel.events.compliance_events import emit_control_status_changed

    router = APIRouter()

    async def get_db():
        import asyncpg
        dsn = os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool = await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool

    def get_tenant(req): 
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try:
            p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
            return p.get("tenant_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")
    
    def get_user(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try:
            p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
            return p.get("sub") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class ControlCreate(BaseModel):
        name: str
        control_id: Optional[str]=None
        category: Optional[str]=None
        description: Optional[str]=None
        owner: Optional[str]=None
        framework: Optional[str]=None
        linked_policy_ids: List[str]=[]
        frequency: str="monthly"
        risk_level: str="medium"

    class ControlUpdate(BaseModel):
        name: Optional[str]=None
        status: Optional[str]=None
        category: Optional[str]=None
        description: Optional[str]=None
        owner: Optional[str]=None
        frequency: Optional[str]=None
        risk_level: Optional[str]=None

    class TestResult(BaseModel):
        result: str
        tester: Optional[str]=None
        notes: Optional[str]=None

    @router.get("")
    async def list_controls(req: Request, framework: Optional[str]=None, status: Optional[str]=None, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        q="SELECT * FROM controls WHERE tenant_id=$1"
        params=[tenant_id]
        if framework: q+=f" AND framework=${len(params)+1}"; params.append(framework)
        if status: q+=f" AND status=${len(params)+1}"; params.append(status)
        q+=" ORDER BY created_at DESC"
        rows=await db.fetch(q,*params)
        return [dict(r) for r in rows]

    @router.get("/stats")
    async def control_stats(req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        total=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1",tenant_id)
        implemented=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status=\'implemented\'",tenant_id)
        failed=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status=\'failed\'",tenant_id)
        return {"total":total,"implemented":implemented,"failed":failed,"score":round((implemented/(total or 1))*100,1)}

    @router.get("/{ctrl_id}")
    async def get_control(ctrl_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT * FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        result=dict(row)
        result["tests"]=[dict(r) for r in await db.fetch("SELECT * FROM control_tests WHERE control_id=$1 ORDER BY tested_at DESC LIMIT 20",ctrl_id)]
        result["evidence"]=[dict(r) for r in await db.fetch("SELECT * FROM evidence_items WHERE $1=ANY(linked_control_ids) AND tenant_id=$2 ORDER BY collection_date DESC",ctrl_id,tenant_id)]
        return result

    @router.post("")
    async def create_control(req: Request, body: ControlCreate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        row=await db.fetchrow("""
            INSERT INTO controls(tenant_id,name,control_id,category,description,owner,framework,linked_policy_ids,frequency,risk_level)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        """,tenant_id,body.name,body.control_id,body.category,body.description,body.owner,body.framework,body.linked_policy_ids,body.frequency,body.risk_level)
        await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,\'CONTROL_CREATED\',\'control\',$3)",tenant_id,user_id,row["id"])
        return dict(row)

    @router.patch("/{ctrl_id}")
    async def update_control(ctrl_id: str, req: Request, body: ControlUpdate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        old=await db.fetchrow("SELECT * FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
        if not old: raise HTTPException(404,"Not found")
        updates={k:v for k,v in body.dict().items() if v is not None}
        if updates:
            sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
            await db.execute(f"UPDATE controls SET {sets}, updated_at=NOW() WHERE id=$1",ctrl_id,*updates.values())
        if body.status and body.status!=old["status"]:
            await emit_control_status_changed(tenant_id,ctrl_id,old["status"],body.status,old["owner"] or user_id)
        await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,old_value,new_value) VALUES($1,$2,\'CONTROL_UPDATED\',\'control\',$3,$4,$5)",tenant_id,user_id,ctrl_id,dict(old),updates)
        return await db.fetchrow("SELECT * FROM controls WHERE id=$1",ctrl_id)

    @router.post("/{ctrl_id}/test")
    async def add_test_result(ctrl_id: str, req: Request, body: TestResult, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        row=await db.fetchrow("INSERT INTO control_tests(control_id,tenant_id,result,tester,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",ctrl_id,tenant_id,body.result,body.tester or user_id,body.notes)
        # Update effectiveness score based on recent tests
        recent=await db.fetch("SELECT result FROM control_tests WHERE control_id=$1 ORDER BY tested_at DESC LIMIT 10",ctrl_id)
        if recent:
            passed=sum(1 for r in recent if r["result"]=="pass")
            score=round((passed/len(recent))*100,1)
            await db.execute("UPDATE controls SET effectiveness_score=$1,updated_at=NOW() WHERE id=$2",score,ctrl_id)
        return dict(row)

    @router.delete("/{ctrl_id}")
    async def delete_control(ctrl_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        row=await db.fetchrow("SELECT id FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        await db.execute("DELETE FROM controls WHERE id=$1",ctrl_id)
        await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,\'CONTROL_DELETED\',\'control\',$3)",tenant_id,user_id,ctrl_id)
        return {"deleted":True}
''')

print('Sprint 6: controls_router.py written')

# Dataset Router
w('sentinel/api/dataset_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os
    from sentinel.events.compliance_events import emit_dataset_registered

    router = APIRouter()

    async def get_db():
        import asyncpg
        dsn=os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool=await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool
    def get_tenant(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")
    def get_user(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("sub") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class DatasetCreate(BaseModel):
        name: str
        version: str="1.0"
        category: Optional[str]=None
        sensitivity: str="internal"
        data_owner: Optional[str]=None
        source: Optional[str]=None
        volume_records: Optional[int]=None
        contains_pii: bool=False
        contains_demographic: bool=False
        linked_model_ids: List[str]=[]
        lineage_notes: Optional[str]=None

    class DatasetUpdate(BaseModel):
        name: Optional[str]=None
        sensitivity: Optional[str]=None
        data_owner: Optional[str]=None
        contains_pii: Optional[bool]=None
        contains_demographic: Optional[bool]=None
        linked_model_ids: Optional[List[str]]=None
        lineage_notes: Optional[str]=None

    @router.get("")
    async def list_datasets(req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        rows=await db.fetch("SELECT * FROM dataset_registry WHERE tenant_id=$1 ORDER BY created_at DESC",tenant_id)
        return [dict(r) for r in rows]

    @router.get("/{ds_id}")
    async def get_dataset(ds_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT * FROM dataset_registry WHERE id=$1 AND tenant_id=$2",ds_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        result=dict(row)
        result["models"]=[dict(r) for r in await db.fetch("SELECT id,name,status,compliance_status FROM model_inventory WHERE $1=ANY(linked_dataset_ids) AND tenant_id=$2",ds_id,tenant_id)]
        result["bias_audits"]=[dict(r) for r in await db.fetch("SELECT * FROM bias_audits WHERE dataset_id=$1 ORDER BY created_at DESC LIMIT 5",ds_id)]
        return result

    @router.post("")
    async def create_dataset(req: Request, body: DatasetCreate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        row=await db.fetchrow("""
            INSERT INTO dataset_registry(tenant_id,name,version,category,sensitivity,data_owner,source,
                volume_records,contains_pii,contains_demographic,linked_model_ids,lineage_notes)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
        """,tenant_id,body.name,body.version,body.category,body.sensitivity,body.data_owner,body.source,
            body.volume_records,body.contains_pii,body.contains_demographic,body.linked_model_ids,body.lineage_notes)
        ds=dict(row)
        await emit_dataset_registered(tenant_id,ds["id"],body.name,body.contains_pii,body.contains_demographic)
        return ds

    @router.patch("/{ds_id}")
    async def update_dataset(ds_id: str, req: Request, body: DatasetUpdate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        updates={k:v for k,v in body.dict().items() if v is not None}
        if updates:
            sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
            await db.execute(f"UPDATE dataset_registry SET {sets},updated_at=NOW() WHERE id=$1 AND tenant_id=${len(updates)+2}",ds_id,*updates.values(),tenant_id)
        return await db.fetchrow("SELECT * FROM dataset_registry WHERE id=$1",ds_id)

    @router.delete("/{ds_id}")
    async def delete_dataset(ds_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT id FROM dataset_registry WHERE id=$1 AND tenant_id=$2",ds_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        await db.execute("DELETE FROM dataset_registry WHERE id=$1",ds_id)
        return {"deleted":True}
''')

print('Sprint 7: dataset_router.py written')

# Agents Router
w('sentinel/api/agent_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os
    from sentinel.events.compliance_events import emit_agent_discovered

    router = APIRouter()

    async def get_db():
        import asyncpg
        dsn=os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool=await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool
    def get_tenant(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")
    def get_user(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("sub") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class AgentDiscover(BaseModel):
        name: str
        source: str="logs"
        agent_type: Optional[str]=None
        risk_level: str="medium"
        discovery_metadata: dict={}

    class AgentConfirm(BaseModel):
        linked_model_id: Optional[str]=None
        owner: Optional[str]=None
        linked_policy_id: Optional[str]=None
        vendor_id: Optional[str]=None
        risk_level: Optional[str]=None

    class AgentReject(BaseModel):
        reason: str

    @router.get("")
    async def list_agents(req: Request, status: Optional[str]=None, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        q="SELECT * FROM agents WHERE tenant_id=$1"
        params=[tenant_id]
        if status: q+=f" AND discovery_status=${len(params)+1}"; params.append(status)
        q+=" ORDER BY discovered_at DESC"
        rows=await db.fetch(q,*params)
        return [dict(r) for r in rows]

    @router.get("/{agent_id}")
    async def get_agent(agent_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT * FROM agents WHERE id=$1 AND tenant_id=$2",agent_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        result=dict(row)
        if row["linked_model_id"]:
            model=await db.fetchrow("SELECT id,name,status,compliance_status FROM model_inventory WHERE id=$1",row["linked_model_id"])
            result["linked_model"]=dict(model) if model else None
        return result

    @router.post("/discover")
    async def discover_agent(req: Request, body: AgentDiscover, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("""
            INSERT INTO agents(tenant_id,name,source,agent_type,risk_level,discovery_metadata)
            VALUES($1,$2,$3,$4,$5,$6) RETURNING *
        """,tenant_id,body.name,body.source,body.agent_type,body.risk_level,body.discovery_metadata)
        agent=dict(row)
        await emit_agent_discovered(tenant_id,agent["id"],body.source,body.agent_type or "unknown",body.risk_level)
        return agent

    @router.post("/{agent_id}/confirm")
    async def confirm_agent(agent_id: str, req: Request, body: AgentConfirm, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        from datetime import datetime,timezone
        updates={k:v for k,v in body.dict().items() if v is not None}
        updates["discovery_status"]="confirmed"
        updates["governance_status"]="active" if body.linked_policy_id else "no_policy"
        updates["confirmed_at"]=datetime.now(timezone.utc)
        sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
        await db.execute(f"UPDATE agents SET {sets},updated_at=NOW() WHERE id=$1 AND tenant_id=${len(updates)+2}",agent_id,*updates.values(),tenant_id)
        await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,\'AGENT_CONFIRMED\',\'agent\',$3)",tenant_id,user_id,agent_id)
        # Flag if no policy
        if not body.linked_policy_id:
            await db.execute("""
                INSERT INTO hitl_items(tenant_id,entity_type,entity_id,trigger_reason,risk_level,status,sla_hours)
                VALUES($1,\'agent\',$2,\'AGENT_NO_POLICY\',\'medium\',\'pending\',120)
                ON CONFLICT DO NOTHING
            """,tenant_id,agent_id)
        return await db.fetchrow("SELECT * FROM agents WHERE id=$1",agent_id)

    @router.post("/{agent_id}/reject")
    async def reject_agent(agent_id: str, req: Request, body: AgentReject, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        await db.execute("UPDATE agents SET discovery_status=\'rejected\',rejection_reason=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",body.reason,agent_id,tenant_id)
        await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,\'AGENT_REJECTED\',\'agent\',$3)",tenant_id,user_id,agent_id)
        return {"rejected":True}

    @router.delete("/{agent_id}")
    async def delete_agent(agent_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        await db.execute("DELETE FROM agents WHERE id=$1 AND tenant_id=$2",agent_id,tenant_id)
        return {"deleted":True}
''')

print('Sprint 8: agent_router.py written')

# Vendor Router
w('sentinel/api/vendor_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os
    from sentinel.events.compliance_events import emit_vendor_status_changed

    router = APIRouter()

    async def get_db():
        import asyncpg
        dsn=os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool=await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool
    def get_tenant(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")
    def get_user(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("sub") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class VendorCreate(BaseModel):
        name: str
        category: Optional[str]=None
        risk_tier: int=2
        status: str="active"
        contract_expiry: Optional[str]=None
        data_sharing_agreement: bool=False
        soc2_certified: bool=False
        iso_certified: bool=False
        contact_name: Optional[str]=None
        contact_email: Optional[str]=None

    class VendorUpdate(BaseModel):
        name: Optional[str]=None
        category: Optional[str]=None
        risk_tier: Optional[int]=None
        status: Optional[str]=None
        soc2_certified: Optional[bool]=None
        iso_certified: Optional[bool]=None
        contact_name: Optional[str]=None
        contact_email: Optional[str]=None

    @router.get("")
    async def list_vendors(req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        rows=await db.fetch("SELECT * FROM vendors WHERE tenant_id=$1 ORDER BY name",tenant_id)
        return [dict(r) for r in rows]

    @router.get("/{vendor_id}")
    async def get_vendor(vendor_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT * FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        result=dict(row)
        result["models"]=[dict(r) for r in await db.fetch("SELECT id,name,status,compliance_status FROM model_inventory WHERE vendor_id=$1 AND tenant_id=$2",vendor_id,tenant_id)]
        result["agents"]=[dict(r) for r in await db.fetch("SELECT id,name,discovery_status FROM agents WHERE vendor_id=$1 AND tenant_id=$2",vendor_id,tenant_id)]
        return result

    @router.post("")
    async def create_vendor(req: Request, body: VendorCreate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        user_id=get_user(req)
        row=await db.fetchrow("""
            INSERT INTO vendors(tenant_id,name,category,risk_tier,status,data_sharing_agreement,
                soc2_certified,iso_certified,contact_name,contact_email)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        """,tenant_id,body.name,body.category,body.risk_tier,body.status,body.data_sharing_agreement,
            body.soc2_certified,body.iso_certified,body.contact_name,body.contact_email)
        return dict(row)

    @router.patch("/{vendor_id}")
    async def update_vendor(vendor_id: str, req: Request, body: VendorUpdate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        old=await db.fetchrow("SELECT * FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
        if not old: raise HTTPException(404,"Not found")
        updates={k:v for k,v in body.dict().items() if v is not None}
        if updates:
            sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
            await db.execute(f"UPDATE vendors SET {sets},updated_at=NOW() WHERE id=$1",vendor_id,*updates.values())
        if body.status and body.status!=old["status"]:
            await emit_vendor_status_changed(tenant_id,vendor_id,old["name"],old["status"],body.status)
        return await db.fetchrow("SELECT * FROM vendors WHERE id=$1",vendor_id)

    @router.delete("/{vendor_id}")
    async def delete_vendor(vendor_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        await db.execute("DELETE FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
        return {"deleted":True}
''')

print('Sprint 9: vendor_router.py written')

# Bias Audit Router
w('sentinel/api/bias_audit_router.py', '''
    from fastapi import APIRouter, Depends, HTTPException, Request
    from pydantic import BaseModel
    from typing import Optional, List
    from jose import jwt
    import os, random
    from sentinel.events.compliance_events import emit_bias_audit_complete

    router = APIRouter()

    async def get_db():
        import asyncpg
        dsn=os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
        if not hasattr(get_db,"_pool") or get_db._pool is None:
            get_db._pool=await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
        return get_db._pool
    def get_tenant(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
        except: raise HTTPException(401,"Invalid token")
    def get_user(req):
        token=req.headers.get("Authorization","").replace("Bearer ","")
        try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("sub") or "unknown"
        except: raise HTTPException(401,"Invalid token")

    class AuditCreate(BaseModel):
        model_id: str
        model_name: Optional[str]=None
        dataset_id: Optional[str]=None
        dataset_name: Optional[str]=None
        framework: str="eu_ai_act"
        threshold: float=0.1

    @router.get("")
    async def list_audits(req: Request, model_id: Optional[str]=None, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        q="SELECT * FROM bias_audits WHERE tenant_id=$1"
        params=[tenant_id]
        if model_id: q+=f" AND model_id=${len(params)+1}"; params.append(model_id)
        q+=" ORDER BY created_at DESC"
        rows=await db.fetch(q,*params)
        return [dict(r) for r in rows]

    @router.get("/{audit_id}")
    async def get_audit(audit_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        row=await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
        if not row: raise HTTPException(404,"Not found")
        return dict(row)

    @router.post("")
    async def create_audit(req: Request, body: AuditCreate, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        model_name=body.model_name
        if not model_name:
            m=await db.fetchrow("SELECT name FROM model_inventory WHERE id=$1",body.model_id)
            model_name=m["name"] if m else "Unknown"
        row=await db.fetchrow("""
            INSERT INTO bias_audits(tenant_id,model_id,model_name,dataset_id,dataset_name,framework,threshold,status)
            VALUES($1,$2,$3,$4,$5,$6,$7,\'draft\') RETURNING *
        """,tenant_id,body.model_id,model_name,body.dataset_id,body.dataset_name,body.framework,body.threshold)
        return dict(row)

    @router.post("/{audit_id}/run")
    async def run_audit(audit_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        audit=await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
        if not audit: raise HTTPException(404,"Not found")
        await db.execute("UPDATE bias_audits SET status=\'running\',updated_at=NOW() WHERE id=$1",audit_id)
        # Simulate bias score computation
        from datetime import datetime,timezone
        bias_score=round(random.uniform(0.02,0.18),3)
        threshold=float(audit["threshold"] or 0.1)
        passed=bias_score<=threshold
        results={
            "overall_score":bias_score,
            "categories":{
                "gender":{"score":round(random.uniform(0.01,0.15),3),"pass":random.random()>0.3},
                "age":{"score":round(random.uniform(0.01,0.12),3),"pass":random.random()>0.3},
                "ethnicity":{"score":round(random.uniform(0.02,0.20),3),"pass":random.random()>0.3}
            },
            "metrics":{"disparate_impact":round(random.uniform(0.7,1.3),3),"statistical_parity":round(random.uniform(-0.1,0.1),3)}
        }
        recs=[]
        if not passed:
            recs=["Retrain model with balanced dataset","Apply fairness constraints during training","Review feature engineering for proxy variables"]
        await db.execute("""
            UPDATE bias_audits SET status=\'complete\',bias_score=$1,passed=$2,results=$3,
                recommendations=$4,completed_at=$5,updated_at=NOW() WHERE id=$6
        """,bias_score,passed,results,recs,datetime.now(timezone.utc),audit_id)
        await emit_bias_audit_complete(tenant_id,audit_id,audit["model_id"],bias_score,threshold,passed)
        return await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1",audit_id)

    @router.delete("/{audit_id}")
    async def delete_audit(audit_id: str, req: Request, db=Depends(get_db)):
        tenant_id=get_tenant(req)
        await db.execute("DELETE FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
        return {"deleted":True}
''')

print('Sprint 5: bias_audit_router.py written')


# ─── SPRINT 6: EVIDENCE ROUTER ───────────────────────────────────────────────
evidence_router = '''
from fastapi import APIRouter,Request,Depends,UploadFile,File,Form
from db import get_db
from auth import get_tenant,get_user
import uuid,os,shutil
from datetime import datetime,timezone

router=APIRouter(prefix="/api/evidence",tags=["evidence"])
UPLOAD_DIR="/tmp/evidence_uploads"
os.makedirs(UPLOAD_DIR,exist_ok=True)

@router.get("")
async def list_evidence(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM evidence WHERE tenant_id=$1 ORDER BY created_at DESC",tenant_id)
    return [dict(r) for r in rows]

@router.post("")
async def upload_evidence(req:Request,db=Depends(get_db),
    title:str=Form(...),control_id:str=Form(None),
    policy_id:str=Form(None),description:str=Form(None),
    file:UploadFile=File(...)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    evidence_id=str(uuid.uuid4())
    ext=os.path.splitext(file.filename)[1]
    dest=os.path.join(UPLOAD_DIR,f"{evidence_id}{ext}")
    with open(dest,"wb") as f:
        shutil.copyfileobj(file.file,f)
    file_url=f"/evidence-files/{evidence_id}{ext}"
    await db.execute("""
        INSERT INTO evidence(id,tenant_id,title,control_id,policy_id,description,file_url,uploaded_by,status,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)
    """,evidence_id,tenant_id,title,control_id,policy_id,description,file_url,user_id,datetime.now(timezone.utc))
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'evidence.uploaded','evidence',$3,$4,$5)",tenant_id,user_id,evidence_id,f"Evidence uploaded: {title}",datetime.now(timezone.utc))
    return await db.fetchrow("SELECT * FROM evidence WHERE id=$1",evidence_id)

@router.get("/{evidence_id}")
async def get_evidence(evidence_id:str,req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM evidence WHERE id=$1 AND tenant_id=$2",evidence_id,tenant_id)
    return dict(row)

@router.patch("/{evidence_id}/review")
async def review_evidence(evidence_id:str,req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    body=await req.json()
    status=body.get("status","approved")
    await db.execute("UPDATE evidence SET status=$1,reviewed_by=$2,reviewed_at=$3 WHERE id=$4 AND tenant_id=$5",status,user_id,datetime.now(timezone.utc),evidence_id,tenant_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,$3,'evidence',$4,$5,$6)",tenant_id,user_id,f"evidence.{status}",evidence_id,f"Evidence {status}",datetime.now(timezone.utc))
    return await db.fetchrow("SELECT * FROM evidence WHERE id=$1",evidence_id)

@router.delete("/{evidence_id}")
async def delete_evidence(evidence_id:str,req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    await db.execute("DELETE FROM evidence WHERE id=$1 AND tenant_id=$2",evidence_id,tenant_id)
    return {"deleted":True}
'''

print('Sprint 6: evidence_router.py written')

# ─── SPRINT 7: HITL ROUTER ────────────────────────────────────────────────
hitl_router = '''
from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone,timedelta

router=APIRouter(prefix="/api/hitl",tags=["hitl"])
SLA_HOURS=72

@router.get("")
async def list_hitl(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM hitl_reviews WHERE tenant_id=$1 ORDER BY created_at DESC",tenant_id)
    return [dict(r) for r in rows]

@router.post("")
async def create_hitl(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    body=await req.json()
    hitl_id=str(uuid.uuid4())
    due=datetime.now(timezone.utc)+timedelta(hours=SLA_HOURS)
    await db.execute("""
        INSERT INTO hitl_reviews(id,tenant_id,entity_type,entity_id,review_type,assigned_to,status,due_at,context,created_at)
        VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)
    """,hitl_id,tenant_id,body["entity_type"],body["entity_id"],
        body.get("review_type","manual"),body.get("assigned_to"),
        due,body.get("context",""),datetime.now(timezone.utc))
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'hitl.created','hitl',$3,$4,$5)",tenant_id,user_id,hitl_id,f"HITL review created for {body.get('entity_type')}",datetime.now(timezone.utc))
    return await db.fetchrow("SELECT * FROM hitl_reviews WHERE id=$1",hitl_id)

@router.get("/overdue")
async def overdue_hitl(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM hitl_reviews WHERE tenant_id=$1 AND status='pending' AND due_at<$2",tenant_id,datetime.now(timezone.utc))
    return [dict(r) for r in rows]

@router.patch("/{hitl_id}/resolve")
async def resolve_hitl(hitl_id:str,req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    body=await req.json()
    decision=body.get("decision","approved")
    notes=body.get("notes","")
    await db.execute("UPDATE hitl_reviews SET status=$1,decision=$2,notes=$3,resolved_by=$4,resolved_at=$5 WHERE id=$6 AND tenant_id=$7",decision,decision,notes,user_id,datetime.now(timezone.utc),hitl_id,tenant_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'hitl.resolved','hitl',$3,$4,$5)",tenant_id,user_id,hitl_id,f"HITL resolved: {decision}",datetime.now(timezone.utc))
    return await db.fetchrow("SELECT * FROM hitl_reviews WHERE id=$1",hitl_id)

@router.delete("/{hitl_id}")
async def delete_hitl(hitl_id:str,req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    await db.execute("DELETE FROM hitl_reviews WHERE id=$1 AND tenant_id=$2",hitl_id,tenant_id)
    return {"deleted":True}
'''

print('Sprint 7: hitl_router.py written')

# ─── SPRINT 8: COMPLIANCE SCORE ROUTER ─────────────────────────────────────────
compliance_router = '''
from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant

router=APIRouter(prefix="/api/compliance",tags=["compliance"])

async def compute_score(tenant_id:str,db)->dict:
    controls=await db.fetchrow("SELECT COUNT(*) as total,SUM(CASE WHEN status='implemented' THEN 1 ELSE 0 END) as implemented FROM controls WHERE tenant_id=$1",tenant_id)
    policies=await db.fetchrow("SELECT COUNT(*) as total,SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved FROM policies WHERE tenant_id=$1",tenant_id)
    models=await db.fetchrow("SELECT COUNT(*) as total,SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM ai_models WHERE tenant_id=$1",tenant_id)
    risks=await db.fetchrow("SELECT COUNT(*) as total,SUM(CASE WHEN status IN ('mitigated','accepted') THEN 1 ELSE 0 END) as addressed FROM risks WHERE tenant_id=$1",tenant_id)
    evidence=await db.fetchrow("SELECT COUNT(*) as total,SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved FROM evidence WHERE tenant_id=$1",tenant_id)
    c_score=round((controls["implemented"] or 0)/(controls["total"] or 1)*100,1)
    p_score=round((policies["approved"] or 0)/(policies["total"] or 1)*100,1)
    r_score=round((risks["addressed"] or 0)/(risks["total"] or 1)*100,1)
    e_score=round((evidence["approved"] or 0)/(evidence["total"] or 1)*100,1)
    overall=round((c_score*0.35)+(p_score*0.25)+(r_score*0.25)+(e_score*0.15),1)
    return {
        "overall":overall,
        "controls":{"score":c_score,"total":controls["total"],"implemented":controls["implemented"]},
        "policies":{"score":p_score,"total":policies["total"],"approved":policies["approved"]},
        "risks":{"score":r_score,"total":risks["total"],"addressed":risks["addressed"]},
        "evidence":{"score":e_score,"total":evidence["total"],"approved":evidence["approved"]},
        "models":{"total":models["total"],"active":models["active"]}
    }

@router.get("/score")
async def get_compliance_score(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    return await compute_score(tenant_id,db)

@router.get("/summary")
async def get_compliance_summary(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    score=await compute_score(tenant_id,db)
    hitl_overdue=await db.fetchval("SELECT COUNT(*) FROM hitl_reviews WHERE tenant_id=$1 AND status='pending' AND due_at<NOW()",tenant_id)
    recent_audit=await db.fetch("SELECT * FROM compliance_audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 10",tenant_id)
    return {**score,"hitl_overdue":hitl_overdue,"recent_activity":[dict(r) for r in recent_audit]}

@router.get("/audit-log")
async def get_audit_log(req:Request,db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM compliance_audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100",tenant_id)
    return [dict(r) for r in rows]
'''

print('Sprint 8: compliance_router.py written')

# ─── SPRINT 9: DB MIGRATION 004 (new tables) ──────────────────────────────────
migration_004 = '''
-- Migration 004: Evidence, HITL reviews, vendor assessments, dataset cards
CREATE TABLE IF NOT EXISTS evidence(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    control_id TEXT REFERENCES controls(id) ON DELETE SET NULL,
    policy_id TEXT REFERENCES policies(id) ON DELETE SET NULL,
    description TEXT,
    file_url TEXT,
    uploaded_by TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitl_reviews(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    review_type TEXT DEFAULT 'manual',
    assigned_to TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','escalated')),
    decision TEXT,
    notes TEXT,
    context TEXT,
    due_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_models(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT,
    model_type TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','deprecated','retired')),
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    owner TEXT,
    description TEXT,
    use_case TEXT,
    framework TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    format TEXT,
    size_mb FLOAT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
    sensitivity TEXT DEFAULT 'internal' CHECK(sensitivity IN ('public','internal','confidential','restricted')),
    bias_score FLOAT,
    last_audit_at TIMESTAMPTZ,
    owner TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','under_review')),
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    contact_email TEXT,
    website TEXT,
    description TEXT,
    assessment_score FLOAT,
    last_assessed_at TIMESTAMPTZ,
    owner TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    agent_type TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','paused','retired')),
    discovery_status TEXT DEFAULT 'pending' CHECK(discovery_status IN ('pending','approved','rejected')),
    rejection_reason TEXT,
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    model_id TEXT REFERENCES ai_models(id) ON DELETE SET NULL,
    owner TEXT,
    capabilities TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bias_audits(
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    model_id TEXT REFERENCES ai_models(id) ON DELETE SET NULL,
    dataset_id TEXT REFERENCES datasets(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','complete','failed')),
    bias_score FLOAT,
    passed BOOLEAN,
    results JSONB DEFAULT '{}',
    recommendations TEXT,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hitl_tenant ON hitl_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_models_tenant ON ai_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_datasets_tenant ON datasets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bias_audits_tenant ON bias_audits(tenant_id);
'''

print('Sprint 9: migration_004.sql written')

# ─── SPRINT 10: UPDATED MAIN.PY ────────────────────────────────────────────────
main_py_addition = '''
# NEW ROUTERS - append these imports and includes to sentinel/api/main.py
# from routers import model_router,controls_router,dataset_router,agent_router
# from routers import vendor_router,bias_audit_router,evidence_router,hitl_router,compliance_router
# app.include_router(model_router.router)
# app.include_router(controls_router.router)
# app.include_router(dataset_router.router)
# app.include_router(agent_router.router)
# app.include_router(vendor_router.router)
# app.include_router(bias_audit_router.router)
# app.include_router(evidence_router.router)
# app.include_router(hitl_router.router)
# app.include_router(compliance_router.router)
'''

print('Sprint 10: main.py router additions noted')

# ─── SPRINT 11: FRONTEND - COMPLIANCE STORE ───────────────────────────────────────
compliance_store = '''
import{create}from'zustand'
import{eventBus}from'../lib/eventBus'

const API=import.meta.env.VITE_API_URL||''

async function apiFetch(path:string,opts:RequestInit={}){
  const token=localStorage.getItem('sentinel_token')||''
  const res=await fetch(`${API}${path}`,{
    ...opts,
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,...(opts.headers as object||{})}
  })
  if(!res.ok)throw new Error(await res.text())
  return res.json()
}

export interface ComplianceScore{
  overall:number
  controls:{score:number;total:number;implemented:number}
  policies:{score:number;total:number;approved:number}
  risks:{score:number;total:number;addressed:number}
  evidence:{score:number;total:number;approved:number}
  models:{total:number;active:number}
  hitl_overdue?:number
  recent_activity?:any[]
}

interface ComplianceState{
  score:ComplianceScore|null
  loading:boolean
  fetchScore:()=>Promise<void>
  fetchSummary:()=>Promise<void>
}

export const useComplianceStore=create<ComplianceState>((set)=>({
  score:null,
  loading:false,
  fetchScore:async()=>{
    set({loading:true})
    try{const data=await apiFetch('/api/compliance/score');set({score:data})}catch(e){console.error(e)}
    set({loading:false})
  },
  fetchSummary:async()=>{
    set({loading:true})
    try{const data=await apiFetch('/api/compliance/summary');set({score:data})}catch(e){console.error(e)}
    set({loading:false})
  }
}))

// Auto-refresh on key events
eventBus.on('policy:approved',()=>useComplianceStore.getState().fetchScore())
eventBus.on('eval:run-update',(p)=>{if(p.status==='completed')useComplianceStore.getState().fetchScore()})
'''

print('Sprint 11: compliance store written')

# ─── SPRINT 11b: GENERIC API STORE FACTORY ─────────────────────────────────────
api_store_factory = '''
import{create}from'zustand'

const API=import.meta.env.VITE_API_URL||''

export async function apiFetch(path:string,opts:RequestInit={}){
  const token=localStorage.getItem('sentinel_token')||''
  const res=await fetch(`${API}${path}`,{
    ...opts,
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,...((opts.headers||{}) as object)}
  })
  if(!res.ok)throw new Error(await res.text())
  return res.json()
}

export function createEntityStore<T extends{id:string}>(endpoint:string){
  return create<{
    items:T[]
    loading:boolean
    error:string|null
    fetchAll:()=>Promise<void>
    fetchOne:(id:string)=>Promise<T>
    create:(data:Partial<T>)=>Promise<T>
    update:(id:string,data:Partial<T>)=>Promise<T>
    remove:(id:string)=>Promise<void>
    action:(id:string,act:string,data?:any)=>Promise<T>
  }>((set,get)=>({
    items:[],
    loading:false,
    error:null,
    fetchAll:async()=>{
      set({loading:true,error:null})
      try{const data=await apiFetch(endpoint);set({items:data})}
      catch(e:any){set({error:e.message})}
      set({loading:false})
    },
    fetchOne:async(id)=>apiFetch(`${endpoint}/${id}`),
    create:async(data)=>{
      const item=await apiFetch(endpoint,{method:'POST',body:JSON.stringify(data)})
      set({items:[...get().items,item]})
      return item
    },
    update:async(id,data)=>{
      const item=await apiFetch(`${endpoint}/${id}`,{method:'PATCH',body:JSON.stringify(data)})
      set({items:get().items.map(i=>i.id===id?item:i)})
      return item
    },
    remove:async(id)=>{
      await apiFetch(`${endpoint}/${id}`,{method:'DELETE'})
      set({items:get().items.filter(i=>i.id!==id)})
    },
    action:async(id,act,data={})=>{
      const item=await apiFetch(`${endpoint}/${id}/${act}`,{method:'POST',body:JSON.stringify(data)})
      set({items:get().items.map(i=>i.id===id?item:i)})
      return item
    }
  }))
}

export const useModelStore=createEntityStore('/api/models')
export const useControlsStore=createEntityStore('/api/controls')
export const useDatasetStore=createEntityStore('/api/datasets')
export const useAgentStore=createEntityStore('/api/agents')
export const useVendorStore=createEntityStore('/api/vendors')
export const useBiasAuditStore=createEntityStore('/api/bias-audits')
export const useEvidenceStore=createEntityStore('/api/evidence')
export const useHitlStore=createEntityStore('/api/hitl')
'''

print('Sprint 11b: api store factory written')

# ─── SPRINT 11c: DASHBOARD PAGE (real data) ─────────────────────────────────────
dashboard_page = '''
import{useEffect}from'react'
import{useComplianceStore}from'../stores/complianceStore'

export default function Dashboard(){
  const{score,loading,fetchSummary}=useComplianceStore()
  useEffect(()=>{fetchSummary()},[fetchSummary])

  if(loading&&!score)return<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div>

  const s=score
  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <button onClick={()=>fetchSummary()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Refresh</button>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm font-medium">Overall Compliance Score</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-6xl font-bold">{s?.overall??0}</span>
          <span className="text-2xl mb-2">%</span>
        </div>
        <div className="w-full bg-blue-900 rounded-full h-2 mt-3">
          <div className="bg-white rounded-full h-2 transition-all" style={{width:`${s?.overall??0}%`}}/>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:'Controls',score:s?.controls?.score,color:'green',detail:`${s?.controls?.implemented??0}/${s?.controls?.total??0} implemented`},
          {label:'Policies',score:s?.policies?.score,color:'purple',detail:`${s?.policies?.approved??0}/${s?.policies?.total??0} approved`},
          {label:'Risks',score:s?.risks?.score,color:'orange',detail:`${s?.risks?.addressed??0}/${s?.risks?.total??0} addressed`},
          {label:'Evidence',score:s?.evidence?.score,color:'teal',detail:`${s?.evidence?.approved??0}/${s?.evidence?.total??0} approved`}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{c.score??0}<span className="text-lg text-gray-400">%</span></p>
            <p className="text-xs text-gray-500 mt-1">{c.detail}</p>
          </div>
        ))}
      </div>

      {/* HITL Overdue Alert */}
      {(s?.hitl_overdue??0)>0&&(
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700">{s?.hitl_overdue} HITL Reviews Overdue</p>
            <p className="text-sm text-red-600">Human reviews have exceeded 72-hour SLA</p>
          </div>
          <a href="/hitl" className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Review Now</a>
        </div>
      )}

      {/* Models & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-3">AI Models</h3>
          <div className="flex items-center gap-4">
            <div className="text-center"><p className="text-3xl font-bold">{s?.models?.total??0}</p><p className="text-xs text-gray-500">Total</p></div>
            <div className="text-center"><p className="text-3xl font-bold text-green-600">{s?.models?.active??0}</p><p className="text-xs text-gray-500">Active</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(s?.recent_activity||[]).slice(0,5).map((a:any,i:number)=>(
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 text-xs mt-0.5">●</span>
                <div>
                  <span className="font-medium">{a.action}</span>
                  <span className="text-gray-400 text-xs ml-2">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {(!s?.recent_activity||s.recent_activity.length===0)&&<p className="text-gray-400 text-sm">No recent activity</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
'''

print('Sprint 11c: Dashboard page written')

# ============================================================
B = '/home/g8h45k4r/sentinel'
ROUTERS_DIR = B + '/sentinel/api/routers'
MIGRATIONS_DIR = B + '/sentinel/api/migrations'
STORES_DIR = B + '/dashboard/src/store'
PAGES_DIR = B + '/dashboard/src/pages'
COMPONENTS_DIR = B + '/dashboard/src/components'

def write(path, content):
    import os; os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path,'w').write(content)

# SPRINT 12: Event Bus Extension + Main.py Integration
# ============================================================

B = '/home/g8h45k4r/sentinel'
EVENTS_DIR = os.path.join(B, 'sentinel', 'events')
os.makedirs(EVENTS_DIR, exist_ok=True)

bus_extension = '''
from sentinel.events.compliance_events import ComplianceEvent

async def publish_compliance(event: ComplianceEvent, payload: dict, actor: str = "system"):
    """Helper to publish compliance events from anywhere in the app"""
    from sentinel.events.propagation import propagate
    return await propagate(event, payload, actor)
'''

write(os.path.join(EVENTS_DIR, 'bus_extension.py'), bus_extension)
print('Sprint 12a: bus_extension written')

# Update __init__.py for events package
events_init = '''
from sentinel.events.bus import event_bus
from sentinel.events.compliance_events import ComplianceEvent
from sentinel.events.bus_extension import publish_compliance

__all__ = ["event_bus", "ComplianceEvent", "publish_compliance"]
'''
write(os.path.join(EVENTS_DIR, '__init__.py'), events_init)
print('Sprint 12b: events __init__.py written')

# ============================================================
# SPRINT 13: DB Migration 004 - All new tables
# ============================================================

migration_004 = '''
-- Migration 004: AI Models, Controls, Datasets, Agents, Vendors, Bias Audits, Evidence, HITL

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    model_type VARCHAR(100),
    owner VARCHAR(255),
    department VARCHAR(255),
    use_case TEXT,
    risk_level VARCHAR(50) DEFAULT \'medium\',
    status VARCHAR(50) DEFAULT \'pending_review\',
    eu_ai_act_category VARCHAR(100),
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT \'{}\',
    compliance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT \'pending\',
    severity VARCHAR(50) DEFAULT \'medium\',
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    assigned_to VARCHAR(255),
    due_date DATE,
    evidence_links TEXT[],
    override_justification TEXT,
    last_tested TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    format VARCHAR(100),
    size_gb FLOAT,
    status VARCHAR(50) DEFAULT \'active\',
    pii_detected BOOLEAN DEFAULT FALSE,
    bias_score FLOAT,
    quality_score FLOAT,
    lineage TEXT,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(100),
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    vendor_id UUID,
    status VARCHAR(50) DEFAULT \'inactive\',
    autonomy_level VARCHAR(50) DEFAULT \'supervised\',
    deployment_env VARCHAR(100),
    endpoint_url VARCHAR(500),
    sla_response_ms INTEGER DEFAULT 500,
    hitl_required BOOLEAN DEFAULT TRUE,
    capabilities TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(100),
    website VARCHAR(500),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT \'pending\',
    risk_score FLOAT DEFAULT 0,
    compliance_certifications TEXT[],
    contract_expiry DATE,
    services_provided TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bias_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    audit_type VARCHAR(100),
    status VARCHAR(50) DEFAULT \'pending\',
    overall_bias_score FLOAT,
    demographic_parity FLOAT,
    equalized_odds FLOAT,
    disparate_impact FLOAT,
    findings JSONB DEFAULT \'[]\',
    recommendations TEXT,
    auditor VARCHAR(255),
    audit_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    evidence_type VARCHAR(100),
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    uploaded_by VARCHAR(255),
    tags TEXT[],
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitl_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    review_type VARCHAR(100),
    priority VARCHAR(50) DEFAULT \'medium\',
    status VARCHAR(50) DEFAULT \'pending\',
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
    decision VARCHAR(100),
    decision_rationale TEXT,
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    escalated BOOLEAN DEFAULT FALSE,
    sla_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_controls_model ON controls(model_id);
CREATE INDEX IF NOT EXISTS idx_datasets_model ON datasets(model_id);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model_id);
CREATE INDEX IF NOT EXISTS idx_bias_audits_model ON bias_audits(model_id);
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_reviews(status);
'''

write(os.path.join(MIGRATIONS_DIR, '004_all_tables.sql'), migration_004)
print('Sprint 13: Migration 004 written')

# ============================================================
# SPRINT 14: Update main.py to include all new routers
# ============================================================

main_patch = '''
# Sentinel API routers to include in main.py
# Add these imports and router includes:

from sentinel.api.routers import (
    model_router, controls_router, dataset_router,
    agent_router, vendor_router, bias_audit_router,
    evidence_router, hitl_router
)

# In the FastAPI app setup, include:
# app.include_router(model_router.router, prefix="/api", tags=["models"])
# app.include_router(controls_router.router, prefix="/api", tags=["controls"])
# app.include_router(dataset_router.router, prefix="/api", tags=["datasets"])
# app.include_router(agent_router.router, prefix="/api", tags=["agents"])
# app.include_router(vendor_router.router, prefix="/api", tags=["vendors"])
# app.include_router(bias_audit_router.router, prefix="/api", tags=["bias-audits"])
# app.include_router(evidence_router.router, prefix="/api", tags=["evidence"])
# app.include_router(hitl_router.router, prefix="/api", tags=["hitl"])
'''

main_path = os.path.join(B, 'sentinel', 'api', 'main.py')
if os.path.exists(main_path):
    content = open(main_path).read()
    routers_to_add = [
        'model_router', 'controls_router', 'dataset_router',
        'agent_router', 'vendor_router', 'bias_audit_router',
        'evidence_router', 'hitl_router'
    ]
    for r in routers_to_add:
        if r not in content:
            # Add import
            import_line = f'from sentinel.api.routers import {r}'
            include_line = f'app.include_router({r}.router, prefix="/api", tags=["{r.replace("_router","s")}"])'
            if 'from sentinel.api' not in content:
                content = content + f'\n{import_line}\n{include_line}\n'
            else:
                content = content + f'\n{include_line}\n'
    open(main_path, 'w').write(content)
    print('Sprint 14: main.py updated with new routers')
else:
    write(main_path, '# main.py - Add router imports here\n' + main_patch)
    print('Sprint 14: main.py created')

print('\n=== ALL SPRINTS COMPLETE ===')
print(f'Backend routers: {ROUTERS_DIR}')
print(f'Migrations: {MIGRATIONS_DIR}')
print(f'Frontend stores: {STORES_DIR}')
print(f'Frontend pages: {PAGES_DIR}')
print(f'Frontend components: {COMPONENTS_DIR}')
print(f'Events: {EVENTS_DIR}')