# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Cloud Vertex AI integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Vertex AI API to inventory models, endpoints and datasets.

Auth: a GCP service account. OAuth scopes required:

  https://www.googleapis.com/auth/cloud-platform.read-only
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_SCOPES = [
    "https://www.googleapis.com/auth/cloud-platform.read-only",
]


@dataclass
class VertexAiCredentials(GoogleCredentials):
    """Matches dashboard credential fields for Vertex AI."""

    region: str = "us-central1"

    @property
    def api_base(self) -> str:
        return f"https://{self.region}-aiplatform.googleapis.com"


class VertexAiAdapter:
    """Fetches AI asset inventory from Google Cloud Vertex AI."""

    def __init__(self, credentials: VertexAiCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    @property
    def _prefix(self) -> str:
        return (
            f"{self.credentials.api_base}/v1/projects/"
            f"{self.credentials.project_id}/locations/{self.credentials.region}"
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{self._prefix}/models",
                pageSize="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Vertex AI API "
                    f"(HTTP {resp.status_code}). Verify the service account has "
                    "the required permissions on the project."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Vertex AI API: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_models_inventory(),
            self._check_endpoints_inventory(),
            self._check_datasets_inventory(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("vertex_ai check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_models_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(f"{self._prefix}/models")
        if resp.status_code == 403:
            return [self._unavailable(
                "vertex_ai.models.inventory",
                "Vertex AI models are inventoried",
                "change_management",
                "Grant the service account aiplatform.models.list permission.",
            )]
        resp.raise_for_status()
        models = resp.json().get("models", [])
        return [IntegrationFinding(
            check_id="vertex_ai.models.inventory",
            title="Vertex AI models are inventoried",
            description=f"{len(models)} model(s) found in {self.credentials.region}.",
            remediation=(
                "Review the model inventory periodically. Ensure each deployed "
                "model has an owner and is tracked in the AI model register."
            ),
            status="PASSED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={
                "model_count": len(models),
                "region": self.credentials.region,
                "sample": [m.get("displayName", "") for m in models][:20],
            },
        )]

    async def _check_endpoints_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(f"{self._prefix}/endpoints")
        if resp.status_code == 403:
            return [self._unavailable(
                "vertex_ai.endpoints.inventory",
                "Vertex AI endpoints are inventoried",
                "change_management",
                "Grant the service account aiplatform.endpoints.list permission.",
            )]
        resp.raise_for_status()
        endpoints = resp.json().get("endpoints", [])
        return [IntegrationFinding(
            check_id="vertex_ai.endpoints.inventory",
            title="Vertex AI endpoints are inventoried",
            description=f"{len(endpoints)} endpoint(s) found in {self.credentials.region}.",
            remediation=(
                "Review deployed endpoints periodically and decommission those "
                "that are no longer serving traffic."
            ),
            status="PASSED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={
                "endpoint_count": len(endpoints),
                "region": self.credentials.region,
                "sample": [e.get("displayName", "") for e in endpoints][:20],
            },
        )]

    async def _check_datasets_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(f"{self._prefix}/datasets")
        if resp.status_code == 403:
            return [self._unavailable(
                "vertex_ai.datasets.inventory",
                "Vertex AI datasets are inventoried",
                "data_classification",
                "Grant the service account aiplatform.datasets.list permission.",
            )]
        resp.raise_for_status()
        datasets = resp.json().get("datasets", [])
        return [IntegrationFinding(
            check_id="vertex_ai.datasets.inventory",
            title="Vertex AI datasets are inventoried",
            description=f"{len(datasets)} dataset(s) found in {self.credentials.region}.",
            remediation=(
                "Review datasets periodically. Ensure each dataset has a data "
                "classification label and an owner."
            ),
            status="PASSED",
            severity="LOW",
            check_category="data_classification",
            result_details={
                "dataset_count": len(datasets),
                "region": self.credentials.region,
                "sample": [d.get("displayName", "") for d in datasets][:20],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Vertex AI with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
