# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the integration connect endpoint.

These assert the security invariants, not the happy path plumbing:

  * a slug with no shipped adapter is refused, so the UI and the server cannot
    disagree about what can collect;
  * a credential validation failure does not echo the submitted values back to
    the caller — a 400 body must never carry a token;
  * the organisation comes from the verified token, never the request body.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from sentinel.integrations import api as integrations_api
from sentinel.integrations.registry import available_slugs


class TestAdapterGate:
    """Only a registered adapter may be connected."""

    def test_registry_is_the_authority(self):
        slugs = available_slugs()
        assert isinstance(slugs, frozenset)
        # Whatever ships, the set must be explicit — never "everything".
        assert len(slugs) < 219, "every catalogue product cannot have an adapter"

    def test_shipped_adapters(self):
        # Keep in step with sentinel/integrations/registry.py AND with the
        # migration that flips `adapter_status` — a slug connectable in one and
        # not the other is either a dead Connect button or a hidden capability.
        assert available_slugs() == frozenset({
            "github", "aws", "microsoft_azure", "okta",
            "microsoft_entra_id", "microsoft_entra_id_gcc_high",
            "microsoft_intune", "microsoft_intune_gcc_high",
            "microsoft_sharepoint", "microsoft_onedrive", "microsoft_teams",
            "microsoft_defender_for_endpoint",
            "microsoft_defender_for_endpoint_gcc_high",
            "microsoft_sentinel", "azure_key_vault", "azure_devops",
            # Phase 2: Google family
            "google_workspace", "google_cloud_identity", "google_drive",
            "google_cloud_platform", "google_cloud_vertex_ai", "google_chronicle",
            # Phase 2: Atlassian family
            "jira", "jira_service_management", "confluence",
            "confluence_access_control", "bitbucket_pipelines",
            # Phase 2: GitLab family
            "gitlab_cloud", "gitlab_self_managed", "gitlab_ci_cd",
            # Phase 2: AWS AI / secrets
            "aws_bedrock", "aws_secrets_manager",
            # Phase 3: AI platforms
            "openai", "openai_azure_openai", "anthropic_claude_api",
            "anthropic_claude_console", "hugging_face_enterprise",
            "github_copilot", "cursor_codeium", "langsmith_langfuse",
            "arize_ai_phoenix", "weights_biases_w_b", "pinecone",
            "weaviate", "lakera_protect_ai", "hiddenlayer",
        })

    def test_catalogued_only_product_has_no_adapter(self):
        # Slack is catalogued but no adapter ships; connecting must be refused.
        # (Okta used to be the example here until its adapter shipped in
        # 20260922000001 — the point of the test is the refusal, not the slug.)
        assert "slack" not in available_slugs()

    def test_azure_is_keyed_by_its_catalogue_slug(self):
        # The catalogue row is `microsoft_azure`. Registering it as `azure`
        # would give a Connect button the server rejects — one id-space.
        assert "microsoft_azure" in available_slugs()
        assert "azure" not in available_slugs()

    def test_unknown_slug_raises_with_an_explanation(self):
        # The registry raises LookupError. KeyError is a SUBCLASS of it, so an
        # `except KeyError` in the endpoint would NOT catch this and an unknown
        # slug would surface as a 500. This test exists because that bug was
        # real; keep the assertion on LookupError.
        from sentinel.integrations.registry import get_adapter_class

        with pytest.raises(LookupError) as excinfo:
            get_adapter_class("definitely-not-a-product")
        # The message should tell an operator why, not just fail.
        assert "adapter" in str(excinfo.value).lower()


class TestConnectRequestShape:
    """The request model must not let a caller choose someone else's org."""

    def test_request_has_no_org_field(self):
        fields = set(integrations_api.ConnectRequest.model_fields)
        assert "org_id" not in fields
        assert "organization_id" not in fields
        assert "tenant_id" not in fields

    def test_request_requires_a_slug_and_credentials(self):
        fields = integrations_api.ConnectRequest.model_fields
        assert fields["catalog_slug"].is_required()
        assert fields["credentials"].is_required()

    def test_slug_length_is_bounded(self):
        # An unbounded slug is a cheap way to abuse a lookup.
        with pytest.raises(ValidationError):
            integrations_api.ConnectRequest(
                catalog_slug="x" * 500, credentials={"token": "t"}
            )


class TestResponseShape:
    """The response tells the operator what actually happened."""

    def test_response_reports_status_and_job(self):
        fields = set(integrations_api.ConnectResponse.model_fields)
        assert {"integration_id", "status", "job_id", "message"} <= fields

    def test_response_carries_no_credential_field(self):
        # Nothing about the submitted secret may travel back to the browser.
        fields = set(integrations_api.ConnectResponse.model_fields)
        assert not any("credential" in f or "token" in f or "secret" in f for f in fields)


