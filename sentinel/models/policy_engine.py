from __future__ import annotations
import re, json, logging
from datetime import date, timedelta, datetime, timezone
from typing import Optional
import jwt

logger = logging.getLogger(__name__)

FREQ_DAYS = {'WEEKLY': 7, 'MONTHLY': 30, 'QUARTERLY': 90, 'AS_NEEDED': 365}

def _bump(version: str, bump: str) -> str:
    major, minor, patch = map(int, version.split('.'))
    if bump == 'MAJOR':   return f'{major+1}.0.0'
    if bump == 'MINOR':   return f'{major}.{minor+1}.0'
    return f'{major}.{minor}.{patch+1}'

async def _log(policy_id, tenant_id, actor_id, action, detail, db):
    await db.execute(
        """INSERT INTO policy_activity_log(tenant_id,policy_id,actor_id,action,detail)
           VALUES($1,$2,$3,$4,$5)""",
        tenant_id, policy_id, actor_id, action, json.dumps(detail))


import enum

class PolicyStatus(enum.StrEnum):
    """Status values for policies."""
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"

class PolicyEngine:
    async def clone_system_template(self, template_id, tenant_id, user_id, db):
        tpl = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id='system'", template_id)
        if not tpl: raise ValueError('Template not found')
        slug = tpl['slug'] + '-' + tenant_id[:8]
        row = await db.fetchrow(
            """INSERT INTO policy_templates(tenant_id,framework,title,slug,description,body,version,status,is_system,parent_id,created_by,review_frequency)
               VALUES($1,$2,$3,$4,$5,$6,'1.0.0','DRAFT',FALSE,$7,$8,$9) RETURNING *""",
            tenant_id, tpl['framework'], tpl['title'], slug, tpl['description'], tpl['body'],
            template_id, user_id, tpl['review_frequency'])
        await _log(str(row['id']), tenant_id, user_id, 'CLONED', {'source_template': str(template_id)}, db)
        return dict(row)

    async def create_policy(self, tenant_id, framework, title, body, review_frequency, user_id, db):
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        row = await db.fetchrow(
            """INSERT INTO policy_templates(tenant_id,framework,title,slug,body,version,status,is_system,created_by,review_frequency)
               VALUES($1,$2,$3,$4,$5,'1.0.0','DRAFT',FALSE,$6,$7) RETURNING *""",
            tenant_id, framework, title, slug, body, user_id, review_frequency)
        await _log(str(row['id']), tenant_id, user_id, 'CREATED', {'framework': framework}, db)
        return dict(row)

    async def edit_policy(self, policy_id, body, change_summary, version_bump, user_id, tenant_id, db):
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2", policy_id, tenant_id)
        if not pol: raise ValueError('Policy not found')
        if pol['is_system']: raise ValueError('Cannot edit system templates')
        if pol['status'] == 'APPROVED':
            new_ver = _bump(pol['version'], version_bump or 'MINOR')
            await db.execute("UPDATE policy_templates SET status='SUPERSEDED', updated_at=NOW() WHERE id=$1", policy_id)
            await _log(policy_id, tenant_id, user_id, 'SUPERSEDED', {'superseded_by': 'new version'}, db)
            row = await db.fetchrow(
                """INSERT INTO policy_templates(tenant_id,framework,title,slug,description,body,version,status,is_system,parent_id,created_by,review_frequency)
                   SELECT tenant_id,framework,title,slug,description,$1,$2,'DRAFT',FALSE,id,$3,review_frequency FROM policy_templates WHERE id=$4 RETURNING *""",
                body, new_ver, user_id, policy_id)
            await db.execute(
                """INSERT INTO policy_versions(tenant_id,policy_id,version,body,change_summary,created_by)
                   VALUES($1,$2,$3,$4,$5,$6)""",
                tenant_id, str(row['id']), new_ver, body, change_summary, user_id)
            await _log(str(row['id']), tenant_id, user_id, 'VERSION_BUMPED', {'version': new_ver, 'bump': version_bump}, db)
            return dict(row)
        else:
            row = await db.fetchrow(
                "UPDATE policy_templates SET body=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *",
                body, policy_id, tenant_id)
            await _log(policy_id, tenant_id, user_id, 'EDITED', {'change_summary': change_summary}, db)
            return dict(row)

    async def submit_for_review(self, policy_id, reviewer_id, user_id, tenant_id, db):
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2 AND status='DRAFT'", policy_id, tenant_id)
        if not pol: raise ValueError('Policy must be in DRAFT status')
        await db.execute("UPDATE policy_templates SET status='PENDING_REVIEW', updated_at=NOW() WHERE id=$1", policy_id)
        approval = await db.fetchrow(
            """INSERT INTO policy_approvals(tenant_id,policy_id,version,status,submitted_by,reviewer_id)
               VALUES($1,$2,$3,'PENDING',$4,$5) RETURNING *""",
            tenant_id, policy_id, pol['version'], user_id, reviewer_id)
        await _log(policy_id, tenant_id, user_id, 'SUBMITTED_FOR_REVIEW', {'reviewer_id': reviewer_id}, db)
        return dict(approval)

    async def approve_policy(self, policy_id, approval_id, note, actor_id, tenant_id, db):
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2 AND status='PENDING_REVIEW'", policy_id, tenant_id)
        if not pol: raise ValueError('Policy must be PENDING_REVIEW')
        freq_days = FREQ_DAYS.get(pol['review_frequency'], 30)
        today = date.today()
        next_review = today + timedelta(days=freq_days)
        await db.execute(
            """UPDATE policy_templates SET status='APPROVED', approved_by=$1, approved_at=NOW(),
               effective_date=$2, next_review_date=$3, updated_at=NOW() WHERE id=$4""",
            actor_id, today, next_review, policy_id)
        await db.execute("UPDATE policy_approvals SET status='APPROVED', reviewer_id=$1, decision_note=$2, decided_at=NOW() WHERE id=$3",
            actor_id, note, approval_id)
        await _log(policy_id, tenant_id, actor_id, 'APPROVED', {'note': note, 'effective_date': str(today)}, db)
        return await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1", policy_id)

    async def reject_policy(self, policy_id, approval_id, reason, actor_id, tenant_id, db):
        if len(reason) < 10: raise ValueError('Rejection reason must be at least 10 characters')
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2 AND status='PENDING_REVIEW'", policy_id, tenant_id)
        if not pol: raise ValueError('Policy must be PENDING_REVIEW')
        await db.execute("UPDATE policy_templates SET status='REJECTED', rejected_by=$1, rejection_reason=$2, updated_at=NOW() WHERE id=$3",
            actor_id, reason, policy_id)
        await db.execute("UPDATE policy_approvals SET status='REJECTED', reviewer_id=$1, decision_note=$2, decided_at=NOW() WHERE id=$3",
            actor_id, reason, approval_id)
        await _log(policy_id, tenant_id, actor_id, 'REJECTED', {'reason': reason}, db)
        return await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1", policy_id)

    async def archive_policy(self, policy_id, reason, actor_id, tenant_id, db):
        await db.execute("UPDATE policy_templates SET status='ARCHIVED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2", policy_id, tenant_id)
        await _log(policy_id, tenant_id, actor_id, 'ARCHIVED', {'reason': reason}, db)
        return await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1", policy_id)

    async def sign_policy(self, policy_id, user_id, user_email, user_name, ip_address, method, typed_name, tenant_id, db):
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2 AND status='APPROVED'", policy_id, tenant_id)
        if not pol: raise ValueError('Only APPROVED policies can be signed')
        if method == 'TYPED_NAME' and not typed_name: raise ValueError('typed_name required for TYPED_NAME method')
        sig = await db.fetchrow(
            """INSERT INTO policy_signatures(tenant_id,policy_id,version,user_id,user_email,user_name,ip_address,signature_method,typed_name)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
            tenant_id, policy_id, pol['version'], user_id, user_email, user_name, ip_address, method, typed_name)
        await _log(policy_id, tenant_id, user_id, 'SIGNED', {'method': method, 'user_email': user_email}, db)
        return dict(sig)

    async def get_unsigned_for_user(self, user_id, tenant_id, db):
        rows = await db.fetch(
            """SELECT pt.* FROM policy_templates pt
               WHERE pt.tenant_id=$1 AND pt.status='APPROVED'
               AND NOT EXISTS (SELECT 1 FROM policy_signatures ps WHERE ps.policy_id=pt.id AND ps.version=pt.version AND ps.user_id=$2)""",
            tenant_id, user_id)
        return [dict(r) for r in rows]

    async def generate_share_token(self, policy_id, expires_hours, actor_id, tenant_id, db):
        import os as _os
        pol = await db.fetchrow("SELECT * FROM policy_templates WHERE id=$1 AND tenant_id=$2", policy_id, tenant_id)
        if not pol: raise ValueError('Policy not found')
        secret = _os.environ.get('JWT_SECRET', 'sentinel-secret')
        payload = {'policy_id': str(policy_id), 'version': pol['version'], 'tenant_id': tenant_id,
                   'exp': datetime.now(timezone.utc).timestamp() + (expires_hours or 72) * 3600}
        token = jwt.encode(payload, secret, algorithm='HS256')
        await _log(policy_id, tenant_id, actor_id, 'SHARED', {'expires_hours': expires_hours or 72}, db)
        return token
