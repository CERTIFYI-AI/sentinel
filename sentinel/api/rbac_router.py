# SPDX-License-Identifier: Apache-2.0
# Tenant-scoped, admin-gated RBAC administration (TD-025 / audit H2).
#
# Before this, the RBAC roles/users tables had no tenant column and no authz
# beyond "some valid JWT": any authenticated user of any tenant could PATCH
# another user to Super Admin, or enumerate/delete every tenant's users. Now:
#   * every query is scoped to the caller's tenant (from the verified JWT);
#   * mutating roles/users requires the caller to hold rbac-write in their own
#     role (data-driven, not a hardcoded role name), so a non-admin cannot
#     escalate themselves;
#   * writes bind tenant_id server-side and whitelist columns.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sentinel.api.db import get_db, RBACRole, RBACUser, new_id
from sentinel.api.deps import get_current_tenant_id, get_current_user

router = APIRouter()

DEFAULT_ROLES = [
    {"name": "Super Admin", "description": "Full system access", "is_system": True,
     "permissions": {"policies": "rwad", "models": "rwad", "controls": "rwad", "hitl": "rwad", "rbac": "rwad", "trust_engine": "rwad", "vendors": "rwad", "agents": "rwad", "datasets": "rwad", "bias_audits": "rwad", "evidence": "rwad", "risk_map": "rwad", "reg_radar": "rwad", "settings": "rwad"}},
    {"name": "Compliance Officer", "description": "Policy and compliance management", "is_system": True,
     "permissions": {"policies": "rwa", "models": "r", "controls": "rwa", "hitl": "rwa", "rbac": "r", "trust_engine": "r", "vendors": "r", "agents": "r", "datasets": "r", "bias_audits": "rw", "evidence": "rw", "risk_map": "r", "reg_radar": "rwa", "settings": "r"}},
    {"name": "AI/ML Engineer", "description": "Model and dataset management", "is_system": True,
     "permissions": {"policies": "r", "models": "rw", "controls": "r", "hitl": "r", "rbac": "", "trust_engine": "rw", "vendors": "r", "agents": "rw", "datasets": "rw", "bias_audits": "rw", "evidence": "r", "risk_map": "r", "reg_radar": "r", "settings": "r"}},
    {"name": "Risk Analyst", "description": "Risk assessment and monitoring", "is_system": True,
     "permissions": {"policies": "r", "models": "r", "controls": "r", "hitl": "r", "rbac": "", "trust_engine": "r", "vendors": "rw", "agents": "r", "datasets": "r", "bias_audits": "r", "evidence": "r", "risk_map": "rw", "reg_radar": "rw", "settings": "r"}},
    {"name": "Auditor", "description": "Read-only audit access", "is_system": True,
     "permissions": {"policies": "r", "models": "r", "controls": "r", "hitl": "r", "rbac": "r", "trust_engine": "r", "vendors": "r", "agents": "r", "datasets": "r", "bias_audits": "r", "evidence": "r", "risk_map": "r", "reg_radar": "r", "settings": "r"}},
    {"name": "HITL Reviewer", "description": "Human-in-the-loop review", "is_system": True,
     "permissions": {"policies": "r", "models": "r", "controls": "r", "hitl": "rwa", "rbac": "", "trust_engine": "r", "vendors": "r", "agents": "r", "datasets": "r", "bias_audits": "r", "evidence": "r", "risk_map": "r", "reg_radar": "r", "settings": ""}},
    {"name": "Vendor Manager", "description": "Vendor oversight", "is_system": True,
     "permissions": {"policies": "r", "models": "r", "controls": "r", "hitl": "r", "rbac": "", "trust_engine": "r", "vendors": "rwad", "agents": "r", "datasets": "r", "bias_audits": "r", "evidence": "rw", "risk_map": "r", "reg_radar": "r", "settings": ""}},
]

_ROLE_WRITABLE = {"name", "description", "is_system", "permissions"}
_USER_WRITABLE = {"email", "name", "role_id", "role_name", "enabled"}


