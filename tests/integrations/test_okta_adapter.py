# SPDX-License-Identifier: Apache-2.0
"""Okta adapter tests.

HTTP is mocked at the transport (httpx.MockTransport), not at the adapter, so
the real request path — URL construction, SSWS auth header, params, Link-header
pagination and status handling — is exercised.

The load-bearing assertions are the honesty ones: a check Sentinel could not
run must report NOT_AVAILABLE, never PASSED, and a policy that declares no
minimum length must not be read as a strong policy.
"""
from __future__ import annotations

import httpx
import pytest

from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.okta.adapter import OktaAdapter, OktaCredentials

CREDS = OktaCredentials(org_url="https://example.okta.com", api_token="ssws-test-token")


def _adapter(handler) -> OktaAdapter:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return OktaAdapter(CREDS, client=client)


def _json(request: httpx.Request, payload, status=200, headers=None) -> httpx.Response:
    return httpx.Response(status, json=payload, headers=headers or {})


# ── validate ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_sends_ssws_header_and_succeeds():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        seen["url"] = str(request.url)
        return _json(request, [])

    assert await _adapter(handler).validate() is True
    assert seen["auth"] == "SSWS ssws-test-token"
    assert seen["url"].startswith("https://example.okta.com/api/v1/users")


@pytest.mark.asyncio
async def test_validate_raises_operator_readable_error_on_401():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, {"errorSummary": "Invalid token"}, status=401)

    with pytest.raises(ValueError, match="rejected the API token"):
        await _adapter(handler).validate()


# ── individual checks ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mfa_policy_fails_when_no_active_policy():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [{"name": "legacy", "status": "INACTIVE"}])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_mfa_policy(a._client)
    assert findings[0].status == "FAILED"
    assert findings[0].severity == "CRITICAL"
    assert findings[0].check_category == "mfa_enforcement"


@pytest.mark.asyncio
async def test_mfa_policy_passes_with_active_policy():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [{"name": "Require MFA", "status": "ACTIVE"}])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_mfa_policy(a._client)
    assert findings[0].status == "PASSED"


@pytest.mark.asyncio
async def test_mfa_policy_reports_not_available_on_403():
    """A check we could not run is never reported as PASSED."""
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, {"errorSummary": "forbidden"}, status=403)

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_mfa_policy(a._client)
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_password_policy_without_min_length_is_not_a_pass():
    """No declared minimum is an unknown, not a strong policy."""
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [{"status": "ACTIVE", "settings": {"password": {}}}])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_password_policy(a._client)
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
@pytest.mark.parametrize("min_len,expected", [(8, "FAILED"), (12, "PASSED"), (16, "PASSED")])
async def test_password_policy_threshold(min_len, expected):
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [{
            "status": "ACTIVE",
            "settings": {"password": {"complexity": {"minLength": min_len}}},
        }])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_password_policy(a._client)
    assert findings[0].status == expected
    assert findings[0].result_details["min_length"] == min_len


@pytest.mark.asyncio
async def test_password_policy_uses_weakest_of_several():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [
            {"status": "ACTIVE", "settings": {"password": {"complexity": {"minLength": 16}}}},
            {"status": "ACTIVE", "settings": {"password": {"complexity": {"minLength": 8}}}},
        ])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_password_policy(a._client)
    assert findings[0].result_details["min_length"] == 8
    assert findings[0].status == "FAILED"


@pytest.mark.asyncio
async def test_super_admins_not_available_when_endpoint_absent():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, {}, status=404)

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_super_admins(a._client)
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_app_signon_flags_password_store_apps():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json(request, [
            {"label": "Federated", "signOnMode": "SAML_2_0"},
            {"label": "Shared password", "signOnMode": "SECURE_PASSWORD_STORE"},
        ])

    a = _adapter(handler)
    async with a._client:
        findings = await a._check_app_signon(a._client)
    assert findings[0].status == "WARNING"
    assert findings[0].result_details["non_federated_count"] == 1
    assert "Shared password" in findings[0].result_details["non_federated_sample"]


# ── pagination ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_link_header_pagination_follows_next():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return _json(
                request, [{"profile": {"login": "a@example.com"}, "lastLogin": None}],
                headers={"link": '<https://example.okta.com/api/v1/users?after=x>; rel="next"'},
            )
        return _json(request, [{"profile": {"login": "b@example.com"}, "lastLogin": None}])

    a = _adapter(handler)
    async with a._client:
        items, truncated = await a._get_paged(a._client, "/api/v1/users")
    assert len(items) == 2
    assert truncated is False
    assert calls["n"] == 2


def test_next_link_ignores_self_relation():
    resp = httpx.Response(200, headers={"link": '<https://x/self>; rel="self"'})
    assert OktaAdapter._next_link(resp) is None


# ── contract ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_all_survives_a_failing_check():
    """One endpoint erroring must not sink the whole sync."""
    def handler(request: httpx.Request) -> httpx.Response:
        if "/policies" in request.url.path:
            return _json(request, {"e": "boom"}, status=500)
        return _json(request, [])

    findings = await _adapter(handler).fetch_all()
    # The non-policy checks still produced findings.
    assert findings, "expected surviving checks to still report"
    assert all(f.check_category in CHECK_CATEGORIES for f in findings)


@pytest.mark.asyncio
async def test_all_check_ids_are_namespaced_and_categories_valid():
    def handler(request: httpx.Request) -> httpx.Response:
        if "/logs" in request.url.path:
            return _json(request, [])
        return _json(request, [])

    findings = await _adapter(handler).fetch_all()
    for f in findings:
        assert f.check_id.startswith("okta."), f.check_id
        assert f.check_category in CHECK_CATEGORIES
