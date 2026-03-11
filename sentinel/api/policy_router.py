from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import jwt, os, io
from sentinel.models.policy_engine import PolicyEngine
from sentinel.utils.policy_pdf import generate_policy_pdf


async def get_db():
    import asyncpg, os
    dsn = os.environ.get("DATABASE_URL", "postgresql://sentinel:sentinel@localhost:5432/sentinel")
    if not hasattr(get_db, "_pool") or get_db._pool is None:
        get_db._pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)
    return get_db._pool

router = APIRouter()
engine = PolicyEngine()

def get_tenant(request: Request) -> str:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET','sentinel-secret'), algorithms=['HS256'])
        return payload.get('tenant_id') or payload.get('org_id') or 'unknown'
    except Exception:
        raise HTTPException(401, 'Invalid token')

def get_user(request: Request) -> str:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET','sentinel-secret'), algorithms=['HS256'])
        return payload.get('sub') or payload.get('user_id') or 'unknown'
    except Exception:
        raise HTTPException(401, 'Invalid token')

class CreatePolicyBody(BaseModel):
    framework: str
    title: str
    body: str
    description: Optional[str] = None
    review_frequency: str = 'MONTHLY'

class EditPolicyBody(BaseModel):
    body: str
    change_summary: str
    version_bump: str = 'MINOR'

class SubmitBody(BaseModel):
    reviewer_id: str

class ApproveBody(BaseModel):
    approval_id: str
    note: str

class RejectBody(BaseModel):
    approval_id: str
    reason: str

class ArchiveBody(BaseModel):
    reason: str

class SignBody(BaseModel):
    method: str = 'CLICK_THROUGH'
    typed_name: Optional[str] = None

class ShareBody(BaseModel):
    expires_hours: Optional[int] = 72

class NotifSettingsBody(BaseModel):
    review_reminder: Optional[str] = None
    reminder_day_of_week: Optional[int] = None
    reminder_day_of_month: Optional[int] = None
    notify_on_approval: Optional[bool] = None
    notify_on_rejection: Optional[bool] = None
    notify_on_new_version: Optional[bool] = None
    notify_assignees_on_review: Optional[bool] = None

@router.get('')
async def list_policies(request: Request, framework: Optional[str]=None, status: Optional[str]=None, page: int=1, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    q = 'SELECT * FROM v_policy_summary WHERE tenant_id='
    params = [tenant_id]
    if framework: q += ' AND framework=$' + str(len(params)+1); params.append(framework)
    if status: q += ' AND status=$' + str(len(params)+1); params.append(status)
    q += ' ORDER BY updated_at DESC LIMIT 50 OFFSET $' + str(len(params)+1)
    params.append((page-1)*50)
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]

