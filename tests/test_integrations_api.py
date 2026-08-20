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
            # Phase 4: Identity providers
            "auth0", "onelogin", "pingone", "ping_identity",
            "jumpcloud", "duo", "1password",
            "1password_device_trust_kolide", "keeper", "cyberark",
            "sailpoint", "one_identity",
            # Phase 5: Device / MDM
            "jamf_pro", "kandji_iru", "mosyle", "addigy",
            "hexnode", "fleetdm", "ninjaone", "miradore",
            "manageengine", "omnissa_workspace_one",
            "vmware_workspace_one", "jumpcloud_mdm",
            # Phase 6: Security / SIEM
            "aikido", "aqua_security", "bitsight", "checkmarx",
            "crowdstrike", "datadog", "elastic_security",
            "gitguardian", "gitleaks", "grafana", "graylog",
            "lacework", "launchdarkly", "logrhythm", "nessus",
            "new_relic", "openvas", "orca_security", "prisma_cloud",
            "qualys", "rapid7_insightvm", "rollbar",
            "securityscorecard", "semgrep", "sentinelone", "sentry",
            "snyk", "sonarqube", "splunk", "splunk_enterprise",
            "sumo_logic", "tailscale", "tenable",
            "tenable_vulnerability_management_fedramp",
            "trivy", "trufflehog", "veracode", "wiz",
            # Phase 7: HRIS / people
            "workday", "sap_successfactors", "adp", "adp_workforce_now",
            "ukg", "paychex", "bamboohr", "hibob", "personio",
            "rippling", "gusto", "deel", "trinet", "justworks",
            "isolved", "payfit", "square_payroll", "kenjo", "netsuite",
            "factorial", "charthop", "humaans", "proliant", "alexishr",
            "employment_hero", "7shifts",
            # Phase 8: Collaboration, ticketing & business SaaS
            "slack", "zoom", "webex", "box", "dropbox", "notion",
            "docusign", "calendly", "miro", "servicenow", "zendesk",
            "asana", "linear", "clickup", "monday_com", "basecamp",
            "smartsheet", "teamwork", "freshservice", "salesforce",
            "hubspot", "pipedrive", "copper", "insightly", "close",
            "capsule", "gong", "gorgias", "intercom", "xero",
            "quickbooks", "brex", "ramp", "twilio", "apollo", "zoominfo",
            "envoy", "torii", "rockset", "clockwork", "knowbe4",
            "udemy_business", "wizer", "mimecast", "docebo", "cybeready",
            "breezy_hr", "cats", "jobvite", "smartrecruiters",
            "teamtailor", "jobadder", "lever", "comeet", "certn",
            "checkr", "oracle_cloud", "digitalocean", "vercel",
            "netlify", "scaleway", "supabase", "ovhcloud", "heroku",
            "akamai", "snowflake", "render", "mongodb_atlas",
            "mongodb_atlas_for_government", "ibm_cloud", "alibaba_cloud",
            "cloudflare", "kubernetes", "docker_hub", "github_actions",
            "jenkins", "circleci", "hashicorp_vault", "bitwarden",
            "fieldguide", "vouch_cyber_insurance", "a_scend",
        })

    def test_catalogued_only_product_has_no_adapter(self):
        # A catalogued slug with no adapter must be refused. The example has
        # moved as adapters shipped (okta -> slack -> here); the point of the
        # test is the refusal, not the slug.
        #
        # `sharepoint` is the bare catalogue row that duplicates the shipped
        # `microsoft_sharepoint` entry. Nothing is registered under the bare
        # slug, so it doubles as a one-id-space guard: an adapter reachable
        # under two different slugs would let the same product be connected
        # twice and collect against two identities.
        assert "sharepoint" not in available_slugs()
        assert "microsoft_sharepoint" in available_slugs()

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

    # Phase 4: Identity providers
    def test_auth0_form_matches_its_credentials(self):
        self._assert_parity("auth0", "dashboard/src/integrations/auth0/config.ts")

    def test_onelogin_form_matches_its_credentials(self):
        self._assert_parity("onelogin", "dashboard/src/integrations/onelogin/config.ts")

    def test_pingone_form_matches_its_credentials(self):
        self._assert_parity("pingone", "dashboard/src/integrations/pingone/config.ts")

    def test_ping_identity_form_matches_its_credentials(self):
        self._assert_parity("ping_identity", "dashboard/src/integrations/ping_identity/config.ts")

    def test_jumpcloud_form_matches_its_credentials(self):
        self._assert_parity("jumpcloud", "dashboard/src/integrations/jumpcloud/config.ts")

    def test_duo_form_matches_its_credentials(self):
        self._assert_parity("duo", "dashboard/src/integrations/duo/config.ts")

    def test_onepassword_form_matches_its_credentials(self):
        self._assert_parity("1password", "dashboard/src/integrations/onepassword/config.ts")

    def test_onepassword_device_trust_form_matches_its_credentials(self):
        self._assert_parity("1password_device_trust_kolide", "dashboard/src/integrations/onepassword_device_trust/config.ts")

    def test_keeper_form_matches_its_credentials(self):
        self._assert_parity("keeper", "dashboard/src/integrations/keeper/config.ts")

    def test_cyberark_form_matches_its_credentials(self):
        self._assert_parity("cyberark", "dashboard/src/integrations/cyberark/config.ts")

    def test_sailpoint_form_matches_its_credentials(self):
        self._assert_parity("sailpoint", "dashboard/src/integrations/sailpoint/config.ts")

    def test_one_identity_form_matches_its_credentials(self):
        self._assert_parity("one_identity", "dashboard/src/integrations/one_identity/config.ts")

    # Phase 5: Device / MDM
    def test_jamf_pro_form_matches_its_credentials(self):
        self._assert_parity("jamf_pro", "dashboard/src/integrations/jamf_pro/config.ts")

    def test_kandji_iru_form_matches_its_credentials(self):
        self._assert_parity("kandji_iru", "dashboard/src/integrations/kandji_iru/config.ts")

    def test_mosyle_form_matches_its_credentials(self):
        self._assert_parity("mosyle", "dashboard/src/integrations/mosyle/config.ts")

    def test_addigy_form_matches_its_credentials(self):
        self._assert_parity("addigy", "dashboard/src/integrations/addigy/config.ts")

    def test_hexnode_form_matches_its_credentials(self):
        self._assert_parity("hexnode", "dashboard/src/integrations/hexnode/config.ts")

    def test_fleetdm_form_matches_its_credentials(self):
        self._assert_parity("fleetdm", "dashboard/src/integrations/fleetdm/config.ts")

    def test_ninjaone_form_matches_its_credentials(self):
        self._assert_parity("ninjaone", "dashboard/src/integrations/ninjaone/config.ts")

    def test_miradore_form_matches_its_credentials(self):
        self._assert_parity("miradore", "dashboard/src/integrations/miradore/config.ts")

    def test_manageengine_form_matches_its_credentials(self):
        self._assert_parity("manageengine", "dashboard/src/integrations/manageengine/config.ts")

    def test_omnissa_workspace_one_form_matches_its_credentials(self):
        self._assert_parity("omnissa_workspace_one", "dashboard/src/integrations/omnissa_workspace_one/config.ts")

    def test_vmware_workspace_one_form_matches_its_credentials(self):
        self._assert_parity("vmware_workspace_one", "dashboard/src/integrations/vmware_workspace_one/config.ts")

    def test_jumpcloud_mdm_form_matches_its_credentials(self):
        self._assert_parity("jumpcloud_mdm", "dashboard/src/integrations/jumpcloud_mdm/config.ts")

    # Phase 6: Security / SIEM
    def test_aikido_form_matches_its_credentials(self):
        self._assert_parity("aikido", "dashboard/src/integrations/aikido/config.ts")

    def test_aqua_security_form_matches_its_credentials(self):
        self._assert_parity("aqua_security", "dashboard/src/integrations/aqua_security/config.ts")

    def test_bitsight_form_matches_its_credentials(self):
        self._assert_parity("bitsight", "dashboard/src/integrations/bitsight/config.ts")

    def test_checkmarx_form_matches_its_credentials(self):
        self._assert_parity("checkmarx", "dashboard/src/integrations/checkmarx/config.ts")

    def test_crowdstrike_form_matches_its_credentials(self):
        self._assert_parity("crowdstrike", "dashboard/src/integrations/crowdstrike/config.ts")

    def test_datadog_form_matches_its_credentials(self):
        self._assert_parity("datadog", "dashboard/src/integrations/datadog/config.ts")

    def test_elastic_security_form_matches_its_credentials(self):
        self._assert_parity("elastic_security", "dashboard/src/integrations/elastic_security/config.ts")

    def test_gitguardian_form_matches_its_credentials(self):
        self._assert_parity("gitguardian", "dashboard/src/integrations/gitguardian/config.ts")

    def test_gitleaks_form_matches_its_credentials(self):
        self._assert_parity("gitleaks", "dashboard/src/integrations/gitleaks/config.ts")

    def test_grafana_form_matches_its_credentials(self):
        self._assert_parity("grafana", "dashboard/src/integrations/grafana/config.ts")

    def test_graylog_form_matches_its_credentials(self):
        self._assert_parity("graylog", "dashboard/src/integrations/graylog/config.ts")

    def test_lacework_form_matches_its_credentials(self):
        self._assert_parity("lacework", "dashboard/src/integrations/lacework/config.ts")

    def test_launchdarkly_form_matches_its_credentials(self):
        self._assert_parity("launchdarkly", "dashboard/src/integrations/launchdarkly/config.ts")

    def test_logrhythm_form_matches_its_credentials(self):
        self._assert_parity("logrhythm", "dashboard/src/integrations/logrhythm/config.ts")

    def test_nessus_form_matches_its_credentials(self):
        self._assert_parity("nessus", "dashboard/src/integrations/nessus/config.ts")

    def test_new_relic_form_matches_its_credentials(self):
        self._assert_parity("new_relic", "dashboard/src/integrations/new_relic/config.ts")

    def test_openvas_form_matches_its_credentials(self):
        self._assert_parity("openvas", "dashboard/src/integrations/openvas/config.ts")

    def test_orca_security_form_matches_its_credentials(self):
        self._assert_parity("orca_security", "dashboard/src/integrations/orca_security/config.ts")

    def test_prisma_cloud_form_matches_its_credentials(self):
        self._assert_parity("prisma_cloud", "dashboard/src/integrations/prisma_cloud/config.ts")

    def test_qualys_form_matches_its_credentials(self):
        self._assert_parity("qualys", "dashboard/src/integrations/qualys/config.ts")

    def test_rapid7_insightvm_form_matches_its_credentials(self):
        self._assert_parity("rapid7_insightvm", "dashboard/src/integrations/rapid7_insightvm/config.ts")

    def test_rollbar_form_matches_its_credentials(self):
        self._assert_parity("rollbar", "dashboard/src/integrations/rollbar/config.ts")

    def test_securityscorecard_form_matches_its_credentials(self):
        self._assert_parity("securityscorecard", "dashboard/src/integrations/securityscorecard/config.ts")

    def test_semgrep_form_matches_its_credentials(self):
        self._assert_parity("semgrep", "dashboard/src/integrations/semgrep/config.ts")

    def test_sentinelone_form_matches_its_credentials(self):
        self._assert_parity("sentinelone", "dashboard/src/integrations/sentinelone/config.ts")

    def test_sentry_form_matches_its_credentials(self):
        self._assert_parity("sentry", "dashboard/src/integrations/sentry/config.ts")

    def test_snyk_form_matches_its_credentials(self):
        self._assert_parity("snyk", "dashboard/src/integrations/snyk/config.ts")

    def test_sonarqube_form_matches_its_credentials(self):
        self._assert_parity("sonarqube", "dashboard/src/integrations/sonarqube/config.ts")

    def test_splunk_form_matches_its_credentials(self):
        self._assert_parity("splunk", "dashboard/src/integrations/splunk/config.ts")

    def test_splunk_enterprise_form_matches_its_credentials(self):
        self._assert_parity("splunk_enterprise", "dashboard/src/integrations/splunk_enterprise/config.ts")

    def test_sumo_logic_form_matches_its_credentials(self):
        self._assert_parity("sumo_logic", "dashboard/src/integrations/sumo_logic/config.ts")

    def test_tailscale_form_matches_its_credentials(self):
        self._assert_parity("tailscale", "dashboard/src/integrations/tailscale/config.ts")

    def test_tenable_form_matches_its_credentials(self):
        self._assert_parity("tenable", "dashboard/src/integrations/tenable/config.ts")

    def test_tenable_fedramp_form_matches_its_credentials(self):
        self._assert_parity("tenable_vulnerability_management_fedramp", "dashboard/src/integrations/tenable_vulnerability_management_fedramp/config.ts")

    def test_trivy_form_matches_its_credentials(self):
        self._assert_parity("trivy", "dashboard/src/integrations/trivy/config.ts")

    def test_trufflehog_form_matches_its_credentials(self):
        self._assert_parity("trufflehog", "dashboard/src/integrations/trufflehog/config.ts")

    def test_veracode_form_matches_its_credentials(self):
        self._assert_parity("veracode", "dashboard/src/integrations/veracode/config.ts")

    def test_wiz_form_matches_its_credentials(self):
        self._assert_parity("wiz", "dashboard/src/integrations/wiz/config.ts")

    def test_workday_form_matches_its_credentials(self):
        self._assert_parity("workday", "dashboard/src/integrations/workday/config.ts")

    def test_sap_successfactors_form_matches_its_credentials(self):
        self._assert_parity(
            "sap_successfactors", "dashboard/src/integrations/sap_successfactors/config.ts"
        )

    def test_adp_form_matches_its_credentials(self):
        self._assert_parity("adp", "dashboard/src/integrations/adp/config.ts")

    def test_adp_workforce_now_form_matches_its_credentials(self):
        self._assert_parity(
            "adp_workforce_now", "dashboard/src/integrations/adp_workforce_now/config.ts"
        )

    def test_ukg_form_matches_its_credentials(self):
        self._assert_parity("ukg", "dashboard/src/integrations/ukg/config.ts")

    def test_paychex_form_matches_its_credentials(self):
        self._assert_parity("paychex", "dashboard/src/integrations/paychex/config.ts")

    def test_bamboohr_form_matches_its_credentials(self):
        self._assert_parity("bamboohr", "dashboard/src/integrations/bamboohr/config.ts")

    def test_hibob_form_matches_its_credentials(self):
        self._assert_parity("hibob", "dashboard/src/integrations/hibob/config.ts")

    def test_personio_form_matches_its_credentials(self):
        self._assert_parity("personio", "dashboard/src/integrations/personio/config.ts")

    def test_rippling_form_matches_its_credentials(self):
        self._assert_parity("rippling", "dashboard/src/integrations/rippling/config.ts")

    def test_gusto_form_matches_its_credentials(self):
        self._assert_parity("gusto", "dashboard/src/integrations/gusto/config.ts")

    def test_deel_form_matches_its_credentials(self):
        self._assert_parity("deel", "dashboard/src/integrations/deel/config.ts")

    def test_trinet_form_matches_its_credentials(self):
        self._assert_parity("trinet", "dashboard/src/integrations/trinet/config.ts")

    def test_justworks_form_matches_its_credentials(self):
        self._assert_parity("justworks", "dashboard/src/integrations/justworks/config.ts")

    def test_isolved_form_matches_its_credentials(self):
        self._assert_parity("isolved", "dashboard/src/integrations/isolved/config.ts")

    def test_payfit_form_matches_its_credentials(self):
        self._assert_parity("payfit", "dashboard/src/integrations/payfit/config.ts")

    def test_square_payroll_form_matches_its_credentials(self):
        self._assert_parity(
            "square_payroll", "dashboard/src/integrations/square_payroll/config.ts"
        )

    def test_kenjo_form_matches_its_credentials(self):
        self._assert_parity("kenjo", "dashboard/src/integrations/kenjo/config.ts")

    def test_netsuite_form_matches_its_credentials(self):
        self._assert_parity("netsuite", "dashboard/src/integrations/netsuite/config.ts")

    def test_factorial_form_matches_its_credentials(self):
        self._assert_parity("factorial", "dashboard/src/integrations/factorial/config.ts")

    def test_charthop_form_matches_its_credentials(self):
        self._assert_parity("charthop", "dashboard/src/integrations/charthop/config.ts")

    def test_humaans_form_matches_its_credentials(self):
        self._assert_parity("humaans", "dashboard/src/integrations/humaans/config.ts")

    def test_proliant_form_matches_its_credentials(self):
        self._assert_parity("proliant", "dashboard/src/integrations/proliant/config.ts")

    def test_alexishr_form_matches_its_credentials(self):
        self._assert_parity("alexishr", "dashboard/src/integrations/alexishr/config.ts")

    def test_employment_hero_form_matches_its_credentials(self):
        self._assert_parity(
            "employment_hero", "dashboard/src/integrations/employment_hero/config.ts"
        )

    def test_seven_shifts_form_matches_its_credentials(self):
        self._assert_parity("7shifts", "dashboard/src/integrations/seven_shifts/config.ts")

    def test_slack_form_matches_its_credentials(self):
        self._assert_parity("slack", "dashboard/src/integrations/slack/config.ts")

    def test_zoom_form_matches_its_credentials(self):
        self._assert_parity("zoom", "dashboard/src/integrations/zoom/config.ts")

    def test_webex_form_matches_its_credentials(self):
        self._assert_parity("webex", "dashboard/src/integrations/webex/config.ts")

    def test_box_form_matches_its_credentials(self):
        self._assert_parity("box", "dashboard/src/integrations/box/config.ts")

    def test_dropbox_form_matches_its_credentials(self):
        self._assert_parity("dropbox", "dashboard/src/integrations/dropbox/config.ts")

    def test_notion_form_matches_its_credentials(self):
        self._assert_parity("notion", "dashboard/src/integrations/notion/config.ts")

    def test_docusign_form_matches_its_credentials(self):
        self._assert_parity("docusign", "dashboard/src/integrations/docusign/config.ts")

    def test_calendly_form_matches_its_credentials(self):
        self._assert_parity("calendly", "dashboard/src/integrations/calendly/config.ts")

    def test_miro_form_matches_its_credentials(self):
        self._assert_parity("miro", "dashboard/src/integrations/miro/config.ts")

    def test_servicenow_form_matches_its_credentials(self):
        self._assert_parity("servicenow", "dashboard/src/integrations/servicenow/config.ts")

    def test_zendesk_form_matches_its_credentials(self):
        self._assert_parity("zendesk", "dashboard/src/integrations/zendesk/config.ts")

    def test_asana_form_matches_its_credentials(self):
        self._assert_parity("asana", "dashboard/src/integrations/asana/config.ts")

    def test_linear_form_matches_its_credentials(self):
        self._assert_parity("linear", "dashboard/src/integrations/linear/config.ts")

    def test_clickup_form_matches_its_credentials(self):
        self._assert_parity("clickup", "dashboard/src/integrations/clickup/config.ts")

    def test_monday_com_form_matches_its_credentials(self):
        self._assert_parity("monday_com", "dashboard/src/integrations/monday_com/config.ts")

    def test_basecamp_form_matches_its_credentials(self):
        self._assert_parity("basecamp", "dashboard/src/integrations/basecamp/config.ts")

    def test_smartsheet_form_matches_its_credentials(self):
        self._assert_parity("smartsheet", "dashboard/src/integrations/smartsheet/config.ts")

    def test_teamwork_form_matches_its_credentials(self):
        self._assert_parity("teamwork", "dashboard/src/integrations/teamwork/config.ts")

    def test_freshservice_form_matches_its_credentials(self):
        self._assert_parity("freshservice", "dashboard/src/integrations/freshservice/config.ts")

    def test_salesforce_form_matches_its_credentials(self):
        self._assert_parity("salesforce", "dashboard/src/integrations/salesforce/config.ts")

    def test_hubspot_form_matches_its_credentials(self):
        self._assert_parity("hubspot", "dashboard/src/integrations/hubspot/config.ts")

    def test_pipedrive_form_matches_its_credentials(self):
        self._assert_parity("pipedrive", "dashboard/src/integrations/pipedrive/config.ts")

    def test_copper_form_matches_its_credentials(self):
        self._assert_parity("copper", "dashboard/src/integrations/copper/config.ts")

    def test_insightly_form_matches_its_credentials(self):
        self._assert_parity("insightly", "dashboard/src/integrations/insightly/config.ts")

    def test_close_form_matches_its_credentials(self):
        self._assert_parity("close", "dashboard/src/integrations/close/config.ts")

    def test_capsule_form_matches_its_credentials(self):
        self._assert_parity("capsule", "dashboard/src/integrations/capsule/config.ts")

    def test_gong_form_matches_its_credentials(self):
        self._assert_parity("gong", "dashboard/src/integrations/gong/config.ts")

    def test_gorgias_form_matches_its_credentials(self):
        self._assert_parity("gorgias", "dashboard/src/integrations/gorgias/config.ts")

    def test_intercom_form_matches_its_credentials(self):
        self._assert_parity("intercom", "dashboard/src/integrations/intercom/config.ts")

    def test_xero_form_matches_its_credentials(self):
        self._assert_parity("xero", "dashboard/src/integrations/xero/config.ts")

    def test_quickbooks_form_matches_its_credentials(self):
        self._assert_parity("quickbooks", "dashboard/src/integrations/quickbooks/config.ts")

    def test_brex_form_matches_its_credentials(self):
        self._assert_parity("brex", "dashboard/src/integrations/brex/config.ts")

    def test_ramp_form_matches_its_credentials(self):
        self._assert_parity("ramp", "dashboard/src/integrations/ramp/config.ts")

    def test_twilio_form_matches_its_credentials(self):
        self._assert_parity("twilio", "dashboard/src/integrations/twilio/config.ts")

    def test_apollo_form_matches_its_credentials(self):
        self._assert_parity("apollo", "dashboard/src/integrations/apollo/config.ts")

    def test_zoominfo_form_matches_its_credentials(self):
        self._assert_parity("zoominfo", "dashboard/src/integrations/zoominfo/config.ts")

    def test_envoy_form_matches_its_credentials(self):
        self._assert_parity("envoy", "dashboard/src/integrations/envoy/config.ts")

    def test_torii_form_matches_its_credentials(self):
        self._assert_parity("torii", "dashboard/src/integrations/torii/config.ts")

    def test_rockset_form_matches_its_credentials(self):
        self._assert_parity("rockset", "dashboard/src/integrations/rockset/config.ts")

    def test_clockwork_form_matches_its_credentials(self):
        self._assert_parity("clockwork", "dashboard/src/integrations/clockwork/config.ts")

    def test_knowbe4_form_matches_its_credentials(self):
        self._assert_parity("knowbe4", "dashboard/src/integrations/knowbe4/config.ts")

    def test_udemy_business_form_matches_its_credentials(self):
        self._assert_parity(
            "udemy_business", "dashboard/src/integrations/udemy_business/config.ts"
        )

    def test_wizer_form_matches_its_credentials(self):
        self._assert_parity("wizer", "dashboard/src/integrations/wizer/config.ts")

    def test_mimecast_form_matches_its_credentials(self):
        self._assert_parity("mimecast", "dashboard/src/integrations/mimecast/config.ts")

    def test_docebo_form_matches_its_credentials(self):
        self._assert_parity("docebo", "dashboard/src/integrations/docebo/config.ts")

    def test_cybeready_form_matches_its_credentials(self):
        self._assert_parity("cybeready", "dashboard/src/integrations/cybeready/config.ts")

    def test_breezy_hr_form_matches_its_credentials(self):
        self._assert_parity("breezy_hr", "dashboard/src/integrations/breezy_hr/config.ts")

    def test_cats_form_matches_its_credentials(self):
        self._assert_parity("cats", "dashboard/src/integrations/cats/config.ts")

    def test_jobvite_form_matches_its_credentials(self):
        self._assert_parity("jobvite", "dashboard/src/integrations/jobvite/config.ts")

    def test_smartrecruiters_form_matches_its_credentials(self):
        self._assert_parity(
            "smartrecruiters", "dashboard/src/integrations/smartrecruiters/config.ts"
        )

    def test_teamtailor_form_matches_its_credentials(self):
        self._assert_parity("teamtailor", "dashboard/src/integrations/teamtailor/config.ts")

    def test_jobadder_form_matches_its_credentials(self):
        self._assert_parity("jobadder", "dashboard/src/integrations/jobadder/config.ts")

    def test_lever_form_matches_its_credentials(self):
        self._assert_parity("lever", "dashboard/src/integrations/lever/config.ts")

    def test_comeet_form_matches_its_credentials(self):
        self._assert_parity("comeet", "dashboard/src/integrations/comeet/config.ts")

    def test_certn_form_matches_its_credentials(self):
        self._assert_parity("certn", "dashboard/src/integrations/certn/config.ts")

    def test_checkr_form_matches_its_credentials(self):
        self._assert_parity("checkr", "dashboard/src/integrations/checkr/config.ts")

    def test_oracle_cloud_form_matches_its_credentials(self):
        self._assert_parity("oracle_cloud", "dashboard/src/integrations/oracle_cloud/config.ts")

    def test_digitalocean_form_matches_its_credentials(self):
        self._assert_parity("digitalocean", "dashboard/src/integrations/digitalocean/config.ts")

    def test_vercel_form_matches_its_credentials(self):
        self._assert_parity("vercel", "dashboard/src/integrations/vercel/config.ts")

    def test_netlify_form_matches_its_credentials(self):
        self._assert_parity("netlify", "dashboard/src/integrations/netlify/config.ts")

    def test_scaleway_form_matches_its_credentials(self):
        self._assert_parity("scaleway", "dashboard/src/integrations/scaleway/config.ts")

    def test_supabase_form_matches_its_credentials(self):
        self._assert_parity("supabase", "dashboard/src/integrations/supabase/config.ts")

    def test_ovhcloud_form_matches_its_credentials(self):
        self._assert_parity("ovhcloud", "dashboard/src/integrations/ovhcloud/config.ts")

    def test_heroku_form_matches_its_credentials(self):
        self._assert_parity("heroku", "dashboard/src/integrations/heroku/config.ts")

    def test_akamai_form_matches_its_credentials(self):
        self._assert_parity("akamai", "dashboard/src/integrations/akamai/config.ts")

    def test_snowflake_form_matches_its_credentials(self):
        self._assert_parity("snowflake", "dashboard/src/integrations/snowflake/config.ts")

    def test_render_form_matches_its_credentials(self):
        self._assert_parity("render", "dashboard/src/integrations/render/config.ts")

    def test_mongodb_atlas_form_matches_its_credentials(self):
        self._assert_parity("mongodb_atlas", "dashboard/src/integrations/mongodb_atlas/config.ts")

    def test_mongodb_atlas_for_government_form_matches_its_credentials(self):
        self._assert_parity(
            "mongodb_atlas_for_government", "dashboard/src/integrations/mongodb_atlas_for_government/config.ts"
        )

    def test_ibm_cloud_form_matches_its_credentials(self):
        self._assert_parity("ibm_cloud", "dashboard/src/integrations/ibm_cloud/config.ts")

    def test_alibaba_cloud_form_matches_its_credentials(self):
        self._assert_parity("alibaba_cloud", "dashboard/src/integrations/alibaba_cloud/config.ts")

    def test_cloudflare_form_matches_its_credentials(self):
        self._assert_parity("cloudflare", "dashboard/src/integrations/cloudflare/config.ts")

    def test_kubernetes_form_matches_its_credentials(self):
        self._assert_parity("kubernetes", "dashboard/src/integrations/kubernetes/config.ts")

    def test_docker_hub_form_matches_its_credentials(self):
        self._assert_parity("docker_hub", "dashboard/src/integrations/docker_hub/config.ts")

    def test_github_actions_form_matches_its_credentials(self):
        self._assert_parity(
            "github_actions", "dashboard/src/integrations/github_actions/config.ts"
        )

    def test_jenkins_form_matches_its_credentials(self):
        self._assert_parity("jenkins", "dashboard/src/integrations/jenkins/config.ts")

    def test_circleci_form_matches_its_credentials(self):
        self._assert_parity("circleci", "dashboard/src/integrations/circleci/config.ts")

    def test_hashicorp_vault_form_matches_its_credentials(self):
        self._assert_parity(
            "hashicorp_vault", "dashboard/src/integrations/hashicorp_vault/config.ts"
        )

    def test_bitwarden_form_matches_its_credentials(self):
        self._assert_parity("bitwarden", "dashboard/src/integrations/bitwarden/config.ts")

    def test_fieldguide_form_matches_its_credentials(self):
        self._assert_parity("fieldguide", "dashboard/src/integrations/fieldguide/config.ts")

    def test_vouch_cyber_insurance_form_matches_its_credentials(self):
        self._assert_parity(
            "vouch_cyber_insurance", "dashboard/src/integrations/vouch_cyber_insurance/config.ts"
        )

    def test_a_scend_form_matches_its_credentials(self):
        self._assert_parity("a_scend", "dashboard/src/integrations/a_scend/config.ts")
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
            # Phase 4: Identity providers
            "auth0": "dashboard/src/integrations/auth0/config.ts",
            "onelogin": "dashboard/src/integrations/onelogin/config.ts",
            "pingone": "dashboard/src/integrations/pingone/config.ts",
            "ping_identity": "dashboard/src/integrations/ping_identity/config.ts",
            "jumpcloud": "dashboard/src/integrations/jumpcloud/config.ts",
            "duo": "dashboard/src/integrations/duo/config.ts",
            "1password": "dashboard/src/integrations/onepassword/config.ts",
            "1password_device_trust_kolide": "dashboard/src/integrations/onepassword_device_trust/config.ts",
            "keeper": "dashboard/src/integrations/keeper/config.ts",
            "cyberark": "dashboard/src/integrations/cyberark/config.ts",
            "sailpoint": "dashboard/src/integrations/sailpoint/config.ts",
            "one_identity": "dashboard/src/integrations/one_identity/config.ts",
            # Phase 5: Device / MDM
            "jamf_pro": "dashboard/src/integrations/jamf_pro/config.ts",
            "kandji_iru": "dashboard/src/integrations/kandji_iru/config.ts",
            "mosyle": "dashboard/src/integrations/mosyle/config.ts",
            "addigy": "dashboard/src/integrations/addigy/config.ts",
            "hexnode": "dashboard/src/integrations/hexnode/config.ts",
            "fleetdm": "dashboard/src/integrations/fleetdm/config.ts",
            "ninjaone": "dashboard/src/integrations/ninjaone/config.ts",
            "miradore": "dashboard/src/integrations/miradore/config.ts",
            "manageengine": "dashboard/src/integrations/manageengine/config.ts",
            "omnissa_workspace_one": "dashboard/src/integrations/omnissa_workspace_one/config.ts",
            "vmware_workspace_one": "dashboard/src/integrations/vmware_workspace_one/config.ts",
            "jumpcloud_mdm": "dashboard/src/integrations/jumpcloud_mdm/config.ts",
            # Phase 6: Security / SIEM
            "aikido": "dashboard/src/integrations/aikido/config.ts",
            "aqua_security": "dashboard/src/integrations/aqua_security/config.ts",
            "bitsight": "dashboard/src/integrations/bitsight/config.ts",
            "checkmarx": "dashboard/src/integrations/checkmarx/config.ts",
            "crowdstrike": "dashboard/src/integrations/crowdstrike/config.ts",
            "datadog": "dashboard/src/integrations/datadog/config.ts",
            "elastic_security": "dashboard/src/integrations/elastic_security/config.ts",
            "gitguardian": "dashboard/src/integrations/gitguardian/config.ts",
            "gitleaks": "dashboard/src/integrations/gitleaks/config.ts",
            "grafana": "dashboard/src/integrations/grafana/config.ts",
            "graylog": "dashboard/src/integrations/graylog/config.ts",
            "lacework": "dashboard/src/integrations/lacework/config.ts",
            "launchdarkly": "dashboard/src/integrations/launchdarkly/config.ts",
            "logrhythm": "dashboard/src/integrations/logrhythm/config.ts",
            "nessus": "dashboard/src/integrations/nessus/config.ts",
            "new_relic": "dashboard/src/integrations/new_relic/config.ts",
            "openvas": "dashboard/src/integrations/openvas/config.ts",
            "orca_security": "dashboard/src/integrations/orca_security/config.ts",
            "prisma_cloud": "dashboard/src/integrations/prisma_cloud/config.ts",
            "qualys": "dashboard/src/integrations/qualys/config.ts",
            "rapid7_insightvm": "dashboard/src/integrations/rapid7_insightvm/config.ts",
            "rollbar": "dashboard/src/integrations/rollbar/config.ts",
            "securityscorecard": "dashboard/src/integrations/securityscorecard/config.ts",
            "semgrep": "dashboard/src/integrations/semgrep/config.ts",
            "sentinelone": "dashboard/src/integrations/sentinelone/config.ts",
            "sentry": "dashboard/src/integrations/sentry/config.ts",
            "snyk": "dashboard/src/integrations/snyk/config.ts",
            "sonarqube": "dashboard/src/integrations/sonarqube/config.ts",
            "splunk": "dashboard/src/integrations/splunk/config.ts",
            "splunk_enterprise": "dashboard/src/integrations/splunk_enterprise/config.ts",
            "sumo_logic": "dashboard/src/integrations/sumo_logic/config.ts",
            "tailscale": "dashboard/src/integrations/tailscale/config.ts",
            "tenable": "dashboard/src/integrations/tenable/config.ts",
            "tenable_vulnerability_management_fedramp": "dashboard/src/integrations/tenable_vulnerability_management_fedramp/config.ts",
            "trivy": "dashboard/src/integrations/trivy/config.ts",
            "trufflehog": "dashboard/src/integrations/trufflehog/config.ts",
            "veracode": "dashboard/src/integrations/veracode/config.ts",
            "wiz": "dashboard/src/integrations/wiz/config.ts",
            # Phase 7: HRIS / people
            "workday": "dashboard/src/integrations/workday/config.ts",
            "sap_successfactors": "dashboard/src/integrations/sap_successfactors/config.ts",
            "adp": "dashboard/src/integrations/adp/config.ts",
            "adp_workforce_now": "dashboard/src/integrations/adp_workforce_now/config.ts",
            "ukg": "dashboard/src/integrations/ukg/config.ts",
            "paychex": "dashboard/src/integrations/paychex/config.ts",
            "bamboohr": "dashboard/src/integrations/bamboohr/config.ts",
            "hibob": "dashboard/src/integrations/hibob/config.ts",
            "personio": "dashboard/src/integrations/personio/config.ts",
            "rippling": "dashboard/src/integrations/rippling/config.ts",
            "gusto": "dashboard/src/integrations/gusto/config.ts",
            "deel": "dashboard/src/integrations/deel/config.ts",
            "trinet": "dashboard/src/integrations/trinet/config.ts",
            "justworks": "dashboard/src/integrations/justworks/config.ts",
            "isolved": "dashboard/src/integrations/isolved/config.ts",
            "payfit": "dashboard/src/integrations/payfit/config.ts",
            "square_payroll": "dashboard/src/integrations/square_payroll/config.ts",
            "kenjo": "dashboard/src/integrations/kenjo/config.ts",
            "netsuite": "dashboard/src/integrations/netsuite/config.ts",
            "factorial": "dashboard/src/integrations/factorial/config.ts",
            "charthop": "dashboard/src/integrations/charthop/config.ts",
            "humaans": "dashboard/src/integrations/humaans/config.ts",
            "proliant": "dashboard/src/integrations/proliant/config.ts",
            "alexishr": "dashboard/src/integrations/alexishr/config.ts",
            "employment_hero": "dashboard/src/integrations/employment_hero/config.ts",
            "7shifts": "dashboard/src/integrations/seven_shifts/config.ts",
            # Phase 8: Collaboration, ticketing & business SaaS
            "slack": "dashboard/src/integrations/slack/config.ts",
            "zoom": "dashboard/src/integrations/zoom/config.ts",
            "webex": "dashboard/src/integrations/webex/config.ts",
            "box": "dashboard/src/integrations/box/config.ts",
            "dropbox": "dashboard/src/integrations/dropbox/config.ts",
            "notion": "dashboard/src/integrations/notion/config.ts",
            "docusign": "dashboard/src/integrations/docusign/config.ts",
            "calendly": "dashboard/src/integrations/calendly/config.ts",
            "miro": "dashboard/src/integrations/miro/config.ts",
            "servicenow": "dashboard/src/integrations/servicenow/config.ts",
            "zendesk": "dashboard/src/integrations/zendesk/config.ts",
            "asana": "dashboard/src/integrations/asana/config.ts",
            "linear": "dashboard/src/integrations/linear/config.ts",
            "clickup": "dashboard/src/integrations/clickup/config.ts",
            "monday_com": "dashboard/src/integrations/monday_com/config.ts",
            "basecamp": "dashboard/src/integrations/basecamp/config.ts",
            "smartsheet": "dashboard/src/integrations/smartsheet/config.ts",
            "teamwork": "dashboard/src/integrations/teamwork/config.ts",
            "freshservice": "dashboard/src/integrations/freshservice/config.ts",
            "salesforce": "dashboard/src/integrations/salesforce/config.ts",
            "hubspot": "dashboard/src/integrations/hubspot/config.ts",
            "pipedrive": "dashboard/src/integrations/pipedrive/config.ts",
            "copper": "dashboard/src/integrations/copper/config.ts",
            "insightly": "dashboard/src/integrations/insightly/config.ts",
            "close": "dashboard/src/integrations/close/config.ts",
            "capsule": "dashboard/src/integrations/capsule/config.ts",
            "gong": "dashboard/src/integrations/gong/config.ts",
            "gorgias": "dashboard/src/integrations/gorgias/config.ts",
            "intercom": "dashboard/src/integrations/intercom/config.ts",
            "xero": "dashboard/src/integrations/xero/config.ts",
            "quickbooks": "dashboard/src/integrations/quickbooks/config.ts",
            "brex": "dashboard/src/integrations/brex/config.ts",
            "ramp": "dashboard/src/integrations/ramp/config.ts",
            "twilio": "dashboard/src/integrations/twilio/config.ts",
            "apollo": "dashboard/src/integrations/apollo/config.ts",
            "zoominfo": "dashboard/src/integrations/zoominfo/config.ts",
            "envoy": "dashboard/src/integrations/envoy/config.ts",
            "torii": "dashboard/src/integrations/torii/config.ts",
            "rockset": "dashboard/src/integrations/rockset/config.ts",
            "clockwork": "dashboard/src/integrations/clockwork/config.ts",
            "knowbe4": "dashboard/src/integrations/knowbe4/config.ts",
            "udemy_business": "dashboard/src/integrations/udemy_business/config.ts",
            "wizer": "dashboard/src/integrations/wizer/config.ts",
            "mimecast": "dashboard/src/integrations/mimecast/config.ts",
            "docebo": "dashboard/src/integrations/docebo/config.ts",
            "cybeready": "dashboard/src/integrations/cybeready/config.ts",
            "breezy_hr": "dashboard/src/integrations/breezy_hr/config.ts",
            "cats": "dashboard/src/integrations/cats/config.ts",
            "jobvite": "dashboard/src/integrations/jobvite/config.ts",
            "smartrecruiters": "dashboard/src/integrations/smartrecruiters/config.ts",
            "teamtailor": "dashboard/src/integrations/teamtailor/config.ts",
            "jobadder": "dashboard/src/integrations/jobadder/config.ts",
            "lever": "dashboard/src/integrations/lever/config.ts",
            "comeet": "dashboard/src/integrations/comeet/config.ts",
            "certn": "dashboard/src/integrations/certn/config.ts",
            "checkr": "dashboard/src/integrations/checkr/config.ts",
            "oracle_cloud": "dashboard/src/integrations/oracle_cloud/config.ts",
            "digitalocean": "dashboard/src/integrations/digitalocean/config.ts",
            "vercel": "dashboard/src/integrations/vercel/config.ts",
            "netlify": "dashboard/src/integrations/netlify/config.ts",
            "scaleway": "dashboard/src/integrations/scaleway/config.ts",
            "supabase": "dashboard/src/integrations/supabase/config.ts",
            "ovhcloud": "dashboard/src/integrations/ovhcloud/config.ts",
            "heroku": "dashboard/src/integrations/heroku/config.ts",
            "akamai": "dashboard/src/integrations/akamai/config.ts",
            "snowflake": "dashboard/src/integrations/snowflake/config.ts",
            "render": "dashboard/src/integrations/render/config.ts",
            "mongodb_atlas": "dashboard/src/integrations/mongodb_atlas/config.ts",
            "mongodb_atlas_for_government": "dashboard/src/integrations/mongodb_atlas_for_government/config.ts",
            "ibm_cloud": "dashboard/src/integrations/ibm_cloud/config.ts",
            "alibaba_cloud": "dashboard/src/integrations/alibaba_cloud/config.ts",
            "cloudflare": "dashboard/src/integrations/cloudflare/config.ts",
            "kubernetes": "dashboard/src/integrations/kubernetes/config.ts",
            "docker_hub": "dashboard/src/integrations/docker_hub/config.ts",
            "github_actions": "dashboard/src/integrations/github_actions/config.ts",
            "jenkins": "dashboard/src/integrations/jenkins/config.ts",
            "circleci": "dashboard/src/integrations/circleci/config.ts",
            "hashicorp_vault": "dashboard/src/integrations/hashicorp_vault/config.ts",
            "bitwarden": "dashboard/src/integrations/bitwarden/config.ts",
            "fieldguide": "dashboard/src/integrations/fieldguide/config.ts",
            "vouch_cyber_insurance": "dashboard/src/integrations/vouch_cyber_insurance/config.ts",
            "a_scend": "dashboard/src/integrations/a_scend/config.ts",
        }
        assert set(paths) == set(available_slugs())
        for slug, path in paths.items():
            assert pathlib.Path(path).exists(), f"{slug} has no connect form at {path}"
