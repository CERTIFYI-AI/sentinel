# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Azure integration adapter.

No new dependency: this talks to the Azure Resource Manager and Microsoft
Graph REST APIs over ``httpx``, which Sentinel already ships. The management
SDKs would pull in a large dependency tree to wrap the same handful of GET
requests, and every call this adapter makes is a GET.

Authentication is the OAuth 2.0 **client credentials** flow against an Entra
ID app registration — the standard shape for an unattended auditor. Grant it
the **Reader** role on the subscription (and, if you want the identity
checks, ``Policy.Read.All`` on Microsoft Graph). Reader cannot change
anything, which is the point: evidence collection must not be able to alter
what it is evidencing.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬────────────────────────┬──────────────────────────────────────────┐
│ check_id                             │ check_category         │ Controls mapped                          │
├──────────────────────────────────────┼────────────────────────┼──────────────────────────────────────────┤
│ azure.entra.conditional_access_mfa   │ mfa_enforcement        │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2      │
│                                      │                        │ · HIPAA 164.312(a)(2)(i) · PCI 8.3       │
│ azure.rbac.owner_assignments         │ least_privilege        │ SOC2 CC6.3 · ISO27001 A.9.2.3 · PCI 7.1  │
│ azure.storage.public_blob_access     │ access_control         │ SOC2 CC6.1–6.3 · ISO27001 A.9.1.1        │
│                                      │                        │ · PCI 7.1/7.2 · GDPR Art. 25             │
│ azure.storage.https_only             │ encryption_in_transit  │ SOC2 CC9.1 · ISO27001 A.10.1.1           │
│                                      │                        │ · HIPAA 164.312(e)(2)(ii) · PCI 4.1      │
│ azure.disks.encryption_at_rest       │ encryption_at_rest     │ SOC2 CC9.1 · ISO27001 A.10.1.1           │
│                                      │                        │ · PCI 3.4 · GDPR Art. 32                 │
│ azure.network.nsg_ingress            │ network_security       │ SOC2 CC6.6/CC6.7 · ISO27001 A.13.1.1     │
│                                      │                        │ · PCI 1.1/1.2                            │
│ azure.keyvault.purge_protection      │ secret_management      │ SOC2 CC6.1 · ISO27001 A.9.2.4 · PCI 8.2  │
│ azure.monitor.activity_log_export    │ audit_logging          │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1       │
│                                      │                        │ · HIPAA 164.312(b) · PCI 10.1/10.2       │
│ azure.defender.plans                 │ vulnerability_mgmt     │ SOC2 CC7.1 · ISO27001 A.12.6.1 · PCI 6.3 │
└──────────────────────────────────────┴────────────────────────┴──────────────────────────────────────────┘

Scope note: every resource check runs against the one configured
``subscription_id``. A tenant with several subscriptions connects each one,
so a finding always states the subscription it observed rather than implying
tenant-wide coverage.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_ARM = "https://management.azure.com"
_GRAPH = "https://graph.microsoft.com"
_LOGIN = "https://login.microsoftonline.com"

# Pinned api-versions. Azure resource providers version independently, and an
# unpinned call is a silent breakage waiting for the next provider release.
_API_STORAGE = "2023-01-01"
_API_DISKS = "2023-04-02"
_API_NETWORK = "2023-09-01"
_API_KEYVAULT = "2023-07-01"
_API_ROLES = "2022-04-01"
_API_SECURITY = "2023-01-01"
_API_DIAGNOSTICS = "2021-05-01-preview"

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: Well-known id of the built-in Owner role definition. Stable across tenants.
_OWNER_ROLE_ID = "8e3af657-a8ff-443c-a75c-2fe8c4bcb635"

#: Ports whose exposure to the internet is a finding regardless of intent.
_ADMIN_PORTS = {22, 3389, 445, 1433, 3306, 5432, 6379, 27017, 9200}
_INTERNET_SOURCES = {"*", "0.0.0.0/0", "internet", "any", "::/0"}


@dataclass
class AzureCredentials:
    """Matches dashboard/src/integrations/azure/config.ts credentialFields."""

    tenant_id: str
    client_id: str
    client_secret: str
    subscription_id: str


