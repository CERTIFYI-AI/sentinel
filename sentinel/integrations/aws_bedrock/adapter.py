# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""AWS Bedrock integration adapter.

Reads model inventory, custom model, and guardrail posture from an AWS account
that uses Amazon Bedrock. All calls are read-only (``List*``). boto3 is
imported lazily so the module loads without it installed.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)


@dataclass
class AwsBedrockCredentials:
    """Credential shape for the AWS Bedrock adapter."""

    access_key_id: str = ""
    secret_access_key: str = ""
    region: str = "us-east-1"
    session_token: str = ""
    role_arn: str = ""
    external_id: str = ""


class AwsBedrockAdapter:
    """Reads AI-model governance posture from Amazon Bedrock.

    No database access; the worker persists returned findings. boto3 calls are
    blocking, so every one of them runs through ``asyncio.to_thread``.
    """

    def __init__(self, credentials: AwsBedrockCredentials, client=None) -> None:
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

    @property
    def _region(self) -> str:
        return self.credentials.region or "us-east-1"

    async def validate(self) -> bool:
        try:
            await self._call("bedrock", "list_foundation_models", maxResults=1)
            return True
        except Exception as exc:
            raise ValueError(
                "AWS Bedrock credentials rejected"
                + (f" while assuming {self.credentials.role_arn!r}" if self.credentials.role_arn else "")
                + f": {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_foundation_models(),
            self._check_custom_models(),
            self._check_guardrails(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("aws_bedrock check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_foundation_models(self) -> list[IntegrationFinding]:
        try:
            response = await self._call("bedrock", "list_foundation_models")
        except Exception as exc:
            logger.warning("aws_bedrock.models.inventory: %s", exc)
            return [IntegrationFinding(
                check_id="aws_bedrock.models.inventory",
                title="Unable to list Bedrock foundation models",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have bedrock:ListFoundationModels permission.",
                status="NOT_AVAILABLE",
                severity="MEDIUM",
                check_category="change_management",
                result_details={"error": str(exc)},
            )]
        models = response.get("modelSummaries", [])
        count = len(models)
        return [IntegrationFinding(
            check_id="aws_bedrock.models.inventory",
            title=f"{count} foundation models available in {self._region}",
            description=f"Amazon Bedrock exposes {count} foundation model(s) in {self._region}.",
            remediation="Review available foundation models and disable access to any that are not required.",
            status="PASSED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={"region": self._region, "foundation_model_count": count},
        )]

    async def _check_custom_models(self) -> list[IntegrationFinding]:
        try:
            response = await self._call("bedrock", "list_custom_models")
        except Exception as exc:
            logger.warning("aws_bedrock.models.custom_models: %s", exc)
            return [IntegrationFinding(
                check_id="aws_bedrock.models.custom_models",
                title="Unable to list Bedrock custom models",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have bedrock:ListCustomModels permission.",
                status="NOT_AVAILABLE",
                severity="MEDIUM",
                check_category="change_management",
                result_details={"error": str(exc)},
            )]
        models = response.get("modelSummaries", [])
        count = len(models)
        return [IntegrationFinding(
            check_id="aws_bedrock.models.custom_models",
            title=f"{count} custom/fine-tuned models in {self._region}" if count
                  else f"No custom models in {self._region}",
            description=f"{count} custom or fine-tuned model(s) found in {self._region}."
                        if count else
                        f"No custom or fine-tuned models in {self._region}.",
            remediation="Ensure custom models are tracked in the model inventory and subject to evaluation before deployment.",
            status="PASSED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={"region": self._region, "custom_model_count": count},
        )]

    async def _check_guardrails(self) -> list[IntegrationFinding]:
        try:
            response = await self._call("bedrock", "list_guardrails")
        except Exception as exc:
            logger.warning("aws_bedrock.guardrails.inventory: %s", exc)
            return [IntegrationFinding(
                check_id="aws_bedrock.guardrails.inventory",
                title="Unable to list Bedrock guardrails",
                description=f"The API call failed: {exc}",
                remediation="Verify the credentials have bedrock:ListGuardrails permission.",
                status="NOT_AVAILABLE",
                severity="HIGH",
                check_category="access_control",
                result_details={"error": str(exc)},
            )]
        guardrails = response.get("guardrails", [])
        count = len(guardrails)
        if count == 0:
            return [IntegrationFinding(
                check_id="aws_bedrock.guardrails.inventory",
                title=f"No Bedrock guardrails configured in {self._region}",
                description="No guardrails are configured in Amazon Bedrock. "
                            "Without guardrails, model access is unguarded and "
                            "there is no content filtering or topic blocking.",
                remediation="Create at least one Bedrock guardrail to enforce content "
                            "filtering, topic restrictions, and sensitive-information "
                            "redaction on model invocations.",
                status="WARNING",
                severity="HIGH",
                check_category="access_control",
                result_details={"region": self._region, "guardrail_count": 0},
            )]
        return [IntegrationFinding(
            check_id="aws_bedrock.guardrails.inventory",
            title=f"{count} Bedrock guardrails configured in {self._region}",
            description=f"{count} guardrail(s) configured in {self._region}.",
            remediation="Review guardrail configurations periodically to ensure they remain aligned with policy.",
            status="PASSED",
            severity="HIGH",
            check_category="access_control",
            result_details={"region": self._region, "guardrail_count": count},
        )]