def _dump(item) -> dict:
    return {k: v for k, v in item.__dict__.items() if not k.startswith("_")}


async def _require_rbac_write(user: dict, tenant: str, db: AsyncSession) -> None:
    """Refuse unless the caller's own role grants rbac-write in this tenant.
    A non-admin cannot administer roles/users (no self-escalation)."""
    role_name = user.get("role") or ""
    r = await db.execute(
        select(RBACRole).where(RBACRole.name == role_name, RBACRole.tenant_id == tenant)
    )
    role = r.scalar_one_or_none()
    perms = (role.permissions or {}).get("rbac", "") if role else ""
    if "w" not in perms and "a" not in perms and "d" not in perms:
        raise HTTPException(403, "RBAC administration requires an admin role")


@router.get("/roles")
async def list_roles(tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RBACRole).where(RBACRole.tenant_id == tenant).order_by(RBACRole.name))
    roles = r.scalars().all()
    if not roles:
        # Seed this tenant's own default roles on first read.
        for rd in DEFAULT_ROLES:
            db.add(RBACRole(id=new_id(), tenant_id=tenant, **rd))
        await db.flush()
        r = await db.execute(select(RBACRole).where(RBACRole.tenant_id == tenant).order_by(RBACRole.name))
        roles = r.scalars().all()
    return [_dump(role) for role in roles]


@router.post("/roles")
async def create_role(data: dict, user: dict = Depends(get_current_user),
                      tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    await _require_rbac_write(user, tenant, db)
    clean = {k: v for k, v in (data or {}).items() if k in _ROLE_WRITABLE}
    role = RBACRole(id=new_id(), tenant_id=tenant, **clean)
    db.add(role)
    await db.flush()
    return _dump(role)


@router.get("/users")
async def list_users(tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RBACUser).where(RBACUser.tenant_id == tenant).order_by(RBACUser.name))
    return [_dump(u) for u in r.scalars().all()]


@router.post("/users")
async def create_user(data: dict, user: dict = Depends(get_current_user),
                      tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    await _require_rbac_write(user, tenant, db)
    clean = {k: v for k, v in (data or {}).items() if k in _USER_WRITABLE}
    row = RBACUser(id=new_id(), tenant_id=tenant, **clean)
    db.add(row)
    await db.flush()
    return _dump(row)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, data: dict, user: dict = Depends(get_current_user),
                      tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    await _require_rbac_write(user, tenant, db)
    r = await db.execute(select(RBACUser).where(RBACUser.id == user_id, RBACUser.tenant_id == tenant))
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "User not found")
    for k, v in {k: v for k, v in (data or {}).items() if k in _USER_WRITABLE}.items():
        setattr(row, k, v)
    await db.flush()
    return _dump(row)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_current_user),
                      tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    await _require_rbac_write(user, tenant, db)
    r = await db.execute(select(RBACUser).where(RBACUser.id == user_id, RBACUser.tenant_id == tenant))
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "User not found")
    await db.delete(row)
    return {"deleted": user_id}


@router.get("/check/{user_id}/{module}/{action}")
async def check_permission(user_id: str, module: str, action: str,
                           tenant: str = Depends(get_current_tenant_id), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(RBACUser).where(RBACUser.id == user_id, RBACUser.tenant_id == tenant))
    row = r.scalar_one_or_none()
    if not row:
        return {"allowed": False, "reason": "User not found"}
    r2 = await db.execute(select(RBACRole).where(RBACRole.name == row.role_name, RBACRole.tenant_id == tenant))
    role = r2.scalar_one_or_none()
    if not role:
        return {"allowed": False, "reason": "Role not found"}
    perms = (role.permissions or {}).get(module, "")
    action_map = {"read": "r", "write": "w", "approve": "a", "delete": "d"}
    allowed = action_map.get(action, action[0] if action else "") in perms
    return {"allowed": allowed, "role": role.name, "module": module, "action": action}
