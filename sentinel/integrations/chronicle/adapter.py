# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Chronicle (SecOps) integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Chronicle API to inventory alerts and detection rules.

Auth: a GCP service account. OAuth scopes required:

  https://www.googleapis.com/auth/chronicle-backstory
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_SCOPES = [
    "https://www.googleapis.com/auth/chronicle-backstory",
]


@dataclass
class ChronicleCredentials(GoogleCredentials):
    """Matches dashboard credential fields for Chronicle."""

    instance_id: str = ""
    region: str = "us"

    @property
    def api_base(self) -> str:
        return f"https://{self.region}-chronicle.googleapis.com"


class ChronicleAdapter:
    """Fetches alert and rule posture from Google Chronicle."""

    def __init__(self, credentials: ChronicleCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    @property
    def _prefix(self) -> str:
        return (
            f"{self.credentials.api_base}/v1alpha/projects/"
            f"{self.credentials.project_id}/locations/{self.credentials.region}"
            f"/instances/{self.credentials.instance_id}"
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{self._prefix}/legacy:legacySearchRules",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Chronicle API "
                    f"(HTTP {resp.status_code}). Verify the service account has "
                    "the required permissions and the instance_id is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Chronicle API: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_alerts_volume(),
            self._check_rules_inventory(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("chronicle check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_alerts_volume(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{self._prefix}/legacy:legacySearchAlerts",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "chronicle.alerts.volume",
                "Chronicle alert volume is monitored",
                "incident_response",
                "Grant the service account chronicle-backstory scope and verify "
                "the instance_id is correct.",
            )]
        resp.raise_for_status()
        alerts = resp.json().get("alerts", [])
        count = len(alerts)
        return [IntegrationFinding(
            check_id="chronicle.alerts.volume",
            title="Chronicle alert volume is monitored",
            description=f"{count} recent alert(s) found in the Chronicle instance.",
            remediation=(
                "Review alert volume trends. A sudden spike may indicate an "
                "incident; a sustained zero may indicate broken ingestion."
            ),
            status="PASSED" if count > 0 else "WARNING",
            severity="MEDIUM",
            check_category="incident_response",
            result_details={
                "alert_count": count,
                "instance_id": self.credentials.instance_id,
            },
        )]

    async def _check_rules_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{self._prefix}/legacy:legacySearchRules",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "chronicle.rules.inventory",
                "Chronicle detection rules are inventoried",
                "audit_logging",
                "Grant the service account chronicle-backstory scope and verify "
                "the instance_id is correct.",
            )]
        resp.raise_for_status()
        rules = resp.json().get("rules", [])
        count = len(rules)
        return [IntegrationFinding(
            check_id="chronicle.rules.inventory",
            title="Chronicle detection rules are inventoried",
            description=f"{count} detection rule(s) found in the Chronicle instance.",
            remediation=(
                "Review detection rules periodically. Ensure rules cover the "
                "threat scenarios relevant to your organisation and that stale "
                "rules are disabled or updated."
            ),
            status="PASSED" if count > 0 else "WARNING",
            severity="MEDIUM",
            check_category="audit_logging",
            result_details={
                "rule_count": count,
                "instance_id": self.credentials.instance_id,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Chronicle with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
