#!/usr/bin/env python3
import os

B = os.path.expanduser('~/sentinel')

def w(rel, content):
    p = os.path.join(B, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(content)
    print('OK:', rel)

# ── DB Migration 004 ─────────────────────────────────────────────────────────
w('sentinel/api/migrations/004_new_tables.sql', """-- Migration 004: New tables for Sentinel full lifecycle
CREATE TABLE IF NOT EXISTS ai_models(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    version TEXT, model_type TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','deprecated','retired')),
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    owner TEXT, description TEXT, use_case TEXT, framework TEXT,
    metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS datasets(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    description TEXT, source TEXT, format TEXT, size_mb FLOAT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
    sensitivity TEXT DEFAULT 'internal' CHECK(sensitivity IN ('public','internal','confidential','restricted')),
    bias_score FLOAT, owner TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vendors(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    category TEXT, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','under_review')),
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    contact_email TEXT, website TEXT, description TEXT, assessment_score FLOAT,
    owner TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agents(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    description TEXT, agent_type TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','paused','retired')),
    discovery_status TEXT DEFAULT 'pending' CHECK(discovery_status IN ('pending','approved','rejected')),
    rejection_reason TEXT,
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    model_id TEXT, owner TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bias_audits(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, model_id TEXT, dataset_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','complete','failed')),
    bias_score FLOAT, passed BOOLEAN, results JSONB DEFAULT '{}',
    recommendations TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS evidence(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, title TEXT NOT NULL,
    control_id TEXT, policy_id TEXT, description TEXT, file_url TEXT,
    uploaded_by TEXT, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reviewed_by TEXT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS hitl_reviews(
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL, review_type TEXT DEFAULT 'manual', assigned_to TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','escalated')),
    decision TEXT, notes TEXT, context TEXT, due_at TIMESTAMPTZ,
    resolved_by TEXT, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_models_t ON ai_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_datasets_t ON datasets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_t ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_t ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bias_t ON bias_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_t ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hitl_t ON hitl_reviews(tenant_id);
""")

# ── Backend Routers ───────────────────────────────────────────────────────────
w('sentinel/api/routers/model_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/models',tags=['models'])
@router.get('')
async def list_models(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    rows=await db.fetch('SELECT * FROM ai_models WHERE tenant_id=$1 ORDER BY created_at DESC',t)
    return [dict(r) for r in rows]
@router.post('')
async def create_model(req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();mid=str(uuid.uuid4())
    await db.execute('INSERT INTO ai_models(id,tenant_id,name,version,model_type,status,risk_level,owner,description,use_case,framework,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)',mid,t,b['name'],b.get('version'),b.get('model_type'),b.get('status','draft'),b.get('risk_level','medium'),b.get('owner'),b.get('description'),b.get('use_case'),b.get('framework'),datetime.now(timezone.utc))
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'model.created','model',$3,$4,$5)\",t,u,mid,f'Model created: {b["name"]}',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM ai_models WHERE id=$1',mid)
@router.patch('/{mid}')
async def update_model(mid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE ai_models SET {sets},updated_at=NOW() WHERE id=$1 AND tenant_id=${len(b)+2}',mid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM ai_models WHERE id=$1',mid)
@router.delete('/{mid}')
async def delete_model(mid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    await db.execute('DELETE FROM ai_models WHERE id=$1 AND tenant_id=$2',mid,t)
    return {'deleted':True}
""")

w('sentinel/api/routers/controls_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/controls',tags=['controls'])
@router.get('')
async def list_controls(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    rows=await db.fetch('SELECT * FROM controls WHERE tenant_id=$1 ORDER BY created_at DESC',t)
    return [dict(r) for r in rows]
@router.post('')
async def create_control(req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();cid=str(uuid.uuid4())
    await db.execute('INSERT INTO controls(id,tenant_id,title,framework,control_id,status,owner,description,due_date,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',cid,t,b['title'],b.get('framework'),b.get('control_id'),b.get('status','not_started'),b.get('owner'),b.get('description'),b.get('due_date'),datetime.now(timezone.utc))
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'control.created','control',$3,$4,$5)\",t,u,cid,f'Control created: {b["title"]}',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM controls WHERE id=$1',cid)
@router.patch('/{cid}')
async def update_control(cid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE controls SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',cid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM controls WHERE id=$1',cid)
@router.delete('/{cid}')
async def delete_control(cid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    await db.execute('DELETE FROM controls WHERE id=$1 AND tenant_id=$2',cid,t)
    return {'deleted':True}
""")

w('sentinel/api/routers/dataset_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/datasets',tags=['datasets'])
@router.get('')
async def list_datasets(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    return [dict(r) for r in await db.fetch('SELECT * FROM datasets WHERE tenant_id=$1 ORDER BY created_at DESC',t)]
@router.post('')
async def create_dataset(req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json();did=str(uuid.uuid4())
    await db.execute('INSERT INTO datasets(id,tenant_id,name,description,source,format,size_mb,status,sensitivity,owner,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',did,t,b['name'],b.get('description'),b.get('source'),b.get('format'),b.get('size_mb'),b.get('status','draft'),b.get('sensitivity','internal'),b.get('owner'),datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM datasets WHERE id=$1',did)
@router.patch('/{did}')
async def update_dataset(did:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE datasets SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',did,*b.values(),t)
    return await db.fetchrow('SELECT * FROM datasets WHERE id=$1',did)
@router.delete('/{did}')
async def delete_dataset(did:str,req:Request,db=Depends(get_db)):
    await db.execute('DELETE FROM datasets WHERE id=$1 AND tenant_id=$2',did,get_tenant(req))
    return {'deleted':True}
""")

w('sentinel/api/routers/agent_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/agents',tags=['agents'])
@router.get('')
async def list_agents(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    return [dict(r) for r in await db.fetch('SELECT * FROM agents WHERE tenant_id=$1 ORDER BY created_at DESC',t)]
@router.post('')
async def create_agent(req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json();aid=str(uuid.uuid4())
    await db.execute('INSERT INTO agents(id,tenant_id,name,description,agent_type,status,risk_level,owner,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',aid,t,b['name'],b.get('description'),b.get('agent_type'),b.get('status','draft'),b.get('risk_level','medium'),b.get('owner'),datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM agents WHERE id=$1',aid)
@router.post('/{aid}/approve')
async def approve_agent(aid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req)
    await db.execute(\"UPDATE agents SET discovery_status='approved' WHERE id=$1 AND tenant_id=$2\",aid,t)
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'agent.approved','agent',$3,$4,$5)\",t,u,aid,'Agent approved',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM agents WHERE id=$1',aid)
@router.post('/{aid}/reject')
async def reject_agent(aid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json()
    await db.execute(\"UPDATE agents SET discovery_status='rejected',rejection_reason=$3 WHERE id=$1 AND tenant_id=$2\",aid,t,b.get('reason',''))
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'agent.rejected','agent',$3,$4,$5)\",t,u,aid,'Agent rejected',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM agents WHERE id=$1',aid)
@router.patch('/{aid}')
async def update_agent(aid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE agents SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',aid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM agents WHERE id=$1',aid)
@router.delete('/{aid}')
async def delete_agent(aid:str,req:Request,db=Depends(get_db)):
    await db.execute('DELETE FROM agents WHERE id=$1 AND tenant_id=$2',aid,get_tenant(req))
    return {'deleted':True}
""")

w('sentinel/api/routers/vendor_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/vendors',tags=['vendors'])
@router.get('')
async def list_vendors(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    return [dict(r) for r in await db.fetch('SELECT * FROM vendors WHERE tenant_id=$1 ORDER BY created_at DESC',t)]
@router.post('')
async def create_vendor(req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json();vid=str(uuid.uuid4())
    await db.execute('INSERT INTO vendors(id,tenant_id,name,category,status,risk_level,contact_email,website,description,owner,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',vid,t,b['name'],b.get('category'),b.get('status','pending'),b.get('risk_level','medium'),b.get('contact_email'),b.get('website'),b.get('description'),b.get('owner'),datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM vendors WHERE id=$1',vid)
@router.post('/{vid}/approve')
async def approve_vendor(vid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req)
    await db.execute(\"UPDATE vendors SET status='approved' WHERE id=$1 AND tenant_id=$2\",vid,t)
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'vendor.approved','vendor',$3,$4,$5)\",t,u,vid,'Vendor approved',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM vendors WHERE id=$1',vid)
@router.post('/{vid}/reject')
async def reject_vendor(vid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req)
    await db.execute(\"UPDATE vendors SET status='rejected' WHERE id=$1 AND tenant_id=$2\",vid,t)
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'vendor.rejected','vendor',$3,$4,$5)\",t,u,vid,'Vendor rejected',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM vendors WHERE id=$1',vid)
@router.patch('/{vid}')
async def update_vendor(vid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE vendors SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',vid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM vendors WHERE id=$1',vid)
@router.delete('/{vid}')
async def delete_vendor(vid:str,req:Request,db=Depends(get_db)):
    await db.execute('DELETE FROM vendors WHERE id=$1 AND tenant_id=$2',vid,get_tenant(req))
    return {'deleted':True}
""")

w('sentinel/api/routers/evidence_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone
router=APIRouter(prefix='/api/evidence',tags=['evidence'])
@router.get('')
async def list_evidence(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    return [dict(r) for r in await db.fetch('SELECT * FROM evidence WHERE tenant_id=$1 ORDER BY created_at DESC',t)]
@router.post('')
async def create_evidence(req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();eid=str(uuid.uuid4())
    await db.execute('INSERT INTO evidence(id,tenant_id,title,control_id,policy_id,description,uploaded_by,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',eid,t,b['title'],b.get('control_id'),b.get('policy_id'),b.get('description'),u,'pending',datetime.now(timezone.utc))
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'evidence.uploaded','evidence',$3,$4,$5)\",t,u,eid,f'Evidence uploaded: {b["title"]}',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM evidence WHERE id=$1',eid)
@router.patch('/{eid}/review')
async def review_evidence(eid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();status=b.get('status','approved')
    await db.execute('UPDATE evidence SET status=$1,reviewed_by=$2,reviewed_at=$3 WHERE id=$4 AND tenant_id=$5',status,u,datetime.now(timezone.utc),eid,t)
    return await db.fetchrow('SELECT * FROM evidence WHERE id=$1',eid)
@router.patch('/{eid}')
async def update_evidence(eid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE evidence SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',eid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM evidence WHERE id=$1',eid)
@router.delete('/{eid}')
async def delete_evidence(eid:str,req:Request,db=Depends(get_db)):
    await db.execute('DELETE FROM evidence WHERE id=$1 AND tenant_id=$2',eid,get_tenant(req))
    return {'deleted':True}
""")

w('sentinel/api/routers/hitl_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant,get_user
import uuid
from datetime import datetime,timezone,timedelta
router=APIRouter(prefix='/api/hitl',tags=['hitl'])
SLA=72
@router.get('')
async def list_hitl(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    return [dict(r) for r in await db.fetch('SELECT * FROM hitl_reviews WHERE tenant_id=$1 ORDER BY created_at DESC',t)]
@router.post('')
async def create_hitl(req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();hid=str(uuid.uuid4())
    due=datetime.now(timezone.utc)+timedelta(hours=SLA)
    await db.execute('INSERT INTO hitl_reviews(id,tenant_id,entity_type,entity_id,review_type,assigned_to,status,due_at,context,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',hid,t,b['entity_type'],b['entity_id'],b.get('review_type','manual'),b.get('assigned_to'),b.get('status','pending'),due,b.get('context',''),datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM hitl_reviews WHERE id=$1',hid)
@router.post('/{hid}/resolve')
async def resolve_hitl(hid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);u=get_user(req);b=await req.json();d=b.get('decision','approved')
    await db.execute('UPDATE hitl_reviews SET status=$1,decision=$2,notes=$3,resolved_by=$4,resolved_at=$5 WHERE id=$6 AND tenant_id=$7',d,d,b.get('notes',''),u,datetime.now(timezone.utc),hid,t)
    await db.execute(\"INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'hitl.resolved','hitl',$3,$4,$5)\",t,u,hid,f'HITL resolved: {d}',datetime.now(timezone.utc))
    return await db.fetchrow('SELECT * FROM hitl_reviews WHERE id=$1',hid)
@router.patch('/{hid}')
async def update_hitl(hid:str,req:Request,db=Depends(get_db)):
    t=get_tenant(req);b=await req.json()
    sets=','.join(f'{k}=${i+2}' for i,k in enumerate(b.keys()))
    await db.execute(f'UPDATE hitl_reviews SET {sets} WHERE id=$1 AND tenant_id=${len(b)+2}',hid,*b.values(),t)
    return await db.fetchrow('SELECT * FROM hitl_reviews WHERE id=$1',hid)
@router.delete('/{hid}')
async def delete_hitl(hid:str,req:Request,db=Depends(get_db)):
    await db.execute('DELETE FROM hitl_reviews WHERE id=$1 AND tenant_id=$2',hid,get_tenant(req))
    return {'deleted':True}
""")

w('sentinel/api/routers/compliance_router.py', """from fastapi import APIRouter,Request,Depends
from db import get_db
from auth import get_tenant
router=APIRouter(prefix='/api/compliance',tags=['compliance'])
async def score(t,db):
    c=await db.fetchrow(\"SELECT COUNT(*) total,SUM(CASE WHEN status='implemented' THEN 1 ELSE 0 END) imp FROM controls WHERE tenant_id=$1\",t)
    p=await db.fetchrow(\"SELECT COUNT(*) total,SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) app FROM policies WHERE tenant_id=$1\",t)
    r=await db.fetchrow(\"SELECT COUNT(*) total,SUM(CASE WHEN status IN ('mitigated','accepted') THEN 1 ELSE 0 END) addr FROM risks WHERE tenant_id=$1\",t)
    e=await db.fetchrow(\"SELECT COUNT(*) total,SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) app FROM evidence WHERE tenant_id=$1\",t)
    m=await db.fetchrow(\"SELECT COUNT(*) total,SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active FROM ai_models WHERE tenant_id=$1\",t)
    cs=round((c['imp'] or 0)/(c['total'] or 1)*100,1)
    ps=round((p['app'] or 0)/(p['total'] or 1)*100,1)
    rs=round((r['addr'] or 0)/(r['total'] or 1)*100,1)
    es=round((e['app'] or 0)/(e['total'] or 1)*100,1)
    ov=round(cs*0.35+ps*0.25+rs*0.25+es*0.15,1)
    return {'overall':ov,'controls':{'score':cs,'total':c['total'],'implemented':c['imp']},'policies':{'score':ps,'total':p['total'],'approved':p['app']},'risks':{'score':rs,'total':r['total'],'addressed':r['addr']},'evidence':{'score':es,'total':e['total'],'approved':e['app']},'models':{'total':m['total'],'active':m['active']}}
@router.get('/score')
async def get_score(req:Request,db=Depends(get_db)):
    return await score(get_tenant(req),db)
@router.get('/summary')
async def get_summary(req:Request,db=Depends(get_db)):
    t=get_tenant(req);s=await score(t,db)
    ov=await db.fetchval(\"SELECT COUNT(*) FROM hitl_reviews WHERE tenant_id=$1 AND status='pending' AND due_at<NOW()\",t)
    ra=await db.fetch('SELECT * FROM compliance_audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 10',t)
    return {**s,'hitl_overdue':ov,'recent_activity':[dict(r) for r in ra]}
@router.get('/audit-log')
async def get_audit_log(req:Request,db=Depends(get_db)):
    t=get_tenant(req)
    rows=await db.fetch('SELECT * FROM compliance_audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',t)
    return [dict(r) for r in rows]
""")

# ── Frontend Files ──────────────────────────────────────────────────────────
w('dashboard/src/stores/apiStore.ts', """import{create}from 'zustand'
const API=import.meta.env.VITE_API_URL||''
export async function apiFetch(path:string,opts:RequestInit={}){
  const token=localStorage.getItem('sentinel_token')||''
  const res=await fetch(`${API}${path}`,{...opts,headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,...((opts.headers||{}) as object)}})
  if(!res.ok)throw new Error(await res.text())
  return res.json()
}
export function createEntityStore<T extends{id:string}>(endpoint:string){
  return create<{items:T[];loading:boolean;error:string|null;fetchAll:()=>Promise<void>;create:(d:any)=>Promise<T>;update:(id:string,d:any)=>Promise<T>;remove:(id:string)=>Promise<void>;action:(id:string,act:string,d?:any)=>Promise<T>}>((set,get)=>({
    items:[],loading:false,error:null,
    fetchAll:async()=>{set({loading:true,error:null});try{const d=await apiFetch(endpoint);set({items:d})}catch(e:any){set({error:e.message})};set({loading:false})},
    create:async(d)=>{const item=await apiFetch(endpoint,{method:'POST',body:JSON.stringify(d)});set({items:[...get().items,item]});return item},
    update:async(id,d)=>{const item=await apiFetch(`${endpoint}/${id}`,{method:'PATCH',body:JSON.stringify(d)});set({items:get().items.map(i=>i.id===id?item:i)});return item},
    remove:async(id)=>{await apiFetch(`${endpoint}/${id}`,{method:'DELETE'});set({items:get().items.filter(i=>i.id!==id)})},
    action:async(id,act,d={})=>{const item=await apiFetch(`${endpoint}/${id}/${act}`,{method:'POST',body:JSON.stringify(d)});set({items:get().items.map(i=>i.id===id?item:i)});return item}
  }))
}
export const useModelStore=createEntityStore('/api/models')
export const useControlsStore=createEntityStore('/api/controls')
export const useDatasetStore=createEntityStore('/api/datasets')
export const useAgentStore=createEntityStore('/api/agents')
export const useVendorStore=createEntityStore('/api/vendors')
export const useEvidenceStore=createEntityStore('/api/evidence')
export const useHitlStore=createEntityStore('/api/hitl')
""")

w('dashboard/src/stores/complianceStore.ts', """import{create}from 'zustand'
import{apiFetch}from './apiStore'
export const useComplianceStore=create<{score:any;loading:boolean;fetchScore:()=>Promise<void>;fetchSummary:()=>Promise<void>}>((set)=>({
  score:null,loading:false,
  fetchScore:async()=>{set({loading:true});try{const d=await apiFetch('/api/compliance/score');set({score:d})}catch(e){};set({loading:false})},
  fetchSummary:async()=>{set({loading:true});try{const d=await apiFetch('/api/compliance/summary');set({score:d})}catch(e){};set({loading:false})}
}))
""")

w('dashboard/src/components/EntityPage.tsx', """import{useState,useEffect}from 'react'
export function EntityPage({title,store,columns,actions=[],formFields,searchKeys=[]}:any){
  const{items,loading,error,fetchAll,create,update,remove}=store
  const[search,setSearch]=useState('')
  const[modal,setModal]=useState<any>(null)
  const[form,setForm]=useState<any>({})
  const[saving,setSaving]=useState(false)
  useEffect(()=>{fetchAll()},[fetchAll])
  const filtered=items.filter((i:any)=>!search||searchKeys.some((k:string)=>String(i[k]||'').toLowerCase().includes(search.toLowerCase())))
  const openCreate=()=>{setForm({});setModal({mode:'create'})}
  const openEdit=(r:any)=>{setForm({...r});setModal({mode:'edit',data:r})}
  const closeModal=()=>{setModal(null);setForm({})}
  const handleSubmit=async(e:any)=>{e.preventDefault();setSaving(true);try{if(modal.mode==='create')await create(form);else await update(modal.data.id,form);closeModal()}catch(err:any){alert(err.message)};setSaving(false)}
  const handleDelete=async(id:string)=>{if(!confirm('Delete?'))return;try{await remove(id)}catch(err:any){alert(err.message)}}
  return(
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Add</button>
      </div>
      {searchKeys.length>0&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title}...`} className="mb-4 w-full max-w-md px-3 py-2 border rounded-lg text-sm"/>}
      {error&&<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading?<div className="flex justify-center h-32 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>:filtered.length===0?<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">&#128202;</p><p>No {title.toLowerCase()} yet</p><button onClick={openCreate} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm">Add first</button></div>:
        <table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr>{columns.map((c:any)=><th key={c.key} className="text-left px-4 py-3 font-medium text-gray-600">{c.label}</th>)}<th className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y">{filtered.map((row:any)=>(
          <tr key={row.id} className="hover:bg-gray-50">
            {columns.map((c:any)=><td key={c.key} className="px-4 py-3">{c.render?c.render(row[c.key],row):String(row[c.key]??'\u2014')}</td>)}
            <td className="px-4 py-3"><div className="flex gap-2 flex-wrap">
              <button onClick={()=>openEdit(row)} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Edit</button>
              {actions.filter((a:any)=>!a.show||a.show(row)).map((a:any)=>(<button key={a.label} onClick={()=>a.onClick(row)} className={`text-xs px-2 py-1 rounded ${a.className||'bg-blue-50 text-blue-700'}`}>{a.label}</button>))}
              <button onClick={()=>handleDelete(row.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Delete</button>
            </div></td>
          </tr>
        ))}</tbody></table>}
      </div>
      {modal&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-md shadow-2xl"><div className="flex items-center justify-between p-5 border-b"><h2 className="font-semibold">{modal.mode==='create'?`New ${title}`:`Edit`}</h2><button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {formFields.map((f:any)=>(<div key={f.key}><label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.required&&<span className="text-red-500 ml-1">*</span>}</label>
          {f.type==='select'?<select value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Select...</option>{f.options?.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.type==='textarea'?<textarea value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"/>:<input type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required} className="w-full border rounded-lg px-3 py-2 text-sm"/>}
        </div>))}
        <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Save'}</button><button type="button" onClick={closeModal} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button></div>
      </form></div></div>}
    </div>
  )
}
""")

SB='bg-green-100 text-green-800'
SBD='bg-gray-100 text-gray-600'
SBY='bg-yellow-100 text-yellow-800'
SBR='bg-red-100 text-red-800'
SBB='bg-blue-100 text-blue-800'

def badge(v,mp):
    return f'<span className={{`px-2 py-0.5 rounded-full text-xs font-medium ${{{mp}[v]||\'bg-gray-100\'}}`}}>{{v}}</span>'

for fname,title,endpoint,cols,fields,sk,acts in [
  ('Models.tsx','AI Models','/api/models',
    [('name','Name'),('version','Version'),('model_type','Type'),('status','Status','S'),('risk_level','Risk','R'),('owner','Owner')],
    [('name','Model Name',True,'text'),('version','Version',False,'text'),('model_type','Type',False,'text'),('status','Status',False,'select',[('draft','Draft'),('active','Active'),('deprecated','Deprecated'),('retired','Retired')]),('risk_level','Risk',False,'select',[('low','Low'),('medium','Medium'),('high','High'),('critical','Critical')]),('owner','Owner',False,'text'),('description','Description',False,'textarea')],
    ['name','owner','model_type'],[]),
  ('Controls.tsx','Controls','/api/controls',
    [('title','Title'),('framework','Framework'),('control_id','ID'),('status','Status','S'),('owner','Owner')],
    [('title','Title',True,'text'),('framework','Framework',False,'select',[('ISO_27001','ISO 27001'),('SOC2','SOC 2'),('EU_AI_Act','EU AI Act'),('NIST_AI_RMF','NIST AI RMF'),('OWASP_LLM','OWASP LLM')]),('control_id','Control ID',False,'text'),('status','Status',False,'select',[('not_started','Not Started'),('in_progress','In Progress'),('implemented','Implemented'),('failed','Failed')]),('owner','Owner',False,'text'),('due_date','Due Date',False,'date'),('description','Description',False,'textarea')],
    ['title','framework','owner'],[]),
  ('Datasets.tsx','Datasets','/api/datasets',
    [('name','Name'),('source','Source'),('format','Format'),('status','Status','S'),('sensitivity','Sensitivity'),('owner','Owner')],
    [('name','Dataset Name',True,'text'),('source','Source',False,'text'),('format','Format',False,'text'),('status','Status',False,'select',[('draft','Draft'),('active','Active'),('archived','Archived')]),('sensitivity','Sensitivity',False,'select',[('public','Public'),('internal','Internal'),('confidential','Confidential'),('restricted','Restricted')]),('owner','Owner',False,'text'),('description','Description',False,'textarea')],
    ['name','source','owner'],[]),
]:
    store_name='use'+fname.replace('.tsx','')+'Store'
    col_defs=[]
    for c in cols:
        if len(c)==3:
            mp='S' if c[2]=='S' else 'R'
            col_defs.append(f"{{key:'{c[0]}',label:'{c[1]}',render:(v:string)=><span className={{`px-2 py-0.5 rounded-full text-xs font-medium ${{{mp}[v]||'bg-gray-100'}}`}}>{{v}}</span>}}")
        else:
            col_defs.append(f"{{key:'{c[0]}',label:'{c[1]}'}}")
    field_defs=[]
    for f in fields:
        if f[3]=='select':
            opts=','.join(f"{{value:'{o[0]}',label:'{o[1]}'}}" for o in f[4])
            field_defs.append(f"{{key:'{f[0]}',label:'{f[1]}',required:{'true' if f[2] else 'false'},type:'select',options:[{opts}]}}")
        elif f[3]=='textarea':
            field_defs.append(f"{{key:'{f[0]}',label:'{f[1]}',required:{'true' if f[2] else 'false'},type:'textarea'}}")
        else:
            field_defs.append(f"{{key:'{f[0]}',label:'{f[1]}',required:{'true' if f[2] else 'false'}}}")
    sk_str='['+','.join(f"'{s}'" for s in sk)+']'
    act_str='['+','.join(str(a) for a in acts)+']'
    content=f"""import{{EntityPage}}from '../components/EntityPage'
import{{createEntityStore}}from '../stores/apiStore'
const S={{active:'bg-green-100 text-green-800',draft:'bg-gray-100 text-gray-600',deprecated:'bg-yellow-100 text-yellow-800',retired:'bg-red-100 text-red-800',implemented:'bg-green-100 text-green-800',in_progress:'bg-blue-100 text-blue-800',not_started:'bg-gray-100 text-gray-600',failed:'bg-red-100 text-red-800',archived:'bg-yellow-100 text-yellow-800'}}
const R={{low:'bg-blue-100 text-blue-800',medium:'bg-yellow-100 text-yellow-800',high:'bg-orange-100 text-orange-800',critical:'bg-red-100 text-red-800'}}
const store=createEntityStore('{endpoint}')
export default function {fname.replace('.tsx','')}Page(){{
  return<EntityPage title="{title}" store={{store()}} columns={{[{','.join(col_defs)}]}} formFields={{[{','.join(field_defs)}]}} searchKeys={{{sk_str}}}/>
}}
"""
    w(f'dashboard/src/pages/{fname}',content)

print('Module pages written')

# Agents and Vendors pages
w('dashboard/src/pages/Agents.tsx', """import{EntityPage}from '../components/EntityPage'
import{createEntityStore,useAgentStore}from '../stores/apiStore'
const S={active:'bg-green-100 text-green-800',draft:'bg-gray-100 text-gray-600',paused:'bg-yellow-100 text-yellow-800',retired:'bg-red-100 text-red-800'}
const D={approved:'bg-green-100 text-green-800',rejected:'bg-red-100 text-red-800',pending:'bg-yellow-100 text-yellow-800'}
const store=createEntityStore('/api/agents')
export default function AgentsPage(){
  return<EntityPage title="AI Agents" store={store()} columns={[{key:'name',label:'Name'},{key:'agent_type',label:'Type'},{key:'status',label:'Status',render:(v:string)=><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${S[v]||'bg-gray-100'}`}>{v}</span>},{key:'discovery_status',label:'Discovery',render:(v:string)=><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${D[v]||'bg-gray-100'}`}>{v}</span>},{key:'risk_level',label:'Risk'},{key:'owner',label:'Owner'}]} actions={[{label:'Approve',show:(r:any)=>r.discovery_status==='pending',className:'bg-green-50 text-green-700',onClick:(r:any)=>store.getState().action(r.id,'approve')},{label:'Reject',show:(r:any)=>r.discovery_status==='pending',className:'bg-red-50 text-red-700',onClick:(r:any)=>store.getState().action(r.id,'reject',{reason:'Rejected'})}]} formFields={[{key:'name',label:'Agent Name',required:true},{key:'agent_type',label:'Type'},{key:'status',label:'Status',type:'select',options:[{value:'draft',label:'Draft'},{value:'active',label:'Active'},{value:'paused',label:'Paused'},{value:'retired',label:'Retired'}]},{key:'risk_level',label:'Risk',type:'select',options:[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'critical',label:'Critical'}]},{key:'owner',label:'Owner'},{key:'description',label:'Description',type:'textarea'}]} searchKeys={['name','agent_type','owner']}/>
}
""")

w('dashboard/src/pages/Vendors.tsx', """import{EntityPage}from '../components/EntityPage'
import{createEntityStore}from '../stores/apiStore'
const S={approved:'bg-green-100 text-green-800',rejected:'bg-red-100 text-red-800',under_review:'bg-blue-100 text-blue-800',pending:'bg-yellow-100 text-yellow-800'}
const store=createEntityStore('/api/vendors')
export default function VendorsPage(){
  return<EntityPage title="Vendors" store={store()} columns={[{key:'name',label:'Name'},{key:'category',label:'Category'},{key:'status',label:'Status',render:(v:string)=><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${S[v]||'bg-gray-100'}`}>{v}</span>},{key:'risk_level',label:'Risk'},{key:'assessment_score',label:'Score',render:(v:number)=>v!=null?`${v}%`:'\u2014'},{key:'owner',label:'Owner'}]} actions={[{label:'Approve',show:(r:any)=>['pending','under_review'].includes(r.status),className:'bg-green-50 text-green-700',onClick:(r:any)=>store.getState().action(r.id,'approve')},{label:'Reject',show:(r:any)=>['pending','under_review'].includes(r.status),className:'bg-red-50 text-red-700',onClick:(r:any)=>store.getState().action(r.id,'reject')}]} formFields={[{key:'name',label:'Vendor Name',required:true},{key:'category',label:'Category'},{key:'contact_email',label:'Email',type:'email'},{key:'website',label:'Website',type:'url'},{key:'risk_level',label:'Risk',type:'select',options:[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'critical',label:'Critical'}]},{key:'owner',label:'Owner'},{key:'description',label:'Description',type:'textarea'}]} searchKeys={['name','category','owner']}/>
}
""")

w('dashboard/src/pages/HITL.tsx', """import{useEffect,useState}from 'react'
import{useHitlStore}from '../stores/apiStore'
export default function HITLPage(){
  const store=useHitlStore()
  const[notes,setNotes]=useState<Record<string,string>>({})
  const[resolving,setResolving]=useState('')
  useEffect(()=>{store.fetchAll()},[store.fetchAll])
  const resolve=async(id:string,decision:string)=>{
    setResolving(id)
    try{await store.action(id,'resolve',{decision,notes:notes[id]||''})}catch(e:any){alert(e.message)}
    setResolving('')
  }
  const pending=store.items.filter((i:any)=>i.status==='pending')
  const overdue=pending.filter((i:any)=>new Date(i.due_at)<new Date())
  return(
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">HITL Reviews</h1>
        <div className="flex gap-3">{overdue.length>0&&<span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{overdue.length} Overdue</span>}<span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{pending.length} Pending</span></div>
      </div>
      {store.loading?<div className="flex justify-center h-32 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>:(
        <div className="space-y-4">
          {store.items.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">&#9989;</p><p>No HITL reviews pending</p></div>}
          {store.items.map((r:any)=>(
            <div key={r.id} className={`bg-white rounded-xl shadow-sm border p-5 ${new Date(r.due_at)<new Date()&&r.status==='pending'?'border-red-300':''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status==='pending'?'bg-yellow-100 text-yellow-800':r.status==='approved'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{r.status}</span>
                    <span className="text-xs text-gray-400">{r.entity_type} \u2022 {r.review_type}</span>
                    {new Date(r.due_at)<new Date()&&r.status==='pending'&&<span className="text-xs text-red-600 font-medium">&#9888; Overdue</span>}
                  </div>
                  <p className="font-medium text-gray-900">{r.context||`Review ${r.entity_type}`}</p>
                  <p className="text-xs text-gray-400 mt-1">Due: {new Date(r.due_at).toLocaleString()}</p>
                </div>
                {r.status==='pending'&&(
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <textarea value={notes[r.id]||''} onChange={e=>setNotes({...notes,[r.id]:e.target.value})} placeholder="Notes..." rows={2} className="w-full border rounded px-2 py-1 text-xs"/>
                    <div className="flex gap-2">
                      <button onClick={()=>resolve(r.id,'approved')} disabled={resolving===r.id} className="flex-1 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50">Approve</button>
                      <button onClick={()=>resolve(r.id,'rejected')} disabled={resolving===r.id} className="flex-1 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
""")

print('HITL+Agents+Vendors pages written')

w('dashboard/src/pages/Dashboard.tsx', """import{useEffect}from 'react'
import{useComplianceStore}from '../stores/complianceStore'
export default function Dashboard(){
  const{score,loading,fetchSummary}=useComplianceStore()
  useEffect(()=>{fetchSummary()},[fetchSummary])
  const s=score
  if(loading&&!s)return<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div>
  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <button onClick={fetchSummary} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Refresh</button>
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm">Overall Compliance Score</p>
        <div className="flex items-end gap-2 mt-1"><span className="text-6xl font-bold">{s?.overall??0}</span><span className="text-2xl mb-2">%</span></div>
        <div className="w-full bg-blue-900 rounded-full h-2 mt-3"><div className="bg-white rounded-full h-2 transition-all" style={{width:`${s?.overall??0}%`}}/></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{l:'Controls',s:s?.controls?.score,d:`${s?.controls?.implemented??0}/${s?.controls?.total??0} implemented`},{l:'Policies',s:s?.policies?.score,d:`${s?.policies?.approved??0}/${s?.policies?.total??0} approved`},{l:'Risks',s:s?.risks?.score,d:`${s?.risks?.addressed??0}/${s?.risks?.total??0} addressed`},{l:'Evidence',s:s?.evidence?.score,d:`${s?.evidence?.approved??0}/${s?.evidence?.total??0} approved`}].map(c=>(
          <div key={c.l} className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{c.l}</p><p className="text-3xl font-bold mt-1">{c.s??0}<span className="text-lg text-gray-400">%</span></p><p className="text-xs text-gray-500 mt-1">{c.d}</p></div>
        ))}
      </div>
      {(s?.hitl_overdue??0)>0&&(<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><span className="text-red-500 text-xl">&#9888;&#65039;</span><div><p className="font-semibold text-red-700">{s?.hitl_overdue} HITL Reviews Overdue</p><p className="text-sm text-red-600">Human reviews exceeded 72-hour SLA</p></div><a href="/hitl" className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Review Now</a></div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border"><h3 className="font-semibold mb-3">AI Models</h3><div className="flex gap-6"><div className="text-center"><p className="text-3xl font-bold">{s?.models?.total??0}</p><p className="text-xs text-gray-500">Total</p></div><div className="text-center"><p className="text-3xl font-bold text-green-600">{s?.models?.active??0}</p><p className="text-xs text-gray-500">Active</p></div></div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border"><h3 className="font-semibold mb-3">Recent Activity</h3><div className="space-y-2 max-h-40 overflow-y-auto">{(s?.recent_activity||[]).slice(0,5).map((a:any,i:number)=>(<div key={i} className="flex items-start gap-2 text-sm"><span className="text-blue-500 text-xs mt-0.5">&#9679;</span><div><span className="font-medium">{a.action}</span><span className="text-gray-400 text-xs ml-2">{new Date(a.created_at).toLocaleDateString()}</span></div></div>))}{(!s?.recent_activity||s.recent_activity.length===0)&&<p className="text-gray-400 text-sm">No recent activity</p>}</div></div>
      </div>
    </div>
  )
}
""")

print('Dashboard page written')

# ── Patch main.py to add new routers ────────────────────────────────────────────────
main_path=os.path.join(B,'sentinel/api/main.py')
if os.path.exists(main_path):
    content=open(main_path).read()
    new_imports=''
    new_includes=''
    routers_to_add=[
        ('model_router','model_router'),
        ('controls_router','controls_router'),
        ('dataset_router','dataset_router'),
        ('agent_router','agent_router'),
        ('vendor_router','vendor_router'),
        ('evidence_router','evidence_router'),
        ('hitl_router','hitl_router'),
        ('compliance_router','compliance_router'),
    ]
    patch=''
    for mod,rtr in routers_to_add:
        imp=f'from routers.{mod} import router as {rtr}'
        inc=f'app.include_router({rtr})'
        if imp not in content:
            patch+=f'\n{imp}\n{inc}'
    if patch:
        # Insert after last import line
        lines=content.split('\n')
        insert_at=0
        for i,l in enumerate(lines):
            if l.startswith('from ')||l.startswith('import '):
                insert_at=i
        lines.insert(insert_at+1,patch)
        open(main_path,'w').write('\n'.join(lines))
        print('Patched main.py with new routers')
    else:
        print('main.py already has all routers')
else:
    print(f'WARNING: main.py not found at {main_path}')

print('\n=== gen.py complete ===')
print('Files written to:')
print(f'  Backend: {os.path.join(B,"sentinel/api/routers")}')
print(f'  Frontend: {os.path.join(B,"dashboard/src")}')
print(f'  Migration: {os.path.join(B,"sentinel/api/migrations")}')
print('Run: cd dashboard && npm run build')
print('Run: cd sentinel/api && uvicorn main:app --reload')