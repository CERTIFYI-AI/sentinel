# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Azure Key Vault integration adapter.

Uses Azure Resource Manager (ARM) REST API via the shared Graph client's HTTP
transport to enumerate Key Vaults and check their configuration.

Unlike the other Graph-family adapters, Key Vault sits on the ARM plane
(management.azure.com) rather than graph.microsoft.com. The adapter overrides
the base URL accordingly. Credentials are the same Entra app registration
shape.

Application permissions / RBAC required:
  Reader role on the subscription(s) containing vaults
  Key Vault Reader role for access-policy inspection

Extra credential field: ``subscription_id`` — the Azure subscription to scan.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)

_ARM_BASE = "https://management.azure.com"
_ARM_API_VERSION = "2023-07-01"


@dataclass
class KeyVaultCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/keyvault/config.ts."""

    subscription_id: str = ""


class KeyVaultAdapter:
    """Checks Azure Key Vault configuration via the ARM API."""

    def __init__(self, credentials: KeyVaultCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)
        self.sub_id = credentials.subscription_id

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get(
                f"{_ARM_BASE}/subscriptions/{self.sub_id}/providers/Microsoft.KeyVault/vaults",
                **{"api-version": _ARM_API_VERSION, "$top": "1"},
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"ARM refused vault listing (HTTP {resp.status_code}). "
                    "Assign Reader on the subscription and complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Azure Resource Manager: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_vault_inventory(),
            self._check_soft_delete(),
            self._check_purge_protection(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("keyvault check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _get_vaults(self) -> list[dict] | None:
        resp = await self.graph.get(
            f"{_ARM_BASE}/subscriptions/{self.sub_id}/providers/Microsoft.KeyVault/vaults",
            **{"api-version": _ARM_API_VERSION},
        )
        if resp.status_code == 403:
            return None
        resp.raise_for_status()
        return resp.json().get("value", [])

    async def _check_vault_inventory(self) -> list[IntegrationFinding]:
        vaults = await self._get_vaults()
        if vaults is None:
            return [self._unavailable(
                "keyvault.inventory.vault_count",
                "Key Vaults are inventoried",
                "secret_management",
                "Assign Reader on the subscription and complete admin consent.",
            )]
        return [IntegrationFinding(
            check_id="keyvault.inventory.vault_count",
            title="Key Vaults are inventoried",
            description=f"{len(vaults)} Key Vault(s) found in the subscription.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="secret_management",
            result_details={
                "vault_count": len(vaults),
                "sample": [v.get("name", "") for v in vaults][:20],
            },
        )]

    async def _check_soft_delete(self) -> list[IntegrationFinding]:
        vaults = await self._get_vaults()
        if vaults is None:
            return [self._unavailable(
                "keyvault.config.soft_delete",
                "Soft delete is enabled on all vaults",
                "backup_recovery",
                "Assign Reader on the subscription and complete admin consent.",
            )]
        without_sd: list[str] = []
        for v in vaults:
            props = v.get("properties", {})
            if not props.get("enableSoftDelete", True):
                without_sd.append(v.get("name", ""))
        return [IntegrationFinding(
            check_id="keyvault.config.soft_delete",
            title="Soft delete is enabled on all vaults",
            description=(
                f"{len(without_sd)} of {len(vaults)} vault(s) do not have soft delete enabled."
                if without_sd else
                f"All {len(vaults)} vault(s) have soft delete enabled."
            ),
            remediation=(
                "Enable soft delete on all Key Vaults. As of 2025 Azure enforces "
                "soft delete by default on new vaults, but older vaults may predate this."
            ),
            status="PASSED" if not without_sd else "FAILED",
            severity="HIGH" if without_sd else "INFO",
            check_category="backup_recovery",
            result_details={
                "missing_soft_delete": without_sd[:20],
                "total_vaults": len(vaults),
            },
        )]

    async def _check_purge_protection(self) -> list[IntegrationFinding]:
        vaults = await self._get_vaults()
        if vaults is None:
            return [self._unavailable(
                "keyvault.config.purge_protection",
                "Purge protection is enabled on all vaults",
                "backup_recovery",
                "Assign Reader on the subscription and complete admin consent.",
            )]
        without_pp: list[str] = []
        for v in vaults:
            props = v.get("properties", {})
            if not props.get("enablePurgeProtection", False):
                without_pp.append(v.get("name", ""))
        return [IntegrationFinding(
            check_id="keyvault.config.purge_protection",
            title="Purge protection is enabled on all vaults",
            description=(
                f"{len(without_pp)} of {len(vaults)} vault(s) do not have purge protection."
                if without_pp else
                f"All {len(vaults)} vault(s) have purge protection enabled."
            ),
            remediation=(
                "Enable purge protection on vaults storing production secrets and keys. "
                "This prevents permanent deletion during the soft-delete retention period."
            ),
            status="PASSED" if not without_pp else "WARNING",
            severity="MEDIUM" if without_pp else "INFO",
            check_category="backup_recovery",
            result_details={
                "missing_purge_protection": without_pp[:20],
                "total_vaults": len(vaults),
            },
        )]

    @staticmethod
    def _unavailable(check_id, title, category, remediation) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Azure Resource Manager with the permissions granted.",
            remediation=remediation, status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
