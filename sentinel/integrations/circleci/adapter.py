# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""CircleCI integration adapter.

Reads pipeline security posture from the CircleCI API v2: how widely
context environment variables are exposed, how many distinct actors
can trigger pipelines directly, and whether deploy workflows enforce
an approval gate before running.

Auth: a CircleCI Personal API Token (Bearer), scoped to one
organization via its org slug (e.g. ``gh/my-org``).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://circleci.com/api/v2"

#: Context names commonly used to hold org-wide, always-on credentials.
_BROAD_CONTEXT_HINTS = ("global", "all-projects", "org", "shared")


@dataclass
class CircleciCredentials:
    """Matches dashboard/src/integrations/circleci/config.ts credentialFields."""

    api_key: str
    org_slug: str


class CircleciAdapter:
    """Fetches pipeline security posture from CircleCI."""

    def __init__(self, credentials: CircleciCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "CircleCI rejected the personal API token. Verify it is "
                    "active and belongs to a member of the organization."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach CircleCI: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_context_secret_scope(client),
                self._check_pipeline_trigger_access(client),
                self._check_deploy_approval_gate(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("circleci check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_context_secret_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/context", **{"owner-slug": self.credentials.org_slug, "owner-type": "organization"}
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "circleci.contexts.secret_scope",
                "Context environment-variable exposure scope",
                "secret_management",
                "Grant the token access to organization contexts.",
            )]
        resp.raise_for_status()
        contexts = resp.json().get("items", [])
        broad_contexts_with_vars: list[str] = []
        total_vars = 0
        for ctx in contexts[:20]:
            name = ctx.get("name", "")
            env_resp = await self._get(client, f"/context/{ctx.get('id')}/environment-variable")
            if env_resp.status_code in (401, 403, 404):
                continue
            env_resp.raise_for_status()
            variables = env_resp.json().get("items", [])
            total_vars += len(variables)
            if variables and any(hint in name.lower() for hint in _BROAD_CONTEXT_HINTS):
                broad_contexts_with_vars.append(name)
        passed = len(broad_contexts_with_vars) == 0
        return [IntegrationFinding(
            check_id="circleci.contexts.secret_scope",
            title="No broadly-named context exposes secrets org-wide",
            description=(
                f"{len(contexts)} context(s) hold {total_vars} environment "
                f"variable(s) in total; {len(broad_contexts_with_vars)} "
                "broadly-named context(s) (e.g. 'global', 'all-projects') "
                "carry variables reachable by every project that references them."
            ),
            remediation=(
                "Split shared contexts into narrowly-scoped ones per "
                "environment or team, and restrict each context to the "
                "specific projects and branches that need it."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if broad_contexts_with_vars else "INFO",
            check_category="secret_management",
            result_details={
                "context_count": len(contexts),
                "total_environment_variable_count": total_vars,
                "broadly_named_contexts_with_vars": broad_contexts_with_vars,
            },
        )]

    async def _check_pipeline_trigger_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/pipeline", **{"org-slug": self.credentials.org_slug})
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "circleci.pipelines.trigger_access",
                "Pipeline trigger access hygiene",
                "access_control",
                "Grant the token access to organization pipelines.",
            )]
        resp.raise_for_status()
        pipelines = resp.json().get("items", [])
        api_triggered = [
            p for p in pipelines
            if (p.get("trigger") or {}).get("type") == "api"
        ]
        actors = {
            (p.get("trigger") or {}).get("actor", {}).get("login")
            for p in api_triggered
            if (p.get("trigger") or {}).get("actor", {}).get("login")
        }
        return [IntegrationFinding(
            check_id="circleci.pipelines.trigger_access",
            title="Direct API pipeline triggers are limited to known actors",
            description=(
                f"{len(api_triggered)} of {len(pipelines)} recent pipeline(s) "
                f"were triggered directly via the API by {len(actors)} distinct "
                "actor(s), bypassing the normal VCS webhook trigger path."
            ),
            remediation=(
                "Review who holds personal API tokens capable of triggering "
                "pipelines directly, and prefer VCS-triggered pipelines with "
                "branch protection over broadly-held API-trigger access."
            ),
            status="PASSED" if len(actors) <= 3 else "WARNING",
            severity="MEDIUM" if len(actors) > 3 else "INFO",
            check_category="access_control",
            result_details={
                "pipeline_count": len(pipelines),
                "api_triggered_pipeline_count": len(api_triggered),
                "distinct_api_trigger_actors": len(actors),
            },
        )]

    async def _check_deploy_approval_gate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        pipeline_resp = await self._get(client, "/pipeline", **{"org-slug": self.credentials.org_slug})
        if pipeline_resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "circleci.workflows.deploy_approval_gate",
                "Deploy workflow approval gate",
                "change_management",
                "Grant the token access to organization pipelines and workflows.",
            )]
        pipeline_resp.raise_for_status()
        pipelines = pipeline_resp.json().get("items", [])

        deploy_workflows_checked = 0
        deploy_workflows_without_gate = 0
        for pipeline in pipelines[:10]:
            wf_resp = await self._get(client, f"/pipeline/{pipeline.get('id')}/workflow")
            if wf_resp.status_code in (401, 403, 404):
                continue
            wf_resp.raise_for_status()
            workflows = wf_resp.json().get("items", [])
            for wf in workflows:
                if "deploy" not in (wf.get("name") or "").lower():
                    continue
                deploy_workflows_checked += 1
                job_resp = await self._get(client, f"/workflow/{wf.get('id')}/job")
                if job_resp.status_code in (401, 403, 404):
                    deploy_workflows_checked -= 1
                    continue
                job_resp.raise_for_status()
                jobs = job_resp.json().get("items", [])
                has_approval_job = any(j.get("type") == "approval" for j in jobs)
                if not has_approval_job:
                    deploy_workflows_without_gate += 1

        if deploy_workflows_checked == 0:
            return [self._unavailable(
                "circleci.workflows.deploy_approval_gate",
                "Deploy workflow approval gate",
                "change_management",
                "No recent 'deploy'-named workflows were found to check.",
            )]

        passed = deploy_workflows_without_gate == 0
        return [IntegrationFinding(
            check_id="circleci.workflows.deploy_approval_gate",
            title="Deploy workflows require manual approval before running",
            description=(
                f"{deploy_workflows_without_gate} of {deploy_workflows_checked} "
                "recent deploy workflow(s) ran with no approval-type job gating "
                "the deploy jobs."
            ),
            remediation=(
                "Add a `type: approval` job ahead of deploy jobs in every "
                "deploy workflow, and restrict who can approve via project "
                "or org role permissions."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if deploy_workflows_without_gate else "INFO",
            check_category="change_management",
            result_details={
                "deploy_workflows_checked": deploy_workflows_checked,
                "deploy_workflows_without_approval_gate": deploy_workflows_without_gate,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from CircleCI with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
