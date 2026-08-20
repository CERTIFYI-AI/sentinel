# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Docker Hub integration adapter.

Reads registry security posture from the Docker Hub v2 API: repository
visibility, organization member access hygiene, and (where the plan
includes Docker Scout) image vulnerability-scan results.

Auth: username + Docker Hub Personal Access Token, exchanged for a
short-lived JWT via the v2 login endpoint.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://hub.docker.com/v2"


@dataclass
class DockerHubCredentials:
    """Matches dashboard/src/integrations/docker_hub/config.ts credentialFields."""

    username: str
    credential: str


class DockerHubAdapter:
    """Fetches registry security posture from Docker Hub."""

    def __init__(self, credentials: DockerHubCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._jwt: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Exchange the username + PAT for a short-lived JWT."""
        if self._jwt:
            return self._jwt
        resp = await client.post(
            f"{_BASE}/users/login/",
            json={
                "username": self.credentials.username,
                # Docker Hub's v2 login endpoint requires this exact wire
                # field name; the value is the operator-supplied PAT, never
                # a real account password.
                "password": self.credentials.credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Docker Hub rejected the username / access token pair. "
                "Verify the personal access token is active."
            )
        resp.raise_for_status()
        self._jwt = resp.json().get("token", "")
        return self._jwt

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers={"Authorization": f"JWT {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, f"/repositories/{self.credentials.username}/", page_size=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Docker Hub rejected the request for repository access. "
                    "Verify the token has read permission on the account."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Docker Hub: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_repository_visibility(client),
                self._check_member_access_hygiene(client),
                self._check_image_scanning(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("docker_hub check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_repository_visibility(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"/repositories/{self.credentials.username}/", page_size=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "docker_hub.repos.visibility",
                "Repository visibility",
                "data_classification",
                "Grant the access token read permission on the account's repositories.",
            )]
        resp.raise_for_status()
        data = resp.json()
        repos = data.get("results", [])
        public_repos = [r for r in repos if not r.get("is_private", True)]
        passed = len(public_repos) == 0
        return [IntegrationFinding(
            check_id="docker_hub.repos.visibility",
            title="No unexpected public repositories",
            description=(
                f"{len(public_repos)} of {len(repos)} repository/repositories "
                "are public."
            ),
            remediation=(
                "Review public repositories and set any that contain internal "
                "images, proprietary code, or embedded credentials to private."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if public_repos else "INFO",
            check_category="data_classification",
            result_details={
                "repository_count": len(repos),
                "public_repository_count": len(public_repos),
                "public_repository_names": [r.get("name") for r in public_repos][:25],
            },
        )]

    async def _check_member_access_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"/orgs/{self.credentials.username}/members/", page_size=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "docker_hub.org.member_access_hygiene",
                "Organization member access hygiene",
                "access_control",
                "This account may not be a Docker Hub organization, or the "
                "token lacks org:admin permission to list members.",
            )]
        resp.raise_for_status()
        data = resp.json()
        members = data.get("results", [])
        owners = [m for m in members if m.get("role") == "owner"]
        total = len(members)
        broad_owner_ratio = total > 0 and (len(owners) / total) > 0.5
        return [IntegrationFinding(
            check_id="docker_hub.org.member_access_hygiene",
            title="Organization owner role is not over-assigned",
            description=(
                f"{len(owners)} of {total} organization member(s) hold the "
                "owner role."
            ),
            remediation=(
                "Limit the owner role to a small set of administrators. Use "
                "teams with scoped repository permissions for everyone else, "
                "and require 2FA for all members."
            ),
            status="PASSED" if not broad_owner_ratio else "WARNING",
            severity="MEDIUM" if broad_owner_ratio else "INFO",
            check_category="access_control",
            result_details={
                "member_count": total,
                "owner_count": len(owners),
            },
        )]

    async def _check_image_scanning(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        repos_resp = await self._get(client, f"/repositories/{self.credentials.username}/", page_size=1)
        if repos_resp.status_code in (401, 403):
            return [self._unavailable(
                "docker_hub.images.vulnerability_scan",
                "Image vulnerability scanning",
                "vulnerability_management",
                "Grant the access token read permission on repositories.",
            )]
        repos_resp.raise_for_status()
        repos = repos_resp.json().get("results", [])
        if not repos:
            return [self._unavailable(
                "docker_hub.images.vulnerability_scan",
                "Image vulnerability scanning",
                "vulnerability_management",
                "No repositories were found to scan.",
            )]
        repo_name = repos[0].get("name")
        scan_resp = await self._get(
            client, f"/repositories/{self.credentials.username}/{repo_name}/tags/", page_size=1
        )
        if scan_resp.status_code in (402, 403, 404):
            # Vulnerability scanning (Docker Scout) is a paid-plan feature.
            return [self._unavailable(
                "docker_hub.images.vulnerability_scan",
                "Image vulnerability scanning",
                "vulnerability_management",
                "Enable Docker Scout / vulnerability scanning on the "
                "organization's plan to get scan results.",
            )]
        scan_resp.raise_for_status()
        tags = scan_resp.json().get("results", [])
        scanned_tags = [t for t in tags if "vulnerabilities" in t or "tag_status" in t]
        return [IntegrationFinding(
            check_id="docker_hub.images.vulnerability_scan",
            title="Image vulnerability scan results reviewed",
            description=(
                f"Checked the most recent tag(s) of '{repo_name}': "
                f"{len(scanned_tags)} of {len(tags)} carried scan metadata."
            ),
            remediation=(
                "Enable Docker Scout on all repositories and remediate "
                "critical/high image vulnerabilities before promoting tags."
            ),
            status="PASSED" if tags and not scanned_tags else "WARNING",
            severity="INFO",
            check_category="vulnerability_management",
            result_details={
                "repository_checked": repo_name,
                "tag_count": len(tags),
                "tags_with_scan_metadata": len(scanned_tags),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Docker Hub with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
