"""Role-Based Access Control (RBAC) for Sentinel.

Defines roles (admin, ciso, security_lead, ml_engineer, compliance_officer)
and enforces permission checks on API routes via FastAPI dependencies.
"""
from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import Depends, HTTPException, status

from sentinel.auth.jwt_handler import get_current_user


class Role(str, Enum):
    ADMIN = "admin"
    CISO = "ciso"
    SECURITY_LEAD = "security_lead"
    ML_ENGINEER = "ml_engineer"
    COMPLIANCE_OFFICER = "compliance_officer"
    VIEWER = "viewer"


# Permission matrix: role -> set of allowed actions
PERMISSIONS: dict[Role, set[str]] = {
    Role.ADMIN: {
        "read:all", "write:all", "delete:all",
        "manage:users", "manage:tenants", "manage:settings",
        "export:reports", "run:campaigns", "run:evals",
        "manage:models", "manage:tasks", "manage:compliance",
    },
    Role.CISO: {
        "read:all", "export:reports", "read:posture",
        "read:board_report", "export:board_report",
        "manage:tasks", "read:audit_log",
    },
    Role.SECURITY_LEAD: {
        "read:security", "write:security",
        "run:campaigns", "read:vulnerabilities",
        "manage:tasks", "read:compliance",
    },
    Role.ML_ENGINEER: {
        "read:models", "write:models", "manage:models",
        "run:evals", "read:evals", "write:evals",
        "read:datasets", "write:datasets",
        "read:proxy", "manage:tasks",
    },
    Role.COMPLIANCE_OFFICER: {
        "read:compliance", "write:compliance",
        "read:audit_log", "export:reports",
        "manage:tasks", "read:security",
        "read:posture",
    },
    Role.VIEWER: {
        "read:all",
    },
}


def has_permission(role: Role, action: str) -> bool:
    """Check if a role has a specific permission."""
    allowed = PERMISSIONS.get(role, set())
    if "write:all" in allowed or "read:all" in allowed:
        prefix = action.split(":")[0]
        if prefix == "read" and "read:all" in allowed:
            return True
        if "write:all" in allowed:
            return True
    return action in allowed


def require_role(*roles: Role):
    """FastAPI dependency that enforces role membership.

    Usage:
        @router.get("/ciso/posture", dependencies=[Depends(require_role(Role.CISO, Role.ADMIN))])
    """
    async def _check(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_role_str = current_user.get("role", "viewer")
        try:
            user_role = Role(user_role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unknown role: {user_role_str}",
            )

        if user_role not in roles and Role.ADMIN not in roles:
            if user_role != Role.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{user_role.value}' not authorized for this endpoint.",
                )
        return current_user

    return _check


def require_permission(action: str):
    """FastAPI dependency that enforces a specific permission.

    Usage:
        @router.post("/campaigns", dependencies=[Depends(require_permission("run:campaigns"))])
    """
    async def _check(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_role_str = current_user.get("role", "viewer")
        try:
            user_role = Role(user_role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unknown role: {user_role_str}",
            )

        if not has_permission(user_role, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{action}' denied for role '{user_role.value}'.",
            )
        return current_user

    return _check
