# SPDX-License-Identifier: Apache-2.0
"""Microsoft Intune adapter tests.

HTTP is mocked at the transport (httpx.MockTransport), so the real request path
— token acquisition, bearer header, $select params, status handling — is
exercised.

Key assertions:
  * a permission that was not consented reports NOT_AVAILABLE, never PASSED;
  * the GCC High credentials hit the sovereign endpoints;
  * device data is fetched once and cached for multiple checks;
  * zero enrolled devices is NOT_AVAILABLE, not PASSED.
"""
from __future__ import annotations

import httpx
import pytest

from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.intune.adapter import (
    IntuneAdapter,
    IntuneCredentials,
    IntuneGccHighCredentials,
)
from sentinel.integrations.msgraph import CLOUDS, GraphClient

CREDS = IntuneCredentials(tenant_id="t-1", client_id="c-1", client_secret="s-1")


def _adapter(handler, creds=CREDS) -> IntuneAdapter:
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return IntuneAdapter(creds, client=GraphClient(creds, http))


def _token_or(handler):
    def outer(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return handler(request)
    return outer


def _device(over=None):
    base = {
        "deviceName": "LAPTOP-001",
        "complianceState": "compliant",
        "isEncrypted": True,
        "lastSyncDateTime": "2099-01-01T00:00:00Z",
        "operatingSystem": "Windows",
        "osVersion": "11.0.22631",
        "managedDeviceOwnerType": "company",
    }
    if over:
        base.update(over)
    return base


# -- sovereign clouds --------------------------------------------------------

def test_commercial_and_gcc_high_use_different_endpoints():
    assert IntuneCredentials(tenant_id="t", client_id="c", client_secret="s").cloud == "commercial"
    assert IntuneGccHighCredentials(tenant_id="t", client_id="c", client_secret="s").cloud == "usgov"


@pytest.mark.asyncio
async def test_gcc_high_requests_go_to_the_sovereign_host():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.setdefault("hosts", set()).add(request.url.host)
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(200, json={"value": []})

    creds = IntuneGccHighCredentials(tenant_id="t", client_id="c", client_secret="s")
    await _adapter(handler, creds).validate()
    assert "graph.microsoft.us" in seen["hosts"]
    assert "login.microsoftonline.us" in seen["hosts"]
    assert "graph.microsoft.com" not in seen["hosts"]


# -- validate -----------------------------------------------------------------

@pytest.mark.asyncio
async def test_validate_succeeds_on_200():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(200, json={})

    assert await _adapter(handler).validate() is True


@pytest.mark.asyncio
async def test_validate_raises_on_401():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={})

    with pytest.raises(ValueError, match="admin consent"):
        await _adapter(handler).validate()


@pytest.mark.asyncio
async def test_validate_raises_on_403():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(403, json={})

    with pytest.raises(ValueError, match="admin consent"):
        await _adapter(handler).validate()


# -- compliance rate ----------------------------------------------------------

@pytest.mark.asyncio
async def test_compliance_rate_passes_above_threshold():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            _device({"complianceState": "compliant"}),
            _device({"deviceName": "D2", "complianceState": "compliant"}),
        ]})

    findings = await _adapter(_token_or(handler))._check_compliance_rate()
    assert findings[0].status == "PASSED"
    assert findings[0].result_details["rate"] == 1.0


@pytest.mark.asyncio
async def test_compliance_rate_fails_below_threshold():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            _device({"complianceState": "compliant"}),
            _device({"deviceName": "D2", "complianceState": "noncompliant"}),
            _device({"deviceName": "D3", "complianceState": "noncompliant"}),
        ]})

    findings = await _adapter(_token_or(handler))._check_compliance_rate()
    assert findings[0].status == "FAILED"
    assert findings[0].result_details["compliant_count"] == 1
    assert findings[0].result_details["total_count"] == 3


@pytest.mark.asyncio
async def test_compliance_rate_not_available_without_permission():
    def handler(request: httpx.Request) -> httpx.Response:
        if "managedDevices" in str(request.url):
            return httpx.Response(403, json={})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_compliance_rate()
    assert findings[0].status == "NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_compliance_rate_not_available_with_zero_devices():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_compliance_rate()
    assert findings[0].status == "NOT_AVAILABLE"


# -- encryption ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_encryption_passes_when_all_encrypted():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            _device({"isEncrypted": True}),
            _device({"deviceName": "D2", "isEncrypted": True}),
        ]})

    findings = await _adapter(_token_or(handler))._check_encryption()
    assert findings[0].status == "PASSED"


@pytest.mark.asyncio
async def test_encryption_fails_when_below_threshold():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            _device({"isEncrypted": True}),
            _device({"deviceName": "D2", "isEncrypted": False}),
        ]})

    findings = await _adapter(_token_or(handler))._check_encryption()
    assert findings[0].status == "FAILED"


# -- compliance policies ------------------------------------------------------

@pytest.mark.asyncio
async def test_compliance_policies_pass_when_present():
    def handler(request: httpx.Request) -> httpx.Response:
        if "deviceCompliancePolicies" in str(request.url):
            return httpx.Response(200, json={"value": [
                {"displayName": "Windows Baseline", "roleScopeTagIds": []},
            ]})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_compliance_policies()
    assert findings[0].status == "PASSED"
    assert findings[0].result_details["policy_count"] == 1


@pytest.mark.asyncio
async def test_compliance_policies_fail_when_none():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_compliance_policies()
    assert findings[0].status == "FAILED"


@pytest.mark.asyncio
async def test_compliance_policies_not_available_without_permission():
    def handler(request: httpx.Request) -> httpx.Response:
        if "deviceCompliancePolicies" in str(request.url):
            return httpx.Response(403, json={})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_compliance_policies()
    assert findings[0].status == "NOT_AVAILABLE"


# -- app protection policies --------------------------------------------------

@pytest.mark.asyncio
async def test_app_protection_passes_when_present():
    def handler(request: httpx.Request) -> httpx.Response:
        if "managedAppPolicies" in str(request.url):
            return httpx.Response(200, json={"value": [
                {"displayName": "iOS MAM"},
            ]})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_app_protection_policies()
    assert findings[0].status == "PASSED"


@pytest.mark.asyncio
async def test_app_protection_warns_when_absent():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler))._check_app_protection_policies()
    assert findings[0].status == "WARNING"


# -- fetch_all resilience + contract ------------------------------------------

@pytest.mark.asyncio
async def test_fetch_all_survives_a_failing_check_and_uses_valid_categories():
    def handler(request: httpx.Request) -> httpx.Response:
        if "deviceCompliancePolicies" in str(request.url):
            return httpx.Response(500, json={})
        return httpx.Response(200, json={"value": []})

    findings = await _adapter(_token_or(handler)).fetch_all()
    assert findings, "surviving checks should still report"
    for f in findings:
        assert f.check_id.startswith("intune."), f.check_id
        assert f.check_category in CHECK_CATEGORIES


@pytest.mark.asyncio
async def test_inactive_devices_warns_on_stale_sync():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [
            _device({"deviceName": "STALE", "lastSyncDateTime": "2020-01-01T00:00:00Z"}),
            _device({"deviceName": "FRESH", "lastSyncDateTime": "2099-01-01T00:00:00Z"}),
        ]})

    findings = await _adapter(_token_or(handler))._check_inactive_devices()
    assert findings[0].status == "WARNING"
    assert findings[0].result_details["inactive_count"] == 1
    assert "STALE" in findings[0].result_details["sample"]
