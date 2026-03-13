
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sentinel.api.db import get_db, RBACRole, RBACUser, new_id, now
from typing import Optional

router = APIRouter()

DEFAULT_ROLES = [
    {"name":"Super Admin","description":"Full system access","is_system":True,
     "permissions":{"policies":"rwad","models":"rwad","controls":"rwad","hitl":"rwad","rbac":"rwad","trust_engine":"rwad","vendors":"rwad","agents":"rwad","datasets":"rwad","bias_audits":"rwad","evidence":"rwad","risk_map":"rwad","reg_radar":"rwad","settings":"rwad"}},
    {"name":"Compliance Officer","description":"Policy and compliance management","is_system":True,
     "permissions":{"policies":"rwa","models":"r","controls":"rwa","hitl":"rwa","rbac":"r","trust_engine":"r","vendors":"r","agents":"r","datasets":"r","bias_audits":"rw","evidence":"rw","risk_map":"r","reg_radar":"rwa","settings":"r"}},
    {"name":"AI/ML Engineer","description":"Model and dataset management","is_system":True,
     "permissions":{"policies":"r","models":"rw","controls":"r","hitl":"r","rbac":"","trust_engine":"rw","vendors":"r","agents":"rw","datasets":"rw","bias_audits":"rw","evidence":"r","risk_map":"r","reg_radar":"r","settings":"r"}},
    {"name":"Risk Analyst","description":"Risk assessment and monitoring","is_system":True,
     "permissions":{"policies":"r","models":"r","controls":"r","hitl":"r","rbac":"","trust_engine":"r","vendors":"rw","agents":"r","datasets":"r","bias_audits":"r","evidence":"r","risk_map":"rw","reg_radar":"rw","settings":"r"}},
    {"name":"Auditor","description":"Read-only audit access","is_system":True,
     "permissions":{"policies":"r","models":"r","controls":"r","hitl":"r","rbac":"r","trust_engine":"r","vendors":"r","agents":"r","datasets":"r","bias_audits":"r","evidence":"r","risk_map":"r","reg_radar":"r","settings":"r"}},
    {"name":"HITL Reviewer","description":"Human-in-the-loop review","is_system":True,
     "permissions":{"policies":"r","models":"r","controls":"r","hitl":"rwa","rbac":"","trust_engine":"r","vendors":"r","agents":"r","datasets":"r","bias_audits":"r","evidence":"r","risk_map":"r","reg_radar":"r","settings":""}},
    {"name":"Vendor Manager","description":"Vendor oversight","is_system":True,
     "permissions":{"policies":"r","models":"r","controls":"r","hitl":"r","rbac":"","trust_engine":"r","vendors":"rwad","agents":"r","datasets":"r","bias_audits":"r","evidence":"rw","risk_map":"r","reg_radar":"r","settings":""}},
]

@router.get("/roles")
async def list_roles(db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(RBACRole).order_by(RBACRole.name))
    roles = r.scalars().all()
    if not roles:
        for rd in DEFAULT_ROLES:
            role = RBACRole(id=new_id(), **rd)
            db.add(role)
        await db.flush()
        r = await db.execute(select(RBACRole).order_by(RBACRole.name))
        roles = r.scalars().all()
    return [{k:v for k,v in role.__dict__.items() if not k.startswith("_")} for role in roles]

@router.post("/roles")
async def create_role(data: dict, db: AsyncSession=Depends(get_db)):
    role = RBACRole(id=new_id(), **{k:v for k,v in data.items() if k != "id"})
    db.add(role)
    await db.flush()
    return {k:v for k,v in role.__dict__.items() if not k.startswith("_")}

@router.get("/users")
async def list_users(db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(RBACUser).order_by(RBACUser.name))
    users = r.scalars().all()
    return [{k:v for k,v in u.__dict__.items() if not k.startswith("_")} for u in users]

@router.post("/users")
async def create_user(data: dict, db: AsyncSession=Depends(get_db)):
    user = RBACUser(id=new_id(), **{k:v for k,v in data.items() if k != "id"})
    db.add(user)
    await db.flush()
    return {k:v for k,v in user.__dict__.items() if not k.startswith("_")}

@router.patch("/users/{user_id}")
async def update_user(user_id: str, data: dict, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(RBACUser).where(RBACUser.id==user_id))
    user = r.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    for k,v in data.items():
        if k not in ("id","created_at"): setattr(user,k,v)
    return {k:v for k,v in user.__dict__.items() if not k.startswith("_")}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(RBACUser).where(RBACUser.id==user_id))
    user = r.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    await db.delete(user)
    return {"deleted": user_id}

@router.get("/check/{user_id}/{module}/{action}")
async def check_permission(user_id: str, module: str, action: str, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(RBACUser).where(RBACUser.id==user_id))
    user = r.scalar_one_or_none()
    if not user: return {"allowed": False, "reason": "User not found"}
    r2 = await db.execute(select(RBACRole).where(RBACRole.name==user.role_name))
    role = r2.scalar_one_or_none()
    if not role: return {"allowed": False, "reason": "Role not found"}
    perms = role.permissions.get(module, "")
    action_map = {"read":"r","write":"w","approve":"a","delete":"d"}
    allowed = action_map.get(action, action[0]) in perms
    return {"allowed": allowed, "role": role.name, "module": module, "action": action}
