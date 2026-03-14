"""Authentication and JWT handling."""
from sentinel.auth.jwt_handler import get_current_user, create_access_token, get_current_tenant

try:
    from sentinel.auth.rbac import require_role, RBACMiddleware
except ImportError:
    require_role = None
    RBACMiddleware = None

__all__ = [
    "get_current_user",
    "create_access_token",
    "get_current_tenant",
    "require_role",
    "RBACMiddleware",
]