class AzureAdapter:
    """Reads security posture from one Azure subscription over ARM REST.

    No database access; the worker persists returned findings. An injectable
    ``client`` keeps the tests offline.
    """

    def __init__(self, credentials: AzureCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._owns_client = client is None
        self._tokens: dict[str, str] = {}

    # ── transport ───────────────────────────────────────────────────────────

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    async def _token(self, resource: str) -> str:
        """Client-credentials token for one audience, cached per sync run.

        Cached in memory only, for the life of this adapter instance. Nothing
        here writes a token to disk, a log line or the database.
        """
        if resource in self._tokens:
            return self._tokens[resource]
        response = await self._http().post(
            f"{_LOGIN}/{self.credentials.tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_secret,
                "scope": f"{resource}/.default",
            },
        )
        if response.status_code != 200:
            # Deliberately not echoing the response body: an Entra error can
            # quote the submitted client_id, and the operator does not need it
            # to act on this.
            raise ValueError(
                f"Azure rejected the app registration for {resource} "
                f"(HTTP {response.status_code}). Check the tenant id, client id, "
                "client secret and that the secret has not expired."
            )
        token = str(response.json().get("access_token", ""))
        self._tokens[resource] = token
        return token

    async def _get(self, url: str, *, resource: str = _ARM) -> dict:
        """One authenticated GET. Raises on any non-200 so a caller can decide
        whether that means FAILED or NOT_AVAILABLE — the distinction between
        "we looked and it is wrong" and "we could not look" matters."""
        response = await self._http().get(
            url if url.startswith("http") else f"{resource}{url}",
            headers={"Authorization": f"Bearer {await self._token(resource)}"},
        )
        if response.status_code != 200:
            raise ValueError(f"{url} returned HTTP {response.status_code}")
        return response.json()

    async def _list(self, path: str, api_version: str, *, resource: str = _ARM) -> list[dict]:
        """Collect every page. A truncated list turns a posture check into a
        wrong answer on exactly the large subscriptions that need it most."""
        sep = "&" if "?" in path else "?"
        url = f"{path}{sep}api-version={api_version}" if resource == _ARM else path
        out: list[dict] = []
        seen = 0
        while url and seen < 100:  # hard stop; a nextLink loop must not hang a sync
            payload = await self._get(url, resource=resource)
            out.extend(payload.get("value", []))
            url = payload.get("nextLink") or payload.get("@odata.nextLink") or ""
            seen += 1
        return out

    @property
    def _sub(self) -> str:
        return f"/subscriptions/{self.credentials.subscription_id}"

    async def aclose(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            await self._get(f"{self._sub}?api-version=2022-12-01")
            return True
        except ValueError as exc:
            raise ValueError(
                f"Azure credentials rejected for subscription "
                f"{self.credentials.subscription_id!r}: {exc}. Confirm the app "
                "registration holds the Reader role on this subscription."
            ) from exc
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach Azure Resource Manager: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        checks = (
            self._check_conditional_access_mfa(),
            self._check_owner_assignments(),
            self._check_storage_public_access(),
            self._check_storage_https_only(),
            self._check_disk_encryption(),
            self._check_nsg_ingress(),
            self._check_keyvault_protection(),
            self._check_activity_log_export(),
            self._check_defender_plans(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("azure check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── identity ────────────────────────────────────────────────────────────

    async def _check_conditional_access_mfa(self) -> list[IntegrationFinding]:
        try:
            policies = await self._list(
                f"{_GRAPH}/v1.0/identity/conditionalAccess/policies",
                "", resource=_GRAPH,
            )
        except Exception as exc:  # noqa: BLE001 — Graph permission not granted
            return [IntegrationFinding(
                check_id="azure.entra.conditional_access_mfa",
                title="Conditional Access policies not readable",
                description="The app registration cannot read Conditional Access "
                            "policies, so MFA enforcement cannot be evidenced "
                            "automatically. This is a permission gap, not a "
                            "finding about your MFA posture.",
                remediation="Grant the app registration the Microsoft Graph "
                            "application permission Policy.Read.All and consent "
                            "to it, then sync again.",
                status="NOT_AVAILABLE",
                severity="LOW",
                check_category="mfa_enforcement",
                result_details={"error": type(exc).__name__},
            )]
        enforcing = [
            p.get("displayName", "")
            for p in policies
            if p.get("state") == "enabled"
            and "mfa" in [
                str(c).lower()
                for c in (p.get("grantControls") or {}).get("builtInControls", [])
            ]
        ]
        status = "PASSED" if enforcing else "FAILED"
        return [IntegrationFinding(
            check_id="azure.entra.conditional_access_mfa",
            title=(f"{len(enforcing)} enabled Conditional Access policies require MFA"
                   if enforcing else "No enabled Conditional Access policy requires MFA"),
            description=("Policies requiring MFA: " + ", ".join(enforcing[:20]) + "."
                         if enforcing else
                         f"{len(policies)} Conditional Access policies exist, none "
                         "enabled with an MFA grant control. Sign-in is protected "
                         "by password alone unless security defaults are on."),
            remediation="Entra ID → Protection → Conditional Access → create a "
                        "policy requiring multifactor authentication, scoped to "
                        "all users with a break-glass account excluded.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="mfa_enforcement",
            result_details={"policies": len(policies), "mfa_policies": enforcing},
        )]

    async def _check_owner_assignments(self) -> list[IntegrationFinding]:
        assignments = await self._list(
            f"{self._sub}/providers/Microsoft.Authorization/roleAssignments",
            _API_ROLES,
        )
        owners = [
            a.get("properties", {}).get("principalId", "")
            for a in assignments
            if _OWNER_ROLE_ID in str(a.get("properties", {}).get("roleDefinitionId", ""))
        ]
        total = len(assignments)
        # A subscription needs owners; a large share of every assignment being
        # Owner is the shape that fails a least-privilege review.
        ratio = (len(owners) / total) if total else 0.0
        status = "PASSED" if len(owners) <= 3 or ratio <= 0.15 else (
            "WARNING" if ratio <= 0.34 else "FAILED")
        return [IntegrationFinding(
            check_id="azure.rbac.owner_assignments",
            title=f"{len(owners)} of {total} role assignments grant Owner on the subscription",
            description=(f"{len(owners)} principals hold Owner on subscription "
                         f"{self.credentials.subscription_id}. Owner includes the "
                         "right to grant further access, so it is the assignment "
                         "an auditor looks at first."
                         if owners else
                         "No Owner assignments were returned for this subscription."),
            remediation="Replace standing Owner with Contributor plus User Access "
                        "Administrator only where needed, and move the rest to "
                        "Privileged Identity Management for time-bound elevation.",
            status=status,
            severity="INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="least_privilege",
            result_details={"owner_principals": owners, "assignment_count": total,
                            "subscription_id": self.credentials.subscription_id},
        )]

    # ── storage ─────────────────────────────────────────────────────────────

    async def _storage_accounts(self) -> list[dict]:
        return await self._list(
            f"{self._sub}/providers/Microsoft.Storage/storageAccounts", _API_STORAGE
        )

    async def _check_storage_public_access(self) -> list[IntegrationFinding]:
        accounts = await self._storage_accounts()
        # allowBlobPublicAccess defaults to false on accounts created since
        # 2023, but older accounts keep the permissive default, so an absent
        # field is not safe to read as "off".
        permissive = [a.get("name", "") for a in accounts
                      if a.get("properties", {}).get("allowBlobPublicAccess") is not False]
        status = "PASSED" if not permissive else "FAILED"
        return [IntegrationFinding(
            check_id="azure.storage.public_blob_access",
            title=(f"{len(permissive)} storage accounts allow anonymous blob access"
                   if permissive else
                   f"All {len(accounts)} storage accounts block anonymous blob access"
                   if accounts else "No storage accounts in this subscription"),
            description=("Anonymous blob access permitted on: "
                         + ", ".join(permissive[:20])
                         if permissive else
                         "Every storage account denies anonymous blob access at "
                         "the account level, so no container can be made public."),
            remediation="Storage account → Configuration → Allow Blob anonymous "
                        "access → Disabled. Enforce it for new accounts with an "
                        "Azure Policy assignment.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="access_control",
            result_details={"permissive_accounts": permissive,
                            "account_count": len(accounts)},
        )]

    async def _check_storage_https_only(self) -> list[IntegrationFinding]:
        accounts = await self._storage_accounts()
        insecure = [a.get("name", "") for a in accounts
                    if not a.get("properties", {}).get("supportsHttpsTrafficOnly")]
        weak_tls = [a.get("name", "") for a in accounts
                    if str(a.get("properties", {}).get("minimumTlsVersion", "")) in
                    ("TLS1_0", "TLS1_1")]
        problems = sorted(set(insecure) | set(weak_tls))
        status = "PASSED" if not problems else "FAILED"
        return [IntegrationFinding(
            check_id="azure.storage.https_only",
            title=(f"{len(problems)} storage accounts accept insecure transport"
                   if problems else
                   f"All {len(accounts)} storage accounts require HTTPS with TLS 1.2+"
                   if accounts else "No storage accounts in this subscription"),
            description=(
                ("Plain HTTP allowed on: " + ", ".join(insecure[:20]) + ". " if insecure else "")
                + ("TLS 1.0/1.1 accepted on: " + ", ".join(weak_tls[:20]) + "." if weak_tls else "")
                if problems else
                "Every storage account rejects plain HTTP and requires TLS 1.2 or above."
            ),
            remediation="Storage account → Configuration → Secure transfer required "
                        "= Enabled, Minimum TLS version = 1.2.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="encryption_in_transit",
            result_details={"http_allowed": insecure, "weak_tls": weak_tls,
                            "account_count": len(accounts)},
        )]

    async def _check_disk_encryption(self) -> list[IntegrationFinding]:
        disks = await self._list(
            f"{self._sub}/providers/Microsoft.Compute/disks", _API_DISKS
        )
        # Platform-managed keys are the default and are genuine encryption at
        # rest; this reports which disks rely on them versus a customer key,
        # and only flags a disk with no encryption settings at all.
        unencrypted, platform_key, customer_key = [], 0, 0
        for disk in disks:
            enc = disk.get("properties", {}).get("encryption") or {}
            enc_type = str(enc.get("type", ""))
            if not enc_type:
                unencrypted.append(disk.get("name", ""))
            elif "CustomerKey" in enc_type:
                customer_key += 1
            else:
                platform_key += 1
        status = "PASSED" if not unencrypted else "FAILED"
        return [IntegrationFinding(
            check_id="azure.disks.encryption_at_rest",
            title=(f"{len(unencrypted)} managed disks report no encryption"
                   if unencrypted else
                   f"All {len(disks)} managed disks are encrypted at rest"
                   if disks else "No managed disks in this subscription"),
            description=("Without encryption settings: " + ", ".join(unencrypted[:20])
                         if unencrypted else
                         f"{platform_key} disks use platform-managed keys and "
                         f"{customer_key} use customer-managed keys. Both satisfy "
                         "encryption at rest; a customer-managed key additionally "
                         "gives you control of the key lifecycle."),
            remediation="Use a disk encryption set backed by a Key Vault key where "
                        "the framework or contract calls for customer-managed keys.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="encryption_at_rest",
            result_details={"unencrypted_disks": unencrypted,
                            "platform_managed_keys": platform_key,
                            "customer_managed_keys": customer_key},
        )]

    # ── network ─────────────────────────────────────────────────────────────

    async def _check_nsg_ingress(self) -> list[IntegrationFinding]:
        groups = await self._list(
            f"{self._sub}/providers/Microsoft.Network/networkSecurityGroups", _API_NETWORK
        )
        exposed: list[str] = []
        for nsg in groups:
            name = nsg.get("name", "")
            for rule in nsg.get("properties", {}).get("securityRules", []):
                props = rule.get("properties", {})
                if props.get("direction") != "Inbound" or props.get("access") != "Allow":
                    continue
                sources = {str(props.get("sourceAddressPrefix", "")).lower()}
                sources |= {str(p).lower() for p in props.get("sourceAddressPrefixes", [])}
                if not (sources & _INTERNET_SOURCES):
                    continue
                ports = {str(props.get("destinationPortRange", ""))}
                ports |= {str(p) for p in props.get("destinationPortRanges", [])}
                hits = sorted(self._admin_ports_in(ports))
                if "*" in ports:
                    exposed.append(f"{name}/{rule.get('name', '')} (all ports)")
                elif hits:
                    exposed.append(
                        f"{name}/{rule.get('name', '')} ({', '.join(str(p) for p in hits)})"
                    )
        status = "PASSED" if not exposed else "FAILED"
        return [IntegrationFinding(
            check_id="azure.network.nsg_ingress",
            title=(f"{len(exposed)} NSG rules expose admin ports to the internet"
                   if exposed else
                   f"No NSG rule in {len(groups)} groups exposes admin ports to the internet"),
            description=("Allow-from-internet rules: " + "; ".join(exposed[:20])
                         if exposed else
                         "No inbound Allow rule sources from Internet/* on an "
                         "administrative or database port."),
            remediation="Narrow the source to the specific address prefix, or "
                        "replace the rule with Azure Bastion / Just-In-Time VM "
                        "access so exposure is time-bound and logged.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={"exposed_rules": exposed, "nsg_count": len(groups),
                            "admin_ports": sorted(_ADMIN_PORTS)},
        )]

    @staticmethod
    def _admin_ports_in(ports: set[str]) -> set[int]:
        """Which administrative ports a rule's port specification covers.

        Azure writes single ports (``3389``) and ranges (``1000-4000``) in the
        same field, so a substring match would miss the ranges that matter.
        """
        hit: set[int] = set()
        for spec in ports:
            if not spec:
                continue
            if "-" in spec:
                low, _, high = spec.partition("-")
                try:
                    lo, hi = int(low), int(high)
                except ValueError:
                    continue
                hit |= {p for p in _ADMIN_PORTS if lo <= p <= hi}
            else:
                try:
                    value = int(spec)
                except ValueError:
                    continue
                if value in _ADMIN_PORTS:
                    hit.add(value)
        return hit

    # ── secrets, logging, detection ─────────────────────────────────────────

    async def _check_keyvault_protection(self) -> list[IntegrationFinding]:
        vaults = await self._list(
            f"{self._sub}/providers/Microsoft.KeyVault/vaults", _API_KEYVAULT
        )
        unprotected: list[str] = []
        for vault in vaults:
            # Soft delete is mandatory on new vaults; purge protection is not,
            # and without it a compromised admin can destroy keys permanently —
            # taking every encrypted artefact with them.
            props = vault.get("properties", {})
            if not props.get("enablePurgeProtection"):
                unprotected.append(vault.get("name", ""))
        status = "PASSED" if not unprotected else "WARNING"
        return [IntegrationFinding(
            check_id="azure.keyvault.purge_protection",
            title=(f"{len(unprotected)} key vaults have no purge protection"
                   if unprotected else
                   f"All {len(vaults)} key vaults have purge protection"
                   if vaults else "No key vaults in this subscription"),
            description=("Purge protection off: " + ", ".join(unprotected[:20])
                         if unprotected else
                         "Every key vault retains deleted keys and secrets for "
                         "the retention period and cannot be purged early."),
            remediation="Key vault → Properties → enable purge protection. It "
                        "cannot be turned off again, which is the property that "
                        "makes it worth having.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="secret_management",
            result_details={"vaults_without_purge_protection": unprotected,
                            "vault_count": len(vaults)},
        )]

    async def _check_activity_log_export(self) -> list[IntegrationFinding]:
        try:
            settings = await self._list(
                f"{self._sub}/providers/Microsoft.Insights/diagnosticSettings",
                _API_DIAGNOSTICS,
            )
        except Exception as exc:  # noqa: BLE001
            return [IntegrationFinding(
                check_id="azure.monitor.activity_log_export",
                title="Activity log export settings not readable",
                description="These credentials cannot read subscription "
                            "diagnostic settings, so activity-log retention "
                            "cannot be evidenced automatically.",
                remediation="Grant the app registration Reader on the "
                            "subscription (Monitoring Reader is enough for this "
                            "check alone), then sync again.",
                status="NOT_AVAILABLE",
                severity="LOW",
                check_category="audit_logging",
                result_details={"error": type(exc).__name__},
            )]
        exporting = [
            s.get("name", "") for s in settings
            if (s.get("properties", {}).get("storageAccountId")
                or s.get("properties", {}).get("workspaceId")
                or s.get("properties", {}).get("eventHubAuthorizationRuleId"))
        ]
        status = "PASSED" if exporting else "FAILED"
        return [IntegrationFinding(
            check_id="azure.monitor.activity_log_export",
            title=("Subscription activity log is exported for retention"
                   if exporting else "Subscription activity log is not exported"),
            description=(f"Diagnostic settings exporting the activity log: "
                         f"{', '.join(exporting)}."
                         if exporting else
                         "The activity log is retained for 90 days in the "
                         "platform and then discarded. Frameworks that require a "
                         "one-year audit trail need it exported to a Log "
                         "Analytics workspace, storage account or event hub."),
            remediation="Monitor → Activity log → Export activity logs → add a "
                        "diagnostic setting targeting a Log Analytics workspace "
                        "or storage account with the required retention.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="audit_logging",
            result_details={"exporting_settings": exporting,
                            "settings_count": len(settings)},
        )]

    async def _check_defender_plans(self) -> list[IntegrationFinding]:
        plans = await self._list(
            f"{self._sub}/providers/Microsoft.Security/pricings", _API_SECURITY
        )
        enabled = [p.get("name", "") for p in plans
                   if str(p.get("properties", {}).get("pricingTier", "")).lower() == "standard"]
        status = "PASSED" if enabled else "FAILED"
        return [IntegrationFinding(
            check_id="azure.defender.plans",
            title=(f"{len(enabled)} Defender for Cloud plans are enabled"
                   if enabled else "No Defender for Cloud plan is enabled"),
            description=("Enabled plans: " + ", ".join(sorted(enabled)[:20]) + "."
                         if enabled else
                         f"All {len(plans)} Defender for Cloud plans are on the "
                         "free tier, so no vulnerability assessment or threat "
                         "protection findings are produced for this subscription."),
            remediation="Microsoft Defender for Cloud → Environment settings → "
                        "subscription → enable the plans covering the resource "
                        "types you run (servers, storage, SQL, containers).",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="vulnerability_management",
            result_details={"enabled_plans": sorted(enabled), "plan_count": len(plans)},
        )]
