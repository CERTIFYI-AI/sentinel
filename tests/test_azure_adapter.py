# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the Microsoft Azure evidence adapter.

Offline throughout: the adapter talks HTTP, so the tests drive it with an
``httpx.MockTransport`` serving recorded-shape ARM and Microsoft Graph
payloads. The assertions are about judgement, not plumbing — a permission gap
must read as NOT_AVAILABLE, a port range must be parsed as a range, and a
finding must name the subscription it observed.
"""

from __future__ import annotations

import json

import httpx
import pytest

from sentinel.integrations.azure.adapter import AzureAdapter, AzureCredentials
from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.control_mapping import CATEGORY_TO_CONTROLS

SUBSCRIPTION = "11111111-2222-3333-4444-555555555555"

# Deliberately distinctive values: the leak tests assert these strings appear
# nowhere in a finding, and a common word like "secret" would make that
# assertion meaningless.
CREDS = AzureCredentials(
    tenant_id="66666666-7777-8888-9999-aaaaaaaaaaaa",
    client_id="app-0f3c1d2e-registration",
    client_secret="Zx9~unrepeatable-client-secret~9xZ",
    subscription_id=SUBSCRIPTION,
)


async def close(a: AzureAdapter) -> None:
    """Release the mock transport's client; the adapter only closes one it owns."""
    if a._client is not None:
        await a._client.aclose()


