# SPDX-License-Identifier: Apache-2.0
"""Microsoft Entra ID adapter tests.

HTTP is mocked at the transport (httpx.MockTransport), so the real request path
— token acquisition, bearer header, $select/$filter params, @odata.nextLink
paging and status handling — is exercised.

Two assertions carry the most weight:
  * a permission that was not consented reports NOT_AVAILABLE, never PASSED;
  * the GCC High credentials hit the sovereign endpoints, because a GCC High
    connection querying commercial Graph would report an empty tenant as clean.
"""
from __future__ import annotations

import httpx
import pytest

from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.entra.adapter import (
    EntraAdapter,
    EntraCredentials,
    EntraGccHighCredentials,
)
from sentinel.integrations.msgraph import CLOUDS, GraphClient

CREDS = EntraCredentials(tenant_id="t-1", client_id="c-1", client_secret="s-1")


def _adapter(handler, creds=CREDS) -> EntraAdapter:
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return EntraAdapter(creds, client=GraphClient(creds, http))


def _token_or(handler):
    """Wrap a handler so the token endpoint always succeeds."""
    def outer(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return handler(request)
    return outer


# ── sovereign clouds ────────────────────────────────────────────────────────

def test_commercial_and_gcc_high_use_different_endpoints():
    assert CLOUDS["commercial"]["graph"] == "https://graph.microsoft.com"
    assert CLOUDS["usgov"]["graph"] == "https://graph.microsoft.us"
    assert EntraCredentials(tenant_id="t", client_id="c", client_secret="s").cloud == "commercial"
    assert EntraGccHighCredentials(tenant_id="t", client_id="c", client_secret="s").cloud == "usgov"


@pytest.mark.asyncio
async def test_gcc_high_requests_go_to_the_sovereign_host():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.setdefault("hosts", set()).add(request.url.host)
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(200, json={"value": []})

    creds = EntraGccHighCredentials(tenant_id="t", client_id="c", client_secret="s")
    await _adapter(handler, creds).validate()
    assert "graph.microsoft.us" in seen["hosts"]
    assert "login.microsoftonline.us" in seen["hosts"]
    assert "graph.microsoft.com" not in seen["hosts"]


# ── validate ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_sends_bearer_token():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok-abc"})
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={"value": []})

    assert await _adapter(handler).validate() is True
    assert seen["auth"] == "Bearer tok-abc"


@pytest.mark.asyncio
async def test_validate_error_never_echoes_the_client_id():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error_description": "AADSTS7000215 for client c-1"})

    with pytest.raises(ValueError) as exc:
        await _adapter(handler).validate()
    assert "c-1" not in str(exc.value)


@pytest.mark.asyncio
async def test_validate_explains_missing_consent_on_403():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(403, json={})

    with pytest.raises(ValueError, match="admin consent"):
        await _adapter(handler).validate()


# ── MFA: two legitimate configurations ──────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_passes_on_security_defaults():
    def handler(request: httpx.Request) -> httpx.Response:
        if "identitySecurityDefaults" in request.url.path:
            return httpx.Response(200, json={"isEnabled": True})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_mfa_enforced()
    assert findings[0].status == "PASSED"
    assert findings[0].result_details["security_defaults_enabled"] is True


@pytest.mark.asyncio
async def test_mfa_passes_on_conditional_access_when_defaults_off():
    """A tenant on Conditional Access has security defaults OFF — checking only
    defaults would fail a correctly configured tenant."""
    def handler(request: httpx.Request) -> httpx.Response:
        if "identitySecurityDefaults" in request.url.path:
            return httpx.Response(200, json={"isEnabled": False})
        return httpx.Response(200, json={"value": [
            {"displayName": "Require MFA", "state": "enabled",
             "grantControls": {"builtInControls": ["mfa"]}},
        ]})

    findings = await _adapter(_token_or(handler))._check_mfa_enforced()
    assert findings[0].status == "PASSED"
    assert findings[0].result_details["mfa_conditional_access_policies"] == ["Require MFA"]


