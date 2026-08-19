"""Tenant-isolation unit tests for the FastAPI backend (TD-025 / audit H2).

Pins the two pieces the router scoping relies on:
  * get_current_tenant_id resolves the tenant from the *verified* JWT and
    refuses a token that carries none (no silent fallback to a shared tenant);
  * the ORM routers' write whitelist drops server-owned and unknown keys, so a
    client cannot mass-assign tenant_id/id or protected columns.
"""
import os
from types import SimpleNamespace

import pytest
from jose import jwt

os.environ.setdefault("SENTINEL_SECRET_KEY", "ci-only-signing-key-not-a-real-secret-0000")

from sentinel.api import deps  # noqa: E402
from fastapi import HTTPException  # noqa: E402


def _req(token: str | None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return SimpleNamespace(headers=headers, state=SimpleNamespace())


def _mint(**claims) -> str:
    return jwt.encode(claims, deps._SECRET_KEY, algorithm="HS256")


def test_tenant_resolved_from_signed_jwt():
    tok = _mint(sub="u1", tenant_id="tenant-A", role="Auditor")
    assert deps.get_current_tenant_id(_req(tok)) == "tenant-A"


def test_org_id_claim_accepted_as_tenant():
    tok = _mint(sub="u1", org_id="tenant-B")
    assert deps.get_current_tenant_id(_req(tok)) == "tenant-B"


def test_token_without_tenant_is_rejected():
    tok = _mint(sub="u1")  # no tenant_id / org_id
    with pytest.raises(HTTPException) as exc:
        deps.get_current_tenant_id(_req(tok))
    assert exc.value.status_code == 401


def test_no_token_is_rejected():
    with pytest.raises(HTTPException):
        deps.get_current_tenant_id(_req(None))


def test_forged_token_is_rejected():
    # Sign with a key that is deliberately NOT the server secret (derived, not a
    # hardcoded literal) so the signature fails verification.
    wrong_key = deps._SECRET_KEY + "-tampered"
    bad = jwt.encode({"sub": "u1", "tenant_id": "X"}, wrong_key, algorithm="HS256")
    with pytest.raises(HTTPException):
        deps.get_current_tenant_id(_req(bad))


def test_current_user_prefers_middleware_state():
    r = _req(None)
    r.state.user = {"id": "u1", "tenant_id": "tenant-A", "role": "Super Admin", "email": "a@b.c"}
    assert deps.get_current_user(r)["role"] == "Super Admin"


def test_orm_router_write_whitelist_excludes_server_owned_keys():
    from sentinel.api import trust_engine_router as tr
    assert "tenant_id" not in tr._WRITABLE
    assert "id" not in tr._WRITABLE
    # unknown/injected keys are dropped
    cleaned = tr._clean({"trust_score": 50, "tenant_id": "other", "id": "x", "bogus": 1})
    assert "tenant_id" not in cleaned and "id" not in cleaned and "bogus" not in cleaned
    assert cleaned.get("trust_score") == 50
