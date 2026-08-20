# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Alibaba Cloud integration adapter.

Reads account security posture from Alibaba Cloud's RAM (Resource Access
Management) and Cloud Config APIs: stale RAM access keys, and Cloud
Config compliance evaluations for public resource exposure and
encryption at rest. Cloud Config is used (rather than each resource
service's own API) because it aggregates compliance across regions
through a single global endpoint, matching the region-independent
account/AK-SK credential this adapter collects.

Auth: an Alibaba Cloud RAM access key pair (``access_key_id`` /
``access_key_credential``), signed per request using the RPC-style
Signature Version 1.0 (HMAC-SHA1) algorithm every "singleton" Alibaba
Cloud API accepts.
"""

from __future__ import annotations

import asyncio
import base64
import datetime as dt
import hashlib
import hmac
import logging
import uuid
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_RAM_ENDPOINT = "https://ram.aliyuncs.com/"
_CONFIG_ENDPOINT = "https://config.aliyuncs.com/"

#: An enabled access key older than this many days is a finding.
_STALE_KEY_DAYS = 90


def _percent_encode(value: str) -> str:
    """RFC 3986 percent-encoding the way Alibaba Cloud's RPC signer wants
    it: '~' left alone, space encoded as %20 (not '+')."""
    return quote(str(value), safe="~")


@dataclass
class AlibabaCloudCredentials:
    """Matches dashboard/src/integrations/alibaba_cloud/config.ts credentialFields."""

    access_key_id: str
    access_key_credential: str


class AlibabaCloudAdapter:
    """Reads RAM and Cloud Config security posture from Alibaba Cloud."""

    def __init__(self, credentials: AlibabaCloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    def _sign(self, method: str, params: dict[str, str]) -> str:
        """Alibaba Cloud RPC-style Signature Version 1.0 (HMAC-SHA1)."""
        sorted_items = sorted(params.items())
        canonicalized = "&".join(f"{_percent_encode(k)}={_percent_encode(v)}" for k, v in sorted_items)
        string_to_sign = f"{method}&{_percent_encode('/')}&{_percent_encode(canonicalized)}"
        key = f"{self.credentials.access_key_credential}&".encode()
        # SHA1 here is Alibaba Cloud's documented, non-negotiable RPC
        # Signature Version 1.0 algorithm (SignatureMethod=HMAC-SHA1) —
        # Alibaba Cloud's servers compute and compare the HMAC with SHA1
        # themselves, so a stronger hash would just fail every signed
        # request rather than improve security.
        # nosemgrep: python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1
        digest = hmac.new(key, string_to_sign.encode(), hashlib.sha1).digest()
        return base64.b64encode(digest).decode()

    def _base_params(self, action: str, version: str) -> dict[str, str]:
        return {
            "Format": "JSON",
            "Version": version,
            "AccessKeyId": self.credentials.access_key_id,
            "SignatureMethod": "HMAC-SHA1",
            "Timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "SignatureVersion": "1.0",
            "SignatureNonce": str(uuid.uuid4()),
            "Action": action,
        }

    async def _call(
        self, client: httpx.AsyncClient, endpoint: str, action: str, version: str, **extra: str
    ) -> httpx.Response:
        params = self._base_params(action, version)
        params.update({k: str(v) for k, v in extra.items()})
        params["Signature"] = self._sign("GET", params)
        return await client.get(endpoint, params=params, timeout=_TIMEOUT)

    async def _ram_call(self, client: httpx.AsyncClient, action: str, **extra: str) -> httpx.Response:
        return await self._call(client, _RAM_ENDPOINT, action, "2015-05-01", **extra)

    async def _config_call(self, client: httpx.AsyncClient, action: str, **extra: str) -> httpx.Response:
        return await self._call(client, _CONFIG_ENDPOINT, action, "2020-09-07", **extra)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._ram_call(client, "GetAccountSummary")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Alibaba Cloud rejected the access key pair. Verify the "
                    "AccessKey ID and AccessKey secret are active."
                )
            body = resp.json()
            error_code = body.get("Code")
            if resp.status_code >= 400 or (error_code is not None and error_code != "Success"):
                raise ValueError(
                    "Alibaba Cloud rejected the request: "
                    + str(body.get("Message", body.get("Code", "unknown error")))
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Alibaba Cloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_access_keys(client),
                self._check_public_resource_exposure(client),
                self._check_encryption_at_rest_compliance(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("alibaba_cloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_access_keys(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._ram_call(client, "ListUsers")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "alibaba_cloud.ram.stale_access_keys",
                "Stale RAM access keys",
                "access_control",
                "Grant the credential the AliyunRAMReadOnlyAccess policy so "
                "RAM users and access keys are listable.",
            )]
        resp.raise_for_status()
        users = resp.json().get("Users", {}).get("User", [])
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_STALE_KEY_DAYS)
        stale: list[str] = []
        total_keys = 0
        for user in users:
            username = user.get("UserName", "")
            keys_resp = await self._ram_call(client, "ListAccessKeys", UserName=username)
            if keys_resp.status_code in (401, 403):
                continue
            keys_resp.raise_for_status()
            for key in keys_resp.json().get("AccessKeys", {}).get("AccessKey", []):
                if key.get("Status") != "Active":
                    continue
                total_keys += 1
                created_str = key.get("CreateDate", "")
                try:
                    created = dt.datetime.strptime(created_str, "%Y-%m-%dT%H:%M:%SZ").replace(
                        tzinfo=dt.timezone.utc
                    )
                except ValueError:
                    continue
                if created < cutoff:
                    stale.append(f"{username}:{key.get('AccessKeyId', '')[-4:]}")
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="alibaba_cloud.ram.stale_access_keys",
            title=(f"{len(stale)} of {total_keys} active RAM access keys are older than "
                   f"{_STALE_KEY_DAYS} days" if stale else
                   f"All {total_keys} active RAM access keys are within {_STALE_KEY_DAYS} days"
                   if total_keys else "No active RAM access keys"),
            description=("Keys past rotation (user:last-4): " + ", ".join(stale[:20])
                         if stale else
                         "Every active RAM access key was created inside the rotation window."),
            remediation="RAM Console → Users → rotate access keys older than "
                        f"{_STALE_KEY_DAYS} days, then deactivate and delete the old key.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"stale_keys": stale, "active_keys": total_keys,
                            "max_age_days": _STALE_KEY_DAYS},
        )]

    async def _check_public_resource_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._config_call(
            client, "DescribeConfigRuleComplianceStatus", ConfigRuleName="oss-bucket-public-read-prohibited"
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "alibaba_cloud.config.public_resource_exposure",
                "Public resource exposure (Cloud Config)",
                "network_security",
                "Grant the credential the AliyunConfigReadOnlyAccess policy "
                "and enable a managed rule for public-read-prohibited storage.",
            )]
        if resp.status_code == 404:
            return [self._unavailable(
                "alibaba_cloud.config.public_resource_exposure",
                "Public resource exposure (Cloud Config)",
                "network_security",
                "Enable Cloud Config and add the managed rule "
                "'oss-bucket-public-read-prohibited' to evaluate public exposure.",
            )]
        resp.raise_for_status()
        body = resp.json()
        summary = body.get("ComplianceSummary", body)
        non_compliant = int(summary.get("NonCompliantCount", summary.get("NonCompliantResourceCount", 0)) or 0)
        compliant = int(summary.get("CompliantCount", summary.get("CompliantResourceCount", 0)) or 0)
        status = "PASSED" if non_compliant == 0 else "FAILED"
        return [IntegrationFinding(
            check_id="alibaba_cloud.config.public_resource_exposure",
            title=(f"{non_compliant} resource(s) are publicly exposed" if non_compliant
                   else f"No resource among {compliant} evaluated is publicly exposed"),
            description=(f"{non_compliant} resource(s) fail the public-read-prohibited "
                        "compliance rule and are reachable without restriction."
                        if non_compliant else
                        f"All {compliant} evaluated resource(s) pass the "
                        "public-read-prohibited compliance rule."),
            remediation="Object Storage Service / RDS / other exposed resource console → "
                        "disable public read/write access, or restrict it to a signed URL "
                        "or specific CIDR ranges.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={"non_compliant_resources": non_compliant, "compliant_resources": compliant},
        )]

    async def _check_encryption_at_rest_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._config_call(
            client, "DescribeConfigRuleComplianceStatus", ConfigRuleName="rds-instance-encrypted-check"
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "alibaba_cloud.config.encryption_at_rest_compliance",
                "Encryption-at-rest compliance (Cloud Config)",
                "encryption_at_rest",
                "Grant the credential the AliyunConfigReadOnlyAccess policy "
                "and enable a managed rule for storage encryption.",
            )]
        if resp.status_code == 404:
            return [self._unavailable(
                "alibaba_cloud.config.encryption_at_rest_compliance",
                "Encryption-at-rest compliance (Cloud Config)",
                "encryption_at_rest",
                "Enable Cloud Config and add the managed rule "
                "'rds-instance-encrypted-check' to evaluate encryption at rest.",
            )]
        resp.raise_for_status()
        body = resp.json()
        summary = body.get("ComplianceSummary", body)
        non_compliant = int(summary.get("NonCompliantCount", summary.get("NonCompliantResourceCount", 0)) or 0)
        compliant = int(summary.get("CompliantCount", summary.get("CompliantResourceCount", 0)) or 0)
        status = "PASSED" if non_compliant == 0 else "FAILED"
        return [IntegrationFinding(
            check_id="alibaba_cloud.config.encryption_at_rest_compliance",
            title=(f"{non_compliant} resource(s) are missing encryption at rest" if non_compliant
                   else f"All {compliant} evaluated resource(s) encrypt storage at rest"),
            description=(f"{non_compliant} resource(s) fail the storage-encryption "
                        "compliance rule." if non_compliant else
                        f"All {compliant} evaluated resource(s) pass the storage-encryption "
                        "compliance rule."),
            remediation="RDS / ECS disk console → enable disk encryption using a KMS key, "
                        "noting that in-place encryption is not supported: create an "
                        "encrypted snapshot/copy and migrate to it.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="encryption_at_rest",
            result_details={"non_compliant_resources": non_compliant, "compliant_resources": compliant},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Alibaba Cloud with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