@pytest.mark.asyncio
async def test_mfa_fails_when_neither_is_configured():
    def handler(request: httpx.Request) -> httpx.Response:
        if "identitySecurityDefaults" in request.url.path:
            return httpx.Response(200, json={"isEnabled": False})
        return httpx.Response(200, json={"value": [
            {"displayName": "Report only", "state": "enabledForReportingButNotEnforced",
             "grantControls": {"builtInControls": ["mfa"]}},
        ]})

    findings = await _adapter(_token_or(handler))._check_mfa_enforced()
    assert findings[0].status == "FAILED"
    assert findings[0].severity == "CRITICAL"


@pytest.mark.asyncio
async def test_mfa_not_available_without_policy_permission():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={})

    findings = await _adapter(_token_or(handler))._check_mfa_enforced()
    assert findings[0].status == "NOT_AVAILABLE"


# ── other checks ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_global_admin_count_warns_above_threshold():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/directoryRoles"):
            return httpx.Response(200, json={"value": [
                {"id": "role-1", "roleTemplateId": "62e90394-69f5-4237-9190-012177145e10"},
            ]})
        return httpx.Response(200, json={"value": [{"id": f"u{i}"} for i in range(7)]})

    findings = await _adapter(_token_or(handler))._check_global_admins()
    assert findings[0].status == "WARNING"
    assert findings[0].result_details["global_admin_count"] == 7


@pytest.mark.asyncio
async def test_absent_global_admin_role_is_unknown_not_zero():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_global_admins()
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_stale_signin_not_available_without_p1():
    """Graph 400s the $select when signInActivity is unlicensed — that is an
    unknown, not a clean leaver review."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={})

    findings = await _adapter(_token_or(handler))._check_stale_signin()
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_stale_signin_counts_only_enabled_accounts():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            {"userPrincipalName": "old@x", "accountEnabled": True,
             "signInActivity": {"lastSignInDateTime": "2020-01-01T00:00:00Z"}},
            {"userPrincipalName": "fresh@x", "accountEnabled": True,
             "signInActivity": {"lastSignInDateTime": "2099-01-01T00:00:00Z"}},
            {"userPrincipalName": "disabled@x", "accountEnabled": False,
             "signInActivity": {"lastSignInDateTime": "2020-01-01T00:00:00Z"}},
        ]})

    findings = await _adapter(_token_or(handler))._check_stale_signin()
    assert findings[0].result_details["enabled_users_examined"] == 2
    assert findings[0].result_details["stale_count"] == 1
    assert "old@x" in findings[0].result_details["sample"]


@pytest.mark.asyncio
async def test_app_credential_expiry_separates_expired_from_expiring():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            {"displayName": "Dead", "passwordCredentials":
                [{"endDateTime": "2020-01-01T00:00:00Z"}], "keyCredentials": []},
            {"displayName": "Fine", "passwordCredentials":
                [{"endDateTime": "2099-01-01T00:00:00Z"}], "keyCredentials": []},
        ]})

    findings = await _adapter(_token_or(handler))._check_app_credentials()
    assert findings[0].status == "WARNING"
    assert findings[0].result_details["expired_apps"] == ["Dead"]


# ── paging + contract ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_odata_next_link_paging():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(200, json={
                "value": [{"id": "a"}],
                "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?skip=1",
            })
        return httpx.Response(200, json={"value": [{"id": "b"}]})

    creds = CREDS
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    items, truncated = await GraphClient(creds, http).get_paged("/v1.0/users")
    assert [i["id"] for i in items] == ["a", "b"]
    assert truncated is False


@pytest.mark.asyncio
async def test_fetch_all_survives_a_failing_check_and_uses_valid_categories():
    def handler(request: httpx.Request) -> httpx.Response:
        if "directoryRoles" in request.url.path:
            return httpx.Response(500, json={})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler)).fetch_all()
    assert findings, "surviving checks should still report"
    for f in findings:
        assert f.check_id.startswith("entra."), f.check_id
        assert f.check_category in CHECK_CATEGORIES