class TestNoPlaintextLeak:
    """Credential values must not appear in source-level error strings."""

    def test_validation_error_message_is_generic(self):
        import inspect

        source = inspect.getsource(integrations_api.connect)
        # The 400 for bad credentials must not interpolate the submitted body.
        assert "do not match what the" in source
        assert "body.credentials}" not in source
        # `from None` keeps a pydantic error (which can quote values) off the wire.
        assert "from None" in source

    def test_db_error_is_not_surfaced_verbatim(self):
        import inspect

        source = inspect.getsource(integrations_api.connect)
        # The row carries the credential blob, so the driver message stays internal.
        assert "Could not save the integration" in source


class TestConnectFormMatchesTheAdapter:
    """The browser form and the server dataclass must agree field for field.

    The backend validates the submitted credential dict against the adapter's
    own credentials class, so a field the form does not collect — or collects
    under a different name — is a 400 the operator cannot diagnose. This test
    reads the TypeScript config directly rather than trusting a comment.
    """

    @staticmethod
    def _form_field_ids(config_path: str) -> set[str]:
        import pathlib
        import re

        source = pathlib.Path(config_path).read_text()
        body = source.split("credentialFields:", 1)[1].split("checkCategories:", 1)[0]
        ids = set(re.findall(r"^\s*id: '([a-z_]+)'", body, re.MULTILINE))
        if not ids:
            m = re.search(r"credentialFields[^=]*=\s*\[", source)
            if m:
                arr_start = m.end()
                depth, i = 1, arr_start
                while i < len(source) and depth > 0:
                    if source[i] == "[":
                        depth += 1
                    elif source[i] == "]":
                        depth -= 1
                    i += 1
                ids = set(re.findall(r"id:\s*'([a-z_]+)'", source[arr_start:i]))
        return ids

    @staticmethod
    def _credential_fields(credentials_cls) -> tuple[set[str], set[str]]:
        import dataclasses

        fields = dataclasses.fields(credentials_cls)
        required = {f.name for f in fields if f.default is dataclasses.MISSING}
        return {f.name for f in fields}, required

    def _assert_parity(self, slug: str, config_path: str) -> None:
        from sentinel.integrations.registry import get_adapter_class

        _adapter, credentials_cls = get_adapter_class(slug)
        all_names, required = self._credential_fields(credentials_cls)
        form = self._form_field_ids(config_path)

        assert form, f"no credentialFields parsed from {config_path}"
        unknown = form - all_names
        assert not unknown, f"{slug} form collects fields the adapter ignores: {unknown}"
        uncollected = required - form
        assert not uncollected, (
            f"{slug} adapter requires fields the form never collects: {uncollected}"
        )

    def test_github_form_matches_its_credentials(self):
        self._assert_parity("github", "dashboard/src/integrations/github/config.ts")

    def test_aws_form_matches_its_credentials(self):
        self._assert_parity("aws", "dashboard/src/integrations/aws/config.ts")

    def test_azure_form_matches_its_credentials(self):
        self._assert_parity("microsoft_azure", "dashboard/src/integrations/azure/config.ts")

    def test_okta_form_matches_its_credentials(self):
        self._assert_parity("okta", "dashboard/src/integrations/okta/config.ts")

    def test_intune_form_matches_its_credentials(self):
        self._assert_parity("microsoft_intune", "dashboard/src/integrations/intune/config.ts")

    def test_sharepoint_form_matches_its_credentials(self):
        self._assert_parity("microsoft_sharepoint", "dashboard/src/integrations/sharepoint/config.ts")

    def test_onedrive_form_matches_its_credentials(self):
        self._assert_parity("microsoft_onedrive", "dashboard/src/integrations/onedrive/config.ts")

    def test_teams_form_matches_its_credentials(self):
        self._assert_parity("microsoft_teams", "dashboard/src/integrations/teams/config.ts")

    def test_defender_form_matches_its_credentials(self):
        self._assert_parity("microsoft_defender_for_endpoint", "dashboard/src/integrations/defender/config.ts")

    def test_sentinel_form_matches_its_credentials(self):
        self._assert_parity("microsoft_sentinel", "dashboard/src/integrations/sentinel_siem/config.ts")

    def test_keyvault_form_matches_its_credentials(self):
        self._assert_parity("azure_key_vault", "dashboard/src/integrations/keyvault/config.ts")

    def test_devops_form_matches_its_credentials(self):
        self._assert_parity("azure_devops", "dashboard/src/integrations/devops/config.ts")

    def test_google_workspace_form_matches_its_credentials(self):
        self._assert_parity("google_workspace", "dashboard/src/integrations/google_workspace/config.ts")

    def test_google_cloud_identity_form_matches_its_credentials(self):
        self._assert_parity("google_cloud_identity", "dashboard/src/integrations/google_cloud_identity/config.ts")

    def test_google_drive_form_matches_its_credentials(self):
        self._assert_parity("google_drive", "dashboard/src/integrations/google_drive/config.ts")

    def test_gcp_form_matches_its_credentials(self):
        self._assert_parity("google_cloud_platform", "dashboard/src/integrations/gcp/config.ts")

    def test_vertex_ai_form_matches_its_credentials(self):
        self._assert_parity("google_cloud_vertex_ai", "dashboard/src/integrations/vertex_ai/config.ts")

    def test_chronicle_form_matches_its_credentials(self):
        self._assert_parity("google_chronicle", "dashboard/src/integrations/chronicle/config.ts")

    def test_jira_form_matches_its_credentials(self):
        self._assert_parity("jira", "dashboard/src/integrations/jira/config.ts")

    def test_jira_sm_form_matches_its_credentials(self):
        self._assert_parity("jira_service_management", "dashboard/src/integrations/jira_sm/config.ts")

    def test_confluence_form_matches_its_credentials(self):
        self._assert_parity("confluence", "dashboard/src/integrations/confluence/config.ts")

    def test_confluence_ac_form_matches_its_credentials(self):
        self._assert_parity("confluence_access_control", "dashboard/src/integrations/confluence_ac/config.ts")

    def test_bitbucket_form_matches_its_credentials(self):
        self._assert_parity("bitbucket_pipelines", "dashboard/src/integrations/bitbucket/config.ts")

    def test_gitlab_cloud_form_matches_its_credentials(self):
        self._assert_parity("gitlab_cloud", "dashboard/src/integrations/gitlab_cloud/config.ts")

    def test_gitlab_sm_form_matches_its_credentials(self):
        self._assert_parity("gitlab_self_managed", "dashboard/src/integrations/gitlab_sm/config.ts")

    def test_gitlab_cicd_form_matches_its_credentials(self):
        self._assert_parity("gitlab_ci_cd", "dashboard/src/integrations/gitlab_cicd/config.ts")

    def test_aws_bedrock_form_matches_its_credentials(self):
        self._assert_parity("aws_bedrock", "dashboard/src/integrations/aws_bedrock/config.ts")

    def test_aws_secrets_manager_form_matches_its_credentials(self):
        self._assert_parity("aws_secrets_manager", "dashboard/src/integrations/aws_secrets_manager/config.ts")

    # Phase 3: AI platforms
    def test_openai_form_matches_its_credentials(self):
        self._assert_parity("openai", "dashboard/src/integrations/openai_platform/config.ts")

    def test_azure_openai_form_matches_its_credentials(self):
        self._assert_parity("openai_azure_openai", "dashboard/src/integrations/azure_openai/config.ts")

    def test_anthropic_api_form_matches_its_credentials(self):
        self._assert_parity("anthropic_claude_api", "dashboard/src/integrations/anthropic_api/config.ts")

    def test_anthropic_console_form_matches_its_credentials(self):
        self._assert_parity("anthropic_claude_console", "dashboard/src/integrations/anthropic_console/config.ts")

    def test_hugging_face_form_matches_its_credentials(self):
        self._assert_parity("hugging_face_enterprise", "dashboard/src/integrations/hugging_face/config.ts")

    def test_github_copilot_form_matches_its_credentials(self):
        self._assert_parity("github_copilot", "dashboard/src/integrations/github_copilot/config.ts")

    def test_cursor_codeium_form_matches_its_credentials(self):
        self._assert_parity("cursor_codeium", "dashboard/src/integrations/cursor_codeium/config.ts")

    def test_langsmith_form_matches_its_credentials(self):
        self._assert_parity("langsmith_langfuse", "dashboard/src/integrations/langsmith/config.ts")

    def test_arize_form_matches_its_credentials(self):
        self._assert_parity("arize_ai_phoenix", "dashboard/src/integrations/arize/config.ts")

    def test_wandb_form_matches_its_credentials(self):
        self._assert_parity("weights_biases_w_b", "dashboard/src/integrations/wandb/config.ts")

    def test_pinecone_form_matches_its_credentials(self):
        self._assert_parity("pinecone", "dashboard/src/integrations/pinecone/config.ts")

    def test_weaviate_form_matches_its_credentials(self):
        self._assert_parity("weaviate", "dashboard/src/integrations/weaviate/config.ts")

    def test_lakera_form_matches_its_credentials(self):
        self._assert_parity("lakera_protect_ai", "dashboard/src/integrations/lakera/config.ts")

    def test_hiddenlayer_form_matches_its_credentials(self):
        self._assert_parity("hiddenlayer", "dashboard/src/integrations/hiddenlayer/config.ts")

    def test_every_shipped_adapter_has_a_connect_form(self):
        # A registered adapter with no form renders a "packaging gap" message
        # instead of fields. Catch it here rather than in front of a user.
        import pathlib

        paths = {
            "github": "dashboard/src/integrations/github/config.ts",
            "aws": "dashboard/src/integrations/aws/config.ts",
            "microsoft_azure": "dashboard/src/integrations/azure/config.ts",
            "okta": "dashboard/src/integrations/okta/config.ts",
            # Two slugs, one adapter — the connect forms differ only by cloud.
            "microsoft_entra_id": "dashboard/src/integrations/entra/config.ts",
            "microsoft_entra_id_gcc_high": "dashboard/src/integrations/entra/config.ts",
            "microsoft_intune": "dashboard/src/integrations/intune/config.ts",
            "microsoft_intune_gcc_high": "dashboard/src/integrations/intune/config.ts",
            # Phase 1: remaining Microsoft Graph family
            "microsoft_sharepoint": "dashboard/src/integrations/sharepoint/config.ts",
            "microsoft_onedrive": "dashboard/src/integrations/onedrive/config.ts",
            "microsoft_teams": "dashboard/src/integrations/teams/config.ts",
            "microsoft_defender_for_endpoint": "dashboard/src/integrations/defender/config.ts",
            "microsoft_defender_for_endpoint_gcc_high": "dashboard/src/integrations/defender/config.ts",
            "microsoft_sentinel": "dashboard/src/integrations/sentinel_siem/config.ts",
            "azure_key_vault": "dashboard/src/integrations/keyvault/config.ts",
            "azure_devops": "dashboard/src/integrations/devops/config.ts",
            # Phase 2: Google family
            "google_workspace": "dashboard/src/integrations/google_workspace/config.ts",
            "google_cloud_identity": "dashboard/src/integrations/google_cloud_identity/config.ts",
            "google_drive": "dashboard/src/integrations/google_drive/config.ts",
            "google_cloud_platform": "dashboard/src/integrations/gcp/config.ts",
            "google_cloud_vertex_ai": "dashboard/src/integrations/vertex_ai/config.ts",
            "google_chronicle": "dashboard/src/integrations/chronicle/config.ts",
            # Phase 2: Atlassian family
            "jira": "dashboard/src/integrations/jira/config.ts",
            "jira_service_management": "dashboard/src/integrations/jira_sm/config.ts",
            "confluence": "dashboard/src/integrations/confluence/config.ts",
            "confluence_access_control": "dashboard/src/integrations/confluence_ac/config.ts",
            "bitbucket_pipelines": "dashboard/src/integrations/bitbucket/config.ts",
            # Phase 2: GitLab family
            "gitlab_cloud": "dashboard/src/integrations/gitlab_cloud/config.ts",
            "gitlab_self_managed": "dashboard/src/integrations/gitlab_sm/config.ts",
            "gitlab_ci_cd": "dashboard/src/integrations/gitlab_cicd/config.ts",
            # Phase 2: AWS AI / secrets
            "aws_bedrock": "dashboard/src/integrations/aws_bedrock/config.ts",
            "aws_secrets_manager": "dashboard/src/integrations/aws_secrets_manager/config.ts",
            # Phase 3: AI platforms
            "openai": "dashboard/src/integrations/openai_platform/config.ts",
            "openai_azure_openai": "dashboard/src/integrations/azure_openai/config.ts",
            "anthropic_claude_api": "dashboard/src/integrations/anthropic_api/config.ts",
            "anthropic_claude_console": "dashboard/src/integrations/anthropic_console/config.ts",
            "hugging_face_enterprise": "dashboard/src/integrations/hugging_face/config.ts",
            "github_copilot": "dashboard/src/integrations/github_copilot/config.ts",
            "cursor_codeium": "dashboard/src/integrations/cursor_codeium/config.ts",
            "langsmith_langfuse": "dashboard/src/integrations/langsmith/config.ts",
            "arize_ai_phoenix": "dashboard/src/integrations/arize/config.ts",
            "weights_biases_w_b": "dashboard/src/integrations/wandb/config.ts",
            "pinecone": "dashboard/src/integrations/pinecone/config.ts",
            "weaviate": "dashboard/src/integrations/weaviate/config.ts",
            "lakera_protect_ai": "dashboard/src/integrations/lakera/config.ts",
            "hiddenlayer": "dashboard/src/integrations/hiddenlayer/config.ts",
        }
        assert set(paths) == set(available_slugs())
        for slug, path in paths.items():
            assert pathlib.Path(path).exists(), f"{slug} has no connect form at {path}"