@router.get('/frameworks')
async def list_frameworks(request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    rows = await db.fetch('SELECT framework, COUNT(*) as count FROM policy_templates WHERE tenant_id= OR tenant_id= GROUP BY framework', tenant_id, 'system')
    return [dict(r) for r in rows]

@router.get('/system-templates')
async def system_templates(db=Depends(get_db)):
    rows = await db.fetch("SELECT * FROM policy_templates WHERE tenant_id='system' ORDER BY framework, title")
    return [dict(r) for r in rows]

@router.get('/unsigned')
async def unsigned_policies(request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    return await engine.get_unsigned_for_user(user_id, tenant_id, db)

@router.get('/due-review')
async def due_review(request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    rows = await db.fetch('SELECT * FROM v_policies_due_review WHERE tenant_id=', tenant_id)
    return [dict(r) for r in rows]

@router.get('/settings/notifications')
async def get_notif_settings(request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    row = await db.fetchrow('SELECT * FROM policy_notification_settings WHERE tenant_id=', tenant_id)
    if not row:
        await db.execute('INSERT INTO policy_notification_settings(tenant_id) VALUES() ON CONFLICT DO NOTHING', tenant_id)
        row = await db.fetchrow('SELECT * FROM policy_notification_settings WHERE tenant_id=', tenant_id)
    return dict(row)

@router.patch('/settings/notifications')
async def update_notif_settings(request: Request, body: NotifSettingsBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    await db.execute('INSERT INTO policy_notification_settings(tenant_id) VALUES() ON CONFLICT DO NOTHING', tenant_id)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        sets = ', '.join(f'{k}=' for i, k in enumerate(updates))
        vals = list(updates.values())
        await db.execute(f'UPDATE policy_notification_settings SET {sets}, updated_at=NOW() WHERE tenant_id=', tenant_id, *vals)
    return await db.fetchrow('SELECT * FROM policy_notification_settings WHERE tenant_id=', tenant_id)

@router.get('/shared/{token}')
async def public_view(token: str, db=Depends(get_db)):
    try:
        secret = os.environ.get('JWT_SECRET', 'sentinel-secret')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        policy_id = payload['policy_id']
        tenant_id = payload['tenant_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(403, 'Token expired')
    except Exception:
        raise HTTPException(404, 'Invalid token')
    row = await db.fetchrow('SELECT * FROM policy_templates WHERE id= AND tenant_id= AND status=', policy_id, tenant_id, 'APPROVED')
    if not row: raise HTTPException(404, 'Policy not found')
    return {k: row[k] for k in ['id','title','framework','version','body','effective_date','approved_by']}

@router.get('/{policy_id}')
async def get_policy(policy_id: str, request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    row = await db.fetchrow('SELECT * FROM v_policy_summary WHERE id= AND (tenant_id= OR tenant_id=)', policy_id, tenant_id, 'system')
    if not row: raise HTTPException(404, 'Not found')
    return dict(row)

@router.get('/{policy_id}/versions')
async def get_versions(policy_id: str, request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    rows = await db.fetch('SELECT * FROM policy_versions WHERE policy_id= AND tenant_id= ORDER BY created_at DESC', policy_id, tenant_id)
    return [dict(r) for r in rows]

@router.get('/{policy_id}/activity')
async def get_activity(policy_id: str, request: Request, page: int=1, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    rows = await db.fetch('SELECT * FROM policy_activity_log WHERE policy_id= AND tenant_id= ORDER BY created_at DESC LIMIT 50 OFFSET ', policy_id, tenant_id, (page-1)*50)
    return [dict(r) for r in rows]

@router.get('/{policy_id}/signatures')
async def get_signatures(policy_id: str, request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    rows = await db.fetch('SELECT * FROM policy_signatures WHERE policy_id= AND tenant_id= ORDER BY signed_at DESC', policy_id, tenant_id)
    return [dict(r) for r in rows]

@router.get('/{policy_id}/download')
async def download_pdf(policy_id: str, request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    row = await db.fetchrow('SELECT pt.*, array_agg(row_to_json(ps)) FILTER (WHERE ps.id IS NOT NULL) as signatures FROM policy_templates pt LEFT JOIN policy_signatures ps ON ps.policy_id=pt.id AND ps.version=pt.version WHERE pt.id= AND (pt.tenant_id= OR pt.tenant_id=) GROUP BY pt.id', policy_id, tenant_id, 'system')
    if not row: raise HTTPException(404, 'Not found')
    pdf_bytes = await generate_policy_pdf(dict(row))
    await db.execute('INSERT INTO policy_activity_log(tenant_id,policy_id,actor_id,action,detail) VALUES(,,,,)', tenant_id, policy_id, user_id, 'DOWNLOADED', '{}')
    return Response(content=pdf_bytes, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename=policy-{policy_id}.pdf'})

@router.post('/clone/{template_id}')
async def clone_template(template_id: str, request: Request, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    return await engine.clone_system_template(template_id, tenant_id, user_id, db)

@router.post('')
async def create_policy(request: Request, body: CreatePolicyBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    return await engine.create_policy(tenant_id, body.framework, body.title, body.body, body.review_frequency, user_id, db)

@router.patch('/{policy_id}')
async def edit_policy(policy_id: str, request: Request, body: EditPolicyBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    return await engine.edit_policy(policy_id, body.body, body.change_summary, body.version_bump, user_id, tenant_id, db)

@router.post('/{policy_id}/submit')
async def submit_review(policy_id: str, request: Request, body: SubmitBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    return await engine.submit_for_review(policy_id, body.reviewer_id, user_id, tenant_id, db)

@router.post('/{policy_id}/approve')
async def approve_policy(policy_id: str, request: Request, body: ApproveBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    actor_id = get_user(request)
    return await engine.approve_policy(policy_id, body.approval_id, body.note, actor_id, tenant_id, db)

@router.post('/{policy_id}/reject')
async def reject_policy(policy_id: str, request: Request, body: RejectBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    actor_id = get_user(request)
    return await engine.reject_policy(policy_id, body.approval_id, body.reason, actor_id, tenant_id, db)

@router.post('/{policy_id}/archive')
async def archive_policy(policy_id: str, request: Request, body: ArchiveBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    actor_id = get_user(request)
    return await engine.archive_policy(policy_id, body.reason, actor_id, tenant_id, db)

@router.post('/{policy_id}/sign')
async def sign_policy(policy_id: str, request: Request, body: SignBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    user_id = get_user(request)
    user_email = request.headers.get('X-User-Email', user_id)
    user_name = request.headers.get('X-User-Name', user_id)
    ip_address = request.client.host if request.client else None
    return await engine.sign_policy(policy_id, user_id, user_email, user_name, ip_address, body.method, body.typed_name, tenant_id, db)

@router.post('/{policy_id}/share')
async def share_policy(policy_id: str, request: Request, body: ShareBody, db=Depends(get_db)):
    tenant_id = get_tenant(request)
    actor_id = get_user(request)
    token = await engine.generate_share_token(policy_id, body.expires_hours, actor_id, tenant_id, db)
    return {'token': token}