def adapter(routes: dict[str, object], *, token_status: int = 200) -> AzureAdapter:
    """Build an adapter whose HTTP layer serves `routes`, keyed by URL substring.

    A route value that is an int is served as that status code with an empty
    body, which is how a missing permission is simulated.
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/v2.0/token"):
            if token_status != 200:
                return httpx.Response(token_status, json={"error": "invalid_client"})
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3599})
        url = str(request.url)
        for fragment, payload in routes.items():
            if fragment in url:
                if isinstance(payload, int):
                    return httpx.Response(payload, json={"error": {"code": "AuthorizationFailed"}})
                return httpx.Response(200, json=payload)
        return httpx.Response(404, json={"error": {"code": "NotFound"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return AzureAdapter(CREDS, client=client)


# ── credentials and contract ────────────────────────────────────────────────


class TestCredentialsShape:
    def test_every_field_is_required(self):
        import dataclasses

        names = [f.name for f in dataclasses.fields(AzureCredentials)]
        assert names == ["tenant_id", "client_id", "client_secret", "subscription_id"]
        # None may default: a client-credentials flow cannot infer any of them.
        assert all(f.default is dataclasses.MISSING for f in dataclasses.fields(AzureCredentials))


class TestValidate:
    @pytest.mark.asyncio
    async def test_reader_on_the_subscription_validates(self):
        a = adapter({f"/subscriptions/{SUBSCRIPTION}?": {"subscriptionId": SUBSCRIPTION}})
        assert await a.validate() is True
        await close(a)

    @pytest.mark.asyncio
    async def test_missing_role_assignment_names_the_fix(self):
        a = adapter({})  # every ARM call 404s
        with pytest.raises(ValueError) as excinfo:
            await a.validate()
        assert "Reader role" in str(excinfo.value)
        await close(a)

    @pytest.mark.asyncio
    async def test_bad_secret_does_not_echo_the_client_id(self):
        a = adapter({}, token_status=401)
        with pytest.raises(ValueError) as excinfo:
            await a.validate()
        message = str(excinfo.value)
        assert "client secret" in message
        # An Entra error body can quote the submitted app registration; the
        # operator does not need it, and it must not reach a log or the UI.
        assert CREDS.client_id not in message
        assert CREDS.client_secret not in message
        await close(a)


# ── identity ────────────────────────────────────────────────────────────────


class TestIdentityChecks:
    @pytest.mark.asyncio
    async def test_missing_graph_permission_is_not_available_not_failed(self):
        # "We could not look" is a different fact from "MFA is not enforced",
        # and reporting the second when only the first is true is an invented
        # finding.
        a = adapter({"graph.microsoft.com": 403})
        (finding,) = await a._check_conditional_access_mfa()
        assert finding.status == "NOT_AVAILABLE"
        assert "Policy.Read.All" in finding.remediation
        await close(a)

    @pytest.mark.asyncio
    async def test_disabled_mfa_policy_does_not_count(self):
        a = adapter({"conditionalAccess/policies": {"value": [
            {"displayName": "Require MFA", "state": "disabled",
             "grantControls": {"builtInControls": ["mfa"]}},
        ]}})
        (finding,) = await a._check_conditional_access_mfa()
        assert finding.status == "FAILED"
        assert finding.severity == "CRITICAL"
        await close(a)

    @pytest.mark.asyncio
    async def test_enabled_mfa_policy_passes(self):
        a = adapter({"conditionalAccess/policies": {"value": [
            {"displayName": "Require MFA", "state": "enabled",
             "grantControls": {"builtInControls": ["mfa"]}},
        ]}})
        (finding,) = await a._check_conditional_access_mfa()
        assert finding.status == "PASSED"
        assert finding.result_details["mfa_policies"] == ["Require MFA"]
        await close(a)

    @pytest.mark.asyncio
    async def test_owner_sprawl_is_measured_against_all_assignments(self):
        owner = ("/providers/Microsoft.Authorization/roleDefinitions/"
                 "8e3af657-a8ff-443c-a75c-2fe8c4bcb635")
        reader = ("/providers/Microsoft.Authorization/roleDefinitions/"
                  "acdd72a7-3385-48ef-bd42-f606fba81ae7")
        a = adapter({"roleAssignments": {"value": [
            {"properties": {"principalId": f"p{i}", "roleDefinitionId": owner}}
            for i in range(9)
        ] + [
            {"properties": {"principalId": "reader", "roleDefinitionId": reader}}
        ]}})
        (finding,) = await a._check_owner_assignments()
        assert finding.status == "FAILED"
        assert len(finding.result_details["owner_principals"]) == 9
        assert finding.result_details["subscription_id"] == SUBSCRIPTION
        await close(a)


# ── storage ─────────────────────────────────────────────────────────────────


class TestStorageChecks:
    @pytest.mark.asyncio
    async def test_absent_allow_blob_public_access_is_not_read_as_disabled(self):
        # Accounts created before the default changed omit the field entirely.
        # Treating absence as "blocked" would clear a real exposure.
        a = adapter({"storageAccounts": {"value": [
            {"name": "legacy", "properties": {}},
        ]}})
        (finding,) = await a._check_storage_public_access()
        assert finding.status == "FAILED"
        assert finding.result_details["permissive_accounts"] == ["legacy"]
        await close(a)

    @pytest.mark.asyncio
    async def test_explicit_false_passes(self):
        a = adapter({"storageAccounts": {"value": [
            {"name": "modern", "properties": {"allowBlobPublicAccess": False}},
        ]}})
        (finding,) = await a._check_storage_public_access()
        assert finding.status == "PASSED"
        await close(a)

    @pytest.mark.asyncio
    async def test_weak_tls_fails_even_when_https_is_required(self):
        a = adapter({"storageAccounts": {"value": [
            {"name": "old-tls", "properties": {
                "supportsHttpsTrafficOnly": True, "minimumTlsVersion": "TLS1_0"}},
        ]}})
        (finding,) = await a._check_storage_https_only()
        assert finding.status == "FAILED"
        assert finding.result_details["weak_tls"] == ["old-tls"]
        assert finding.result_details["http_allowed"] == []
        await close(a)

    @pytest.mark.asyncio
    async def test_platform_managed_disk_keys_count_as_encrypted(self):
        # Platform-managed keys are genuine encryption at rest. Reporting them
        # as a gap would push customers toward work that changes nothing.
        a = adapter({"Microsoft.Compute/disks": {"value": [
            {"name": "osdisk", "properties": {
                "encryption": {"type": "EncryptionAtRestWithPlatformKey"}}},
        ]}})
        (finding,) = await a._check_disk_encryption()
        assert finding.status == "PASSED"
        assert finding.result_details["platform_managed_keys"] == 1
        await close(a)


# ── network ─────────────────────────────────────────────────────────────────


class TestNetworkChecks:
    @staticmethod
    def _nsg(rule_props: dict) -> dict:
        return {"value": [{
            "name": "nsg-app",
            "properties": {"securityRules": [{"name": "rule-1", "properties": rule_props}]},
        }]}

    @pytest.mark.asyncio
    async def test_https_from_internet_is_not_a_finding(self):
        a = adapter({"networkSecurityGroups": self._nsg({
            "direction": "Inbound", "access": "Allow",
            "sourceAddressPrefix": "Internet", "destinationPortRange": "443",
        })})
        (finding,) = await a._check_nsg_ingress()
        assert finding.status == "PASSED"
        await close(a)

    @pytest.mark.asyncio
    async def test_rdp_from_internet_is_critical(self):
        a = adapter({"networkSecurityGroups": self._nsg({
            "direction": "Inbound", "access": "Allow",
            "sourceAddressPrefix": "*", "destinationPortRange": "3389",
        })})
        (finding,) = await a._check_nsg_ingress()
        assert finding.status == "FAILED"
        assert finding.severity == "CRITICAL"
        await close(a)

    @pytest.mark.asyncio
    async def test_a_port_range_covering_an_admin_port_is_caught(self):
        # Azure writes single ports and ranges in the same field; a substring
        # match would let "1000-4000" hide 3389.
        a = adapter({"networkSecurityGroups": self._nsg({
            "direction": "Inbound", "access": "Allow",
            "sourceAddressPrefix": "*", "destinationPortRange": "1000-4000",
        })})
        (finding,) = await a._check_nsg_ingress()
        assert finding.status == "FAILED"
        await close(a)

    @pytest.mark.asyncio
    async def test_deny_rules_are_ignored(self):
        a = adapter({"networkSecurityGroups": self._nsg({
            "direction": "Inbound", "access": "Deny",
            "sourceAddressPrefix": "*", "destinationPortRange": "*",
        })})
        (finding,) = await a._check_nsg_ingress()
        assert finding.status == "PASSED"
        await close(a)

    @pytest.mark.asyncio
    async def test_outbound_rules_are_ignored(self):
        a = adapter({"networkSecurityGroups": self._nsg({
            "direction": "Outbound", "access": "Allow",
            "sourceAddressPrefix": "*", "destinationPortRange": "*",
        })})
        (finding,) = await a._check_nsg_ingress()
        assert finding.status == "PASSED"
        await close(a)

    def test_port_parser_handles_ranges_and_singles(self):
        parse = AzureAdapter._admin_ports_in
        assert parse({"22"}) == {22}
        assert 3389 in parse({"1000-4000"})
        assert parse({"8080"}) == set()
        assert parse({"not-a-port"}) == set()
        assert parse({""}) == set()


# ── secrets, logging, detection ─────────────────────────────────────────────


class TestOperationalChecks:
    @pytest.mark.asyncio
    async def test_vault_without_purge_protection_warns(self):
        a = adapter({"Microsoft.KeyVault/vaults": {"value": [
            {"name": "kv-prod", "properties": {"enableSoftDelete": True}},
        ]}})
        (finding,) = await a._check_keyvault_protection()
        assert finding.status == "WARNING"
        assert finding.result_details["vaults_without_purge_protection"] == ["kv-prod"]
        await close(a)

    @pytest.mark.asyncio
    async def test_diagnostic_setting_without_a_destination_does_not_count(self):
        a = adapter({"diagnosticSettings": {"value": [
            {"name": "empty", "properties": {}},
        ]}})
        (finding,) = await a._check_activity_log_export()
        assert finding.status == "FAILED"
        await close(a)

    @pytest.mark.asyncio
    async def test_export_to_a_workspace_passes(self):
        a = adapter({"diagnosticSettings": {"value": [
            {"name": "to-law", "properties": {"workspaceId": "/subscriptions/…/workspaces/law"}},
        ]}})
        (finding,) = await a._check_activity_log_export()
        assert finding.status == "PASSED"
        await close(a)

    @pytest.mark.asyncio
    async def test_free_tier_defender_is_reported_as_not_enabled(self):
        a = adapter({"Microsoft.Security/pricings": {"value": [
            {"name": "VirtualMachines", "properties": {"pricingTier": "Free"}},
        ]}})
        (finding,) = await a._check_defender_plans()
        assert finding.status == "FAILED"
        await close(a)


# ── whole-sync behaviour ────────────────────────────────────────────────────


class TestFetchAll:
    @pytest.mark.asyncio
    async def test_partial_permissions_still_yield_evidence(self):
        a = adapter({"storageAccounts": {"value": [
            {"name": "s1", "properties": {"allowBlobPublicAccess": False,
                                          "supportsHttpsTrafficOnly": True,
                                          "minimumTlsVersion": "TLS1_2"}},
        ]}})
        findings = await a.fetch_all()
        ids = {f.check_id for f in findings}
        assert "azure.storage.public_blob_access" in ids
        assert "azure.storage.https_only" in ids
        # Graph and diagnostics are unreachable here; they report that they
        # could not look rather than being silently dropped.
        by_id = {f.check_id: f for f in findings}
        assert by_id["azure.entra.conditional_access_mfa"].status == "NOT_AVAILABLE"
        assert by_id["azure.monitor.activity_log_export"].status == "NOT_AVAILABLE"
        await close(a)

    @pytest.mark.asyncio
    async def test_every_emitted_category_maps_to_controls(self):
        a = adapter({"storageAccounts": {"value": []}})
        findings = await a.fetch_all()
        assert findings, "the sync must produce something"
        for finding in findings:
            assert finding.check_category in CHECK_CATEGORIES
            assert finding.check_category in CATEGORY_TO_CONTROLS
            assert finding.check_id.startswith("azure.")
        await close(a)

    @pytest.mark.asyncio
    async def test_no_finding_carries_a_credential(self):
        a = adapter({"storageAccounts": {"value": []}})
        findings = await a.fetch_all()
        blob = json.dumps([f.result_details for f in findings])
        assert CREDS.client_secret not in blob
        assert CREDS.client_id not in blob
        await close(a)
