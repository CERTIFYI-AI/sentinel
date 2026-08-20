# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""AWS Secrets Manager integration adapter.

Reads secret inventory, rotation posture, and staleness from an AWS account.
All calls are read-only (``List*``). boto3 is imported lazily so the module
loads without it installed.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_STALE_DAYS = 90


@dataclass
class AwsSecretsManagerCredentials:
    """Credential shape for the AWS Secrets Manager adapter."""

    access_key_id: str = ""
    secret_access_key: str = ""
    region: str = "us-east-1"
    session_token: str = ""
    role_arn: str = ""
    external_id: str = ""


class AwsSecretsManagerAdapter:
    """Reads secret-management posture from AWS Secrets Manager.

    No database access; the worker persists returned findings. boto3 calls are
    blocking, so every one of them runs through ``asyncio.to_thread``.
    """

    def __init__(self, credentials: AwsSecretsManagerCredentials, client=None) -> None:
        self.credentials = credentials
        self._session = client

    def _boto_session(self):
        if self._session is not None:
            return self._session

        import boto3

        base = boto3.session.Session(
            aws_access_key_id=self.credentials.access_key_id or None,
            aws_secret_access_key=self.credentials.secret_access_key or None,
            aws_session_token=self.credentials.session_token or None,
            region_name=self.credentials.region or "us-east-1",
        )
        if not self.credentials.role_arn:
            self._session = base
            return self._session

        assume_kwargs = {
            "RoleArn": self.credentials.role_arn,
            "RoleSessionName": "sentinel-grc-evidence",
        }
        if self.credentials.external_id:
            assume_kwargs["ExternalId"] = self.credentials.external_id
        assumed = base.client("sts").assume_role(**assume_kwargs)["Credentials"]
        self._session = boto3.session.Session(
            aws_access_key_id=assumed["AccessKeyId"],
            aws_secret_access_key=assumed["SecretAccessKey"],
            aws_session_token=assumed["SessionToken"],
            region_name=self.credentials.region or "us-east-1",
        )
        return self._session

    def _client(self, service: str):
        return self._boto_session().client(service)

    async def _call(self, service: str, operation: str, **kwargs) -> dict:
        def _run() -> dict:
            return getattr(self._client(service), operation)(**kwargs)

        return await asyncio.to_thread(_run)

    async def _paginate(self, service: str, operation: str, key: str, **kwargs) -> list:
        def _run() -> list:
            client = self._client(service)
            try:
                pages = client.get_paginator(operation).paginate(**kwargs)
            except Exception:
                return list(getattr(client, operation)(**kwargs).get(key, []))
            out: list = []
            for page in pages:
                out.extend(page.get(key, []))
            return out

        return await asyncio.to_thread(_run)

    @property
    def _region(self) -> str:
        return self.credentials.region or "us-east-1"

    async def validate(self) -> bool:
        try:
            await self._call("secretsmanager", "list_secrets", MaxResults=1)
            return True
        except Exception as exc:
            raise ValueError(
                "AWS Secrets Manager credentials rejected"
                + (f" while assuming {self.credentials.role_arn!r}" if self.credentials.role_arn else "")
                + f": {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_secrets_inventory(),
            self._check_secrets_rotation(),
            self._check_secrets_last_accessed(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("aws_sm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _list_all_secrets(self) -> list[dict]:
        return await self._paginate("secretsmanager", "list_secrets", "SecretList")

    async def _check_secrets_inventory(self) -> list[IntegrationFinding]:
        try:
            secrets = await self._list_all_secrets()
        except Exception as exc:
            logger.warning("aws_sm.secrets.inventory: %s", exc)
            return [IntegrationFinding(
                check_id="aws_secrets_manager.secrets.inventory",
                title="Unable to list Secrets Manager secrets",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have secretsmanager:ListSecrets permission.",
                status="NOT_AVAILABLE",
                severity="LOW",
                check_category="secret_management",
                result_details={"error": str(exc)},
            )]
        count = len(secrets)
        return [IntegrationFinding(
            check_id="aws_secrets_manager.secrets.inventory",
            title=f"{count} secrets in Secrets Manager in {self._region}" if count
                  else f"No secrets in Secrets Manager in {self._region}",
            description=f"{count} secret(s) stored in AWS Secrets Manager in {self._region}."
                        if count else
                        f"No secrets found in AWS Secrets Manager in {self._region}.",
            remediation="Review the secret inventory to confirm all entries are still needed.",
            status="PASSED",
            severity="LOW",
            check_category="secret_management",
            result_details={"region": self._region, "secret_count": count},
        )]

    async def _check_secrets_rotation(self) -> list[IntegrationFinding]:
        try:
            secrets = await self._list_all_secrets()
        except Exception as exc:
            logger.warning("aws_sm.secrets.rotation: %s", exc)
            return [IntegrationFinding(
                check_id="aws_secrets_manager.secrets.rotation",
                title="Unable to check secret rotation status",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have secretsmanager:ListSecrets permission.",
                status="NOT_AVAILABLE",
                severity="HIGH",
                check_category="secret_management",
                result_details={"error": str(exc)},
            )]
        if not secrets:
            return [IntegrationFinding(
                check_id="aws_secrets_manager.secrets.rotation",
                title=f"No secrets to check for rotation in {self._region}",
                description="No secrets exist, so rotation posture is not applicable.",
                remediation="No action required.",
                status="PASSED",
                severity="HIGH",
                check_category="secret_management",
                result_details={"region": self._region, "secret_count": 0},
            )]
        without_rotation: list[str] = []
        for secret in secrets:
            if not secret.get("RotationEnabled", False):
                without_rotation.append(secret.get("Name", secret.get("ARN", "")))
        total = len(secrets)
        status = "PASSED" if not without_rotation else "FAILED"
        return [IntegrationFinding(
            check_id="aws_secrets_manager.secrets.rotation",
            title=(f"{len(without_rotation)} of {total} secrets lack automatic rotation"
                   if without_rotation else
                   f"All {total} secrets have automatic rotation enabled"),
            description=("Secrets without rotation: " + ", ".join(without_rotation[:20])
                         if without_rotation else
                         "Every secret in Secrets Manager has automatic rotation enabled."),
            remediation="Enable automatic rotation with a Lambda rotation function "
                        "for each secret that lacks it.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="secret_management",
            result_details={"region": self._region,
                            "secrets_without_rotation": without_rotation[:50],
                            "total_secrets": total},
        )]

    async def _check_secrets_last_accessed(self) -> list[IntegrationFinding]:
        try:
            secrets = await self._list_all_secrets()
        except Exception as exc:
            logger.warning("aws_sm.secrets.last_accessed: %s", exc)
            return [IntegrationFinding(
                check_id="aws_secrets_manager.secrets.last_accessed",
                title="Unable to check secret last-accessed dates",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have secretsmanager:ListSecrets permission.",
                status="NOT_AVAILABLE",
                severity="MEDIUM",
                check_category="secret_management",
                result_details={"error": str(exc)},
            )]
        if not secrets:
            return [IntegrationFinding(
                check_id="aws_secrets_manager.secrets.last_accessed",
                title=f"No secrets to check for staleness in {self._region}",
                description="No secrets exist, so staleness check is not applicable.",
                remediation="No action required.",
                status="PASSED",
                severity="MEDIUM",
                check_category="secret_management",
                result_details={"region": self._region, "secret_count": 0},
            )]
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_STALE_DAYS)
        stale: list[str] = []
        for secret in secrets:
            last_accessed = secret.get("LastAccessedDate")
            if isinstance(last_accessed, dt.datetime) and last_accessed < cutoff:
                stale.append(secret.get("Name", secret.get("ARN", "")))
            elif last_accessed is None:
                stale.append(secret.get("Name", secret.get("ARN", "")))
        total = len(secrets)
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="aws_secrets_manager.secrets.last_accessed",
            title=(f"{len(stale)} of {total} secrets not accessed in {_STALE_DAYS}+ days"
                   if stale else
                   f"All {total} secrets accessed within the last {_STALE_DAYS} days"),
            description=("Potentially stale secrets: " + ", ".join(stale[:20])
                         if stale else
                         f"Every secret was accessed within the last {_STALE_DAYS} days."),
            remediation="Investigate stale secrets: confirm whether they are still "
                        "needed, rotate them if active, or delete them if orphaned.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="secret_management",
            result_details={"region": self._region,
                            "stale_secrets": stale[:50],
                            "total_secrets": total,
                            "stale_threshold_days": _STALE_DAYS},
        )]
