# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Adapter registry: catalog slug -> (AdapterClass, CredentialsClass).

The catalog (integration_catalog) lists the published evidence sources; this
registry lists the ones with a shipped adapter. ``adapter_status`` in the
catalog must agree with membership here — the worker refuses slugs it cannot
construct, the connect endpoint refuses them too, and the seed migrations only
mark connectable what exists in this file.

Adding an adapter is four steps, all of them required:

1. implement it under ``sentinel/integrations/<slug>/``;
2. register it here;
3. add its connect form to ``dashboard/src/integrations/<slug>/config.ts``
   and the registry beside it;
4. flip that catalogue row's ``adapter_status`` in a migration.

Skipping step 4 leaves a working adapter no operator can reach; skipping
step 2 leaves a Connect button that 400s. ``GET /v1/integrations/available``
returns this set so the UI can cross-check itself against the server.
"""

from __future__ import annotations

from sentinel.integrations.aws.adapter import AwsAdapter, AwsCredentials
from sentinel.integrations.aws_bedrock.adapter import AwsBedrockAdapter, AwsBedrockCredentials
from sentinel.integrations.aws_secrets_manager.adapter import (
    AwsSecretsManagerAdapter,
    AwsSecretsManagerCredentials,
)
# Phase 3: AI platforms
from sentinel.integrations.openai_platform.adapter import OpenAiAdapter, OpenAiCredentials
from sentinel.integrations.azure_openai.adapter import AzureOpenAiAdapter, AzureOpenAiCredentials
from sentinel.integrations.anthropic_api.adapter import AnthropicApiAdapter, AnthropicApiCredentials
from sentinel.integrations.anthropic_console.adapter import AnthropicConsoleAdapter, AnthropicConsoleCredentials
from sentinel.integrations.hugging_face.adapter import HuggingFaceAdapter, HuggingFaceCredentials
from sentinel.integrations.github_copilot.adapter import GithubCopilotAdapter, GithubCopilotCredentials
from sentinel.integrations.cursor_codeium.adapter import CursorCodeiumAdapter, CursorCodeiumCredentials
from sentinel.integrations.langsmith.adapter import LangSmithAdapter, LangSmithCredentials
from sentinel.integrations.arize.adapter import ArizeAdapter, ArizeCredentials
from sentinel.integrations.wandb.adapter import WandbAdapter, WandbCredentials
from sentinel.integrations.pinecone.adapter import PineconeAdapter, PineconeCredentials
from sentinel.integrations.weaviate.adapter import WeaviateAdapter, WeaviateCredentials
from sentinel.integrations.lakera.adapter import LakeraAdapter, LakeraCredentials
from sentinel.integrations.hiddenlayer.adapter import HiddenLayerAdapter, HiddenLayerCredentials
from sentinel.integrations.azure.adapter import AzureAdapter, AzureCredentials
from sentinel.integrations.bitbucket.adapter import BitbucketAdapter, BitbucketCredentials
from sentinel.integrations.chronicle.adapter import ChronicleAdapter, ChronicleCredentials
from sentinel.integrations.confluence.adapter import ConfluenceAdapter, ConfluenceCredentials
from sentinel.integrations.confluence_ac.adapter import ConfluenceAcAdapter, ConfluenceAcCredentials
from sentinel.integrations.defender.adapter import (
    DefenderAdapter,
    DefenderCredentials,
    DefenderGccHighCredentials,
)
from sentinel.integrations.devops.adapter import AzureDevOpsAdapter, AzureDevOpsCredentials
from sentinel.integrations.entra.adapter import (
    EntraAdapter,
    EntraCredentials,
    EntraGccHighCredentials,
)
from sentinel.integrations.gcp.adapter import GcpAdapter, GcpCredentials
from sentinel.integrations.github.adapter import GithubAdapter, GithubCredentials
from sentinel.integrations.gitlab_cicd.adapter import GitLabCiCdAdapter, GitLabCiCdCredentials
from sentinel.integrations.gitlab_cloud.adapter import GitLabCloudAdapter, GitLabCloudCredentials
from sentinel.integrations.gitlab_sm.adapter import GitLabSelfManagedAdapter, GitLabSelfManagedCredentials
from sentinel.integrations.google_cloud_identity.adapter import (
    GoogleCloudIdentityAdapter,
    GoogleCloudIdentityCredentials,
)
from sentinel.integrations.google_drive.adapter import GoogleDriveAdapter, GoogleDriveCredentials
from sentinel.integrations.google_workspace.adapter import (
    GoogleWorkspaceAdapter,
    GoogleWorkspaceCredentials,
)
from sentinel.integrations.intune.adapter import (
    IntuneAdapter,
    IntuneCredentials,
    IntuneGccHighCredentials,
)
from sentinel.integrations.jira.adapter import JiraAdapter, JiraCredentials
from sentinel.integrations.jira_sm.adapter import JiraSmAdapter, JiraSmCredentials
from sentinel.integrations.keyvault.adapter import KeyVaultAdapter, KeyVaultCredentials
from sentinel.integrations.okta.adapter import OktaAdapter, OktaCredentials
from sentinel.integrations.onedrive.adapter import OneDriveAdapter, OneDriveCredentials
from sentinel.integrations.sentinel_siem.adapter import SentinelSiemAdapter, SentinelSiemCredentials
from sentinel.integrations.sharepoint.adapter import SharePointAdapter, SharePointCredentials
from sentinel.integrations.teams.adapter import TeamsAdapter, TeamsCredentials
from sentinel.integrations.vertex_ai.adapter import VertexAiAdapter, VertexAiCredentials
# Phase 4: Identity providers
from sentinel.integrations.auth0.adapter import Auth0Adapter, Auth0Credentials
from sentinel.integrations.onelogin.adapter import OneLoginAdapter, OneLoginCredentials
from sentinel.integrations.pingone.adapter import PingOneAdapter, PingOneCredentials
from sentinel.integrations.ping_identity.adapter import PingIdentityAdapter, PingIdentityCredentials
from sentinel.integrations.jumpcloud.adapter import JumpCloudAdapter, JumpCloudCredentials
from sentinel.integrations.duo.adapter import DuoAdapter, DuoCredentials
from sentinel.integrations.onepassword.adapter import OnePasswordAdapter, OnePasswordCredentials
from sentinel.integrations.onepassword_device_trust.adapter import (
    OnePasswordDeviceTrustAdapter,
    OnePasswordDeviceTrustCredentials,
)
from sentinel.integrations.keeper.adapter import KeeperAdapter, KeeperCredentials
from sentinel.integrations.cyberark.adapter import CyberArkAdapter, CyberArkCredentials
from sentinel.integrations.sailpoint.adapter import SailPointAdapter, SailPointCredentials
from sentinel.integrations.one_identity.adapter import OneIdentityAdapter, OneIdentityCredentials

_REGISTRY: dict[str, tuple[type, type]] = {
    "github": (GithubAdapter, GithubCredentials),
    "aws": (AwsAdapter, AwsCredentials),
    # Catalogue slug for Azure is `microsoft_azure`; `azure` is not a row.
    "microsoft_azure": (AzureAdapter, AzureCredentials),
    "okta": (OktaAdapter, OktaCredentials),
    # One adapter, two catalogue slugs: the sovereign cloud is selected by the
    # credentials, so GCC High cannot silently query commercial endpoints.
    "microsoft_entra_id": (EntraAdapter, EntraCredentials),
    "microsoft_entra_id_gcc_high": (EntraAdapter, EntraGccHighCredentials),
    "microsoft_intune": (IntuneAdapter, IntuneCredentials),
    "microsoft_intune_gcc_high": (IntuneAdapter, IntuneGccHighCredentials),
    # Phase 1: remaining Microsoft Graph family
    "microsoft_sharepoint": (SharePointAdapter, SharePointCredentials),
    "microsoft_onedrive": (OneDriveAdapter, OneDriveCredentials),
    "microsoft_teams": (TeamsAdapter, TeamsCredentials),
    "microsoft_defender_for_endpoint": (DefenderAdapter, DefenderCredentials),
    "microsoft_defender_for_endpoint_gcc_high": (DefenderAdapter, DefenderGccHighCredentials),
    "microsoft_sentinel": (SentinelSiemAdapter, SentinelSiemCredentials),
    "azure_key_vault": (KeyVaultAdapter, KeyVaultCredentials),
    "azure_devops": (AzureDevOpsAdapter, AzureDevOpsCredentials),
    # Phase 2: Google family
    "google_workspace": (GoogleWorkspaceAdapter, GoogleWorkspaceCredentials),
    "google_cloud_identity": (GoogleCloudIdentityAdapter, GoogleCloudIdentityCredentials),
    "google_drive": (GoogleDriveAdapter, GoogleDriveCredentials),
    "google_cloud_platform": (GcpAdapter, GcpCredentials),
    "google_cloud_vertex_ai": (VertexAiAdapter, VertexAiCredentials),
    "google_chronicle": (ChronicleAdapter, ChronicleCredentials),
    # Phase 2: Atlassian family
    "jira": (JiraAdapter, JiraCredentials),
    "jira_service_management": (JiraSmAdapter, JiraSmCredentials),
    "confluence": (ConfluenceAdapter, ConfluenceCredentials),
    "confluence_access_control": (ConfluenceAcAdapter, ConfluenceAcCredentials),
    "bitbucket_pipelines": (BitbucketAdapter, BitbucketCredentials),
    # Phase 2: GitLab family
    "gitlab_cloud": (GitLabCloudAdapter, GitLabCloudCredentials),
    "gitlab_self_managed": (GitLabSelfManagedAdapter, GitLabSelfManagedCredentials),
    "gitlab_ci_cd": (GitLabCiCdAdapter, GitLabCiCdCredentials),
    # Phase 2: AWS AI / secrets
    "aws_bedrock": (AwsBedrockAdapter, AwsBedrockCredentials),
    "aws_secrets_manager": (AwsSecretsManagerAdapter, AwsSecretsManagerCredentials),
    # Phase 3: AI platforms
    "openai": (OpenAiAdapter, OpenAiCredentials),
    "openai_azure_openai": (AzureOpenAiAdapter, AzureOpenAiCredentials),
    "anthropic_claude_api": (AnthropicApiAdapter, AnthropicApiCredentials),
    "anthropic_claude_console": (AnthropicConsoleAdapter, AnthropicConsoleCredentials),
    "hugging_face_enterprise": (HuggingFaceAdapter, HuggingFaceCredentials),
    "github_copilot": (GithubCopilotAdapter, GithubCopilotCredentials),
    "cursor_codeium": (CursorCodeiumAdapter, CursorCodeiumCredentials),
    "langsmith_langfuse": (LangSmithAdapter, LangSmithCredentials),
    "arize_ai_phoenix": (ArizeAdapter, ArizeCredentials),
    "weights_biases_w_b": (WandbAdapter, WandbCredentials),
    "pinecone": (PineconeAdapter, PineconeCredentials),
    "weaviate": (WeaviateAdapter, WeaviateCredentials),
    "lakera_protect_ai": (LakeraAdapter, LakeraCredentials),
    "hiddenlayer": (HiddenLayerAdapter, HiddenLayerCredentials),
    # Phase 4: Identity providers
    "auth0": (Auth0Adapter, Auth0Credentials),
    "onelogin": (OneLoginAdapter, OneLoginCredentials),
    "pingone": (PingOneAdapter, PingOneCredentials),
    "ping_identity": (PingIdentityAdapter, PingIdentityCredentials),
    "jumpcloud": (JumpCloudAdapter, JumpCloudCredentials),
    "duo": (DuoAdapter, DuoCredentials),
    "1password": (OnePasswordAdapter, OnePasswordCredentials),
    "1password_device_trust_kolide": (OnePasswordDeviceTrustAdapter, OnePasswordDeviceTrustCredentials),
    "keeper": (KeeperAdapter, KeeperCredentials),
    "cyberark": (CyberArkAdapter, CyberArkCredentials),
    "sailpoint": (SailPointAdapter, SailPointCredentials),
    "one_identity": (OneIdentityAdapter, OneIdentityCredentials),
}


def available_slugs() -> frozenset[str]:
    return frozenset(_REGISTRY)


def get_adapter_class(slug: str) -> tuple[type, type]:
    try:
        return _REGISTRY[slug]
    except KeyError:
        raise LookupError(
            f"no adapter shipped for integration {slug!r} — catalogued only; "
            f"available: {sorted(_REGISTRY)}"
        ) from None
