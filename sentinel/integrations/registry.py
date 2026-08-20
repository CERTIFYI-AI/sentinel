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
# Phase 5: Device / MDM
from sentinel.integrations.jamf_pro.adapter import JamfProAdapter, JamfProCredentials
from sentinel.integrations.kandji_iru.adapter import KandjiIruAdapter, KandjiIruCredentials
from sentinel.integrations.mosyle.adapter import MosyleAdapter, MosyleCredentials
from sentinel.integrations.addigy.adapter import AddigyAdapter, AddigyCredentials
from sentinel.integrations.hexnode.adapter import HexnodeAdapter, HexnodeCredentials
from sentinel.integrations.fleetdm.adapter import FleetDMAdapter, FleetDMCredentials
from sentinel.integrations.ninjaone.adapter import NinjaOneAdapter, NinjaOneCredentials
from sentinel.integrations.miradore.adapter import MiradoreAdapter, MiradoreCredentials
from sentinel.integrations.manageengine.adapter import ManageEngineAdapter, ManageEngineCredentials
from sentinel.integrations.omnissa_workspace_one.adapter import (
    OmnissaWorkspaceOneAdapter,
    OmnissaWorkspaceOneCredentials,
)
from sentinel.integrations.vmware_workspace_one.adapter import (
    VMwareWorkspaceOneAdapter,
    VMwareWorkspaceOneCredentials,
)
from sentinel.integrations.jumpcloud_mdm.adapter import JumpCloudMDMAdapter, JumpCloudMDMCredentials
# Phase 6: Security / SIEM
from sentinel.integrations.aikido.adapter import AikidoAdapter, AikidoCredentials
from sentinel.integrations.aqua_security.adapter import AquaSecurityAdapter, AquaSecurityCredentials
from sentinel.integrations.bitsight.adapter import BitsightAdapter, BitsightCredentials
from sentinel.integrations.checkmarx.adapter import CheckmarxAdapter, CheckmarxCredentials
from sentinel.integrations.crowdstrike.adapter import CrowdStrikeAdapter, CrowdStrikeCredentials
from sentinel.integrations.datadog.adapter import DatadogAdapter, DatadogCredentials
from sentinel.integrations.elastic_security.adapter import ElasticSecurityAdapter, ElasticSecurityCredentials
from sentinel.integrations.gitguardian.adapter import GitGuardianAdapter, GitGuardianCredentials
from sentinel.integrations.gitleaks.adapter import GitleaksAdapter, GitleaksCredentials
from sentinel.integrations.grafana.adapter import GrafanaAdapter, GrafanaCredentials
from sentinel.integrations.graylog.adapter import GraylogAdapter, GraylogCredentials
from sentinel.integrations.lacework.adapter import LaceworkAdapter, LaceworkCredentials
from sentinel.integrations.launchdarkly.adapter import LaunchDarklyAdapter, LaunchDarklyCredentials
from sentinel.integrations.logrhythm.adapter import LogRhythmAdapter, LogRhythmCredentials
from sentinel.integrations.nessus.adapter import NessusAdapter, NessusCredentials
from sentinel.integrations.new_relic.adapter import NewRelicAdapter, NewRelicCredentials
from sentinel.integrations.openvas.adapter import OpenVasAdapter, OpenVasCredentials
from sentinel.integrations.orca_security.adapter import OrcaSecurityAdapter, OrcaSecurityCredentials
from sentinel.integrations.prisma_cloud.adapter import PrismaCloudAdapter, PrismaCloudCredentials
from sentinel.integrations.qualys.adapter import QualysAdapter, QualysCredentials
from sentinel.integrations.rapid7_insightvm.adapter import Rapid7InsightVmAdapter, Rapid7InsightVmCredentials
from sentinel.integrations.rollbar.adapter import RollbarAdapter, RollbarCredentials
from sentinel.integrations.securityscorecard.adapter import SecurityScorecardAdapter, SecurityScorecardCredentials
from sentinel.integrations.semgrep.adapter import SemgrepAdapter, SemgrepCredentials
from sentinel.integrations.sentinelone.adapter import SentinelOneAdapter, SentinelOneCredentials
from sentinel.integrations.sentry.adapter import SentryAdapter, SentryCredentials
from sentinel.integrations.snyk.adapter import SnykAdapter, SnykCredentials
from sentinel.integrations.sonarqube.adapter import SonarQubeAdapter, SonarQubeCredentials
from sentinel.integrations.splunk.adapter import SplunkAdapter, SplunkCredentials
from sentinel.integrations.splunk_enterprise.adapter import SplunkEnterpriseAdapter, SplunkEnterpriseCredentials
from sentinel.integrations.sumo_logic.adapter import SumoLogicAdapter, SumoLogicCredentials
from sentinel.integrations.tailscale.adapter import TailscaleAdapter, TailscaleCredentials
from sentinel.integrations.tenable.adapter import TenableAdapter, TenableCredentials
from sentinel.integrations.tenable_vulnerability_management_fedramp.adapter import (
    TenableFedRampAdapter,
    TenableFedRampCredentials,
)
from sentinel.integrations.trivy.adapter import TrivyAdapter, TrivyCredentials
from sentinel.integrations.trufflehog.adapter import TrufflehogAdapter, TrufflehogCredentials
from sentinel.integrations.veracode.adapter import VeracodeAdapter, VeracodeCredentials
from sentinel.integrations.wiz.adapter import WizAdapter, WizCredentials

# Phase 7: HRIS / people
from sentinel.integrations.adp.adapter import AdpAdapter, AdpCredentials
from sentinel.integrations.adp_workforce_now.adapter import (
    AdpWorkforceNowAdapter,
    AdpWorkforceNowCredentials,
)
from sentinel.integrations.alexishr.adapter import AlexisHRAdapter, AlexisHRCredentials
from sentinel.integrations.bamboohr.adapter import BamboohrAdapter, BamboohrCredentials
from sentinel.integrations.charthop.adapter import CharthopAdapter, CharthopCredentials
from sentinel.integrations.deel.adapter import DeelAdapter, DeelCredentials
from sentinel.integrations.employment_hero.adapter import (
    EmploymentHeroAdapter,
    EmploymentHeroCredentials,
)
from sentinel.integrations.factorial.adapter import FactorialAdapter, FactorialCredentials
from sentinel.integrations.gusto.adapter import GustoAdapter, GustoCredentials
from sentinel.integrations.hibob.adapter import HibobAdapter, HibobCredentials
from sentinel.integrations.humaans.adapter import HumaansAdapter, HumaansCredentials
from sentinel.integrations.isolved.adapter import IsolvedAdapter, IsolvedCredentials
from sentinel.integrations.justworks.adapter import JustworksAdapter, JustworksCredentials
from sentinel.integrations.kenjo.adapter import KenjoAdapter, KenjoCredentials
from sentinel.integrations.netsuite.adapter import NetsuiteAdapter, NetsuiteCredentials
from sentinel.integrations.paychex.adapter import PaychexAdapter, PaychexCredentials
from sentinel.integrations.payfit.adapter import PayfitAdapter, PayfitCredentials
from sentinel.integrations.personio.adapter import PersonioAdapter, PersonioCredentials
from sentinel.integrations.proliant.adapter import ProliantAdapter, ProliantCredentials
from sentinel.integrations.rippling.adapter import RipplingAdapter, RipplingCredentials
from sentinel.integrations.sap_successfactors.adapter import (
    SapSuccessfactorsAdapter,
    SapSuccessfactorsCredentials,
)
from sentinel.integrations.seven_shifts.adapter import SevenShiftsAdapter, SevenShiftsCredentials
from sentinel.integrations.square_payroll.adapter import (
    SquarePayrollAdapter,
    SquarePayrollCredentials,
)
from sentinel.integrations.trinet.adapter import TrinetAdapter, TrinetCredentials
from sentinel.integrations.ukg.adapter import UkgAdapter, UkgCredentials
from sentinel.integrations.workday.adapter import WorkdayAdapter, WorkdayCredentials

# Phase 8: Collaboration, ticketing & business SaaS
from sentinel.integrations.slack.adapter import SlackAdapter, SlackCredentials
from sentinel.integrations.zoom.adapter import ZoomAdapter, ZoomCredentials
from sentinel.integrations.webex.adapter import WebexAdapter, WebexCredentials
from sentinel.integrations.box.adapter import BoxAdapter, BoxCredentials
from sentinel.integrations.dropbox.adapter import DropboxAdapter, DropboxCredentials
from sentinel.integrations.notion.adapter import NotionAdapter, NotionCredentials
from sentinel.integrations.docusign.adapter import DocusignAdapter, DocusignCredentials
from sentinel.integrations.calendly.adapter import CalendlyAdapter, CalendlyCredentials
from sentinel.integrations.miro.adapter import MiroAdapter, MiroCredentials
from sentinel.integrations.servicenow.adapter import ServicenowAdapter, ServicenowCredentials
from sentinel.integrations.zendesk.adapter import ZendeskAdapter, ZendeskCredentials
from sentinel.integrations.asana.adapter import AsanaAdapter, AsanaCredentials
from sentinel.integrations.linear.adapter import LinearAdapter, LinearCredentials
from sentinel.integrations.clickup.adapter import ClickupAdapter, ClickupCredentials
from sentinel.integrations.monday_com.adapter import MondayComAdapter, MondayComCredentials
from sentinel.integrations.basecamp.adapter import BasecampAdapter, BasecampCredentials
from sentinel.integrations.smartsheet.adapter import SmartsheetAdapter, SmartsheetCredentials
from sentinel.integrations.teamwork.adapter import TeamworkAdapter, TeamworkCredentials
from sentinel.integrations.freshservice.adapter import FreshserviceAdapter, FreshserviceCredentials
from sentinel.integrations.salesforce.adapter import SalesforceAdapter, SalesforceCredentials
from sentinel.integrations.hubspot.adapter import HubspotAdapter, HubspotCredentials
from sentinel.integrations.pipedrive.adapter import PipedriveAdapter, PipedriveCredentials
from sentinel.integrations.copper.adapter import CopperAdapter, CopperCredentials
from sentinel.integrations.insightly.adapter import InsightlyAdapter, InsightlyCredentials
from sentinel.integrations.close.adapter import CloseAdapter, CloseCredentials
from sentinel.integrations.capsule.adapter import CapsuleAdapter, CapsuleCredentials
from sentinel.integrations.gong.adapter import GongAdapter, GongCredentials
from sentinel.integrations.gorgias.adapter import GorgiasAdapter, GorgiasCredentials
from sentinel.integrations.intercom.adapter import IntercomAdapter, IntercomCredentials
from sentinel.integrations.xero.adapter import XeroAdapter, XeroCredentials
from sentinel.integrations.quickbooks.adapter import QuickbooksAdapter, QuickbooksCredentials
from sentinel.integrations.brex.adapter import BrexAdapter, BrexCredentials
from sentinel.integrations.ramp.adapter import RampAdapter, RampCredentials
from sentinel.integrations.twilio.adapter import TwilioAdapter, TwilioCredentials
from sentinel.integrations.apollo.adapter import ApolloAdapter, ApolloCredentials
from sentinel.integrations.zoominfo.adapter import ZoominfoAdapter, ZoominfoCredentials
from sentinel.integrations.envoy.adapter import EnvoyAdapter, EnvoyCredentials
from sentinel.integrations.torii.adapter import ToriiAdapter, ToriiCredentials
from sentinel.integrations.rockset.adapter import RocksetAdapter, RocksetCredentials
from sentinel.integrations.clockwork.adapter import ClockworkAdapter, ClockworkCredentials
from sentinel.integrations.knowbe4.adapter import Knowbe4Adapter, Knowbe4Credentials
from sentinel.integrations.udemy_business.adapter import UdemyBusinessAdapter, UdemyBusinessCredentials
from sentinel.integrations.wizer.adapter import WizerAdapter, WizerCredentials
from sentinel.integrations.mimecast.adapter import MimecastAdapter, MimecastCredentials
from sentinel.integrations.docebo.adapter import DoceboAdapter, DoceboCredentials
from sentinel.integrations.cybeready.adapter import CybereadyAdapter, CybereadyCredentials
from sentinel.integrations.breezy_hr.adapter import BreezyHrAdapter, BreezyHrCredentials
from sentinel.integrations.cats.adapter import CatsAdapter, CatsCredentials
from sentinel.integrations.jobvite.adapter import JobviteAdapter, JobviteCredentials
from sentinel.integrations.smartrecruiters.adapter import SmartrecruitersAdapter, SmartrecruitersCredentials
from sentinel.integrations.teamtailor.adapter import TeamtailorAdapter, TeamtailorCredentials
from sentinel.integrations.jobadder.adapter import JobadderAdapter, JobadderCredentials
from sentinel.integrations.lever.adapter import LeverAdapter, LeverCredentials
from sentinel.integrations.comeet.adapter import ComeetAdapter, ComeetCredentials
from sentinel.integrations.certn.adapter import CertnAdapter, CertnCredentials
from sentinel.integrations.checkr.adapter import CheckrAdapter, CheckrCredentials
from sentinel.integrations.oracle_cloud.adapter import OracleCloudAdapter, OracleCloudCredentials
from sentinel.integrations.digitalocean.adapter import DigitaloceanAdapter, DigitaloceanCredentials
from sentinel.integrations.vercel.adapter import VercelAdapter, VercelCredentials
from sentinel.integrations.netlify.adapter import NetlifyAdapter, NetlifyCredentials
from sentinel.integrations.scaleway.adapter import ScalewayAdapter, ScalewayCredentials
from sentinel.integrations.supabase.adapter import SupabaseAdapter, SupabaseCredentials
from sentinel.integrations.ovhcloud.adapter import OvhcloudAdapter, OvhcloudCredentials
from sentinel.integrations.heroku.adapter import HerokuAdapter, HerokuCredentials
from sentinel.integrations.akamai.adapter import AkamaiAdapter, AkamaiCredentials
from sentinel.integrations.snowflake.adapter import SnowflakeAdapter, SnowflakeCredentials
from sentinel.integrations.render.adapter import RenderAdapter, RenderCredentials
from sentinel.integrations.mongodb_atlas.adapter import MongoDbAtlasAdapter, MongoDbAtlasCredentials
from sentinel.integrations.mongodb_atlas_for_government.adapter import MongoDbAtlasForGovernmentAdapter, MongoDbAtlasForGovernmentCredentials
from sentinel.integrations.ibm_cloud.adapter import IbmCloudAdapter, IbmCloudCredentials
from sentinel.integrations.alibaba_cloud.adapter import AlibabaCloudAdapter, AlibabaCloudCredentials
from sentinel.integrations.cloudflare.adapter import CloudflareAdapter, CloudflareCredentials
from sentinel.integrations.kubernetes.adapter import KubernetesAdapter, KubernetesCredentials
from sentinel.integrations.docker_hub.adapter import DockerHubAdapter, DockerHubCredentials
from sentinel.integrations.github_actions.adapter import GithubActionsAdapter, GithubActionsCredentials
from sentinel.integrations.jenkins.adapter import JenkinsAdapter, JenkinsCredentials
from sentinel.integrations.circleci.adapter import CircleciAdapter, CircleciCredentials
from sentinel.integrations.hashicorp_vault.adapter import HashicorpVaultAdapter, HashicorpVaultCredentials
from sentinel.integrations.bitwarden.adapter import BitwardenAdapter, BitwardenCredentials
from sentinel.integrations.fieldguide.adapter import FieldguideAdapter, FieldguideCredentials
from sentinel.integrations.vouch_cyber_insurance.adapter import VouchCyberInsuranceAdapter, VouchCyberInsuranceCredentials
from sentinel.integrations.a_scend.adapter import AScendAdapter, AScendCredentials

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
    # Phase 5: Device / MDM
    "jamf_pro": (JamfProAdapter, JamfProCredentials),
    "kandji_iru": (KandjiIruAdapter, KandjiIruCredentials),
    "mosyle": (MosyleAdapter, MosyleCredentials),
    "addigy": (AddigyAdapter, AddigyCredentials),
    "hexnode": (HexnodeAdapter, HexnodeCredentials),
    "fleetdm": (FleetDMAdapter, FleetDMCredentials),
    "ninjaone": (NinjaOneAdapter, NinjaOneCredentials),
    "miradore": (MiradoreAdapter, MiradoreCredentials),
    "manageengine": (ManageEngineAdapter, ManageEngineCredentials),
    "omnissa_workspace_one": (OmnissaWorkspaceOneAdapter, OmnissaWorkspaceOneCredentials),
    "vmware_workspace_one": (VMwareWorkspaceOneAdapter, VMwareWorkspaceOneCredentials),
    "jumpcloud_mdm": (JumpCloudMDMAdapter, JumpCloudMDMCredentials),
    # Phase 6: Security / SIEM
    "aikido": (AikidoAdapter, AikidoCredentials),
    "aqua_security": (AquaSecurityAdapter, AquaSecurityCredentials),
    "bitsight": (BitsightAdapter, BitsightCredentials),
    "checkmarx": (CheckmarxAdapter, CheckmarxCredentials),
    "crowdstrike": (CrowdStrikeAdapter, CrowdStrikeCredentials),
    "datadog": (DatadogAdapter, DatadogCredentials),
    "elastic_security": (ElasticSecurityAdapter, ElasticSecurityCredentials),
    "gitguardian": (GitGuardianAdapter, GitGuardianCredentials),
    "gitleaks": (GitleaksAdapter, GitleaksCredentials),
    "grafana": (GrafanaAdapter, GrafanaCredentials),
    "graylog": (GraylogAdapter, GraylogCredentials),
    "lacework": (LaceworkAdapter, LaceworkCredentials),
    "launchdarkly": (LaunchDarklyAdapter, LaunchDarklyCredentials),
    "logrhythm": (LogRhythmAdapter, LogRhythmCredentials),
    "nessus": (NessusAdapter, NessusCredentials),
    "new_relic": (NewRelicAdapter, NewRelicCredentials),
    "openvas": (OpenVasAdapter, OpenVasCredentials),
    "orca_security": (OrcaSecurityAdapter, OrcaSecurityCredentials),
    "prisma_cloud": (PrismaCloudAdapter, PrismaCloudCredentials),
    "qualys": (QualysAdapter, QualysCredentials),
    "rapid7_insightvm": (Rapid7InsightVmAdapter, Rapid7InsightVmCredentials),
    "rollbar": (RollbarAdapter, RollbarCredentials),
    "securityscorecard": (SecurityScorecardAdapter, SecurityScorecardCredentials),
    "semgrep": (SemgrepAdapter, SemgrepCredentials),
    "sentinelone": (SentinelOneAdapter, SentinelOneCredentials),
    "sentry": (SentryAdapter, SentryCredentials),
    "snyk": (SnykAdapter, SnykCredentials),
    "sonarqube": (SonarQubeAdapter, SonarQubeCredentials),
    "splunk": (SplunkAdapter, SplunkCredentials),
    "splunk_enterprise": (SplunkEnterpriseAdapter, SplunkEnterpriseCredentials),
    "sumo_logic": (SumoLogicAdapter, SumoLogicCredentials),
    "tailscale": (TailscaleAdapter, TailscaleCredentials),
    "tenable": (TenableAdapter, TenableCredentials),
    "tenable_vulnerability_management_fedramp": (TenableFedRampAdapter, TenableFedRampCredentials),
    "trivy": (TrivyAdapter, TrivyCredentials),
    "trufflehog": (TrufflehogAdapter, TrufflehogCredentials),
    "veracode": (VeracodeAdapter, VeracodeCredentials),
    "wiz": (WizAdapter, WizCredentials),
    # Phase 7: HRIS / people
    "workday": (WorkdayAdapter, WorkdayCredentials),
    "sap_successfactors": (SapSuccessfactorsAdapter, SapSuccessfactorsCredentials),
    "adp": (AdpAdapter, AdpCredentials),
    "adp_workforce_now": (AdpWorkforceNowAdapter, AdpWorkforceNowCredentials),
    "ukg": (UkgAdapter, UkgCredentials),
    "paychex": (PaychexAdapter, PaychexCredentials),
    "bamboohr": (BamboohrAdapter, BamboohrCredentials),
    "hibob": (HibobAdapter, HibobCredentials),
    "personio": (PersonioAdapter, PersonioCredentials),
    "rippling": (RipplingAdapter, RipplingCredentials),
    "gusto": (GustoAdapter, GustoCredentials),
    "deel": (DeelAdapter, DeelCredentials),
    "trinet": (TrinetAdapter, TrinetCredentials),
    "justworks": (JustworksAdapter, JustworksCredentials),
    "isolved": (IsolvedAdapter, IsolvedCredentials),
    "payfit": (PayfitAdapter, PayfitCredentials),
    "square_payroll": (SquarePayrollAdapter, SquarePayrollCredentials),
    "kenjo": (KenjoAdapter, KenjoCredentials),
    "netsuite": (NetsuiteAdapter, NetsuiteCredentials),
    "factorial": (FactorialAdapter, FactorialCredentials),
    "charthop": (CharthopAdapter, CharthopCredentials),
    "humaans": (HumaansAdapter, HumaansCredentials),
    "proliant": (ProliantAdapter, ProliantCredentials),
    "alexishr": (AlexisHRAdapter, AlexisHRCredentials),
    "employment_hero": (EmploymentHeroAdapter, EmploymentHeroCredentials),
    "7shifts": (SevenShiftsAdapter, SevenShiftsCredentials),
    # Phase 8: Collaboration, ticketing & business SaaS
    "slack": (SlackAdapter, SlackCredentials),
    "zoom": (ZoomAdapter, ZoomCredentials),
    "webex": (WebexAdapter, WebexCredentials),
    "box": (BoxAdapter, BoxCredentials),
    "dropbox": (DropboxAdapter, DropboxCredentials),
    "notion": (NotionAdapter, NotionCredentials),
    "docusign": (DocusignAdapter, DocusignCredentials),
    "calendly": (CalendlyAdapter, CalendlyCredentials),
    "miro": (MiroAdapter, MiroCredentials),
    "servicenow": (ServicenowAdapter, ServicenowCredentials),
    "zendesk": (ZendeskAdapter, ZendeskCredentials),
    "asana": (AsanaAdapter, AsanaCredentials),
    "linear": (LinearAdapter, LinearCredentials),
    "clickup": (ClickupAdapter, ClickupCredentials),
    "monday_com": (MondayComAdapter, MondayComCredentials),
    "basecamp": (BasecampAdapter, BasecampCredentials),
    "smartsheet": (SmartsheetAdapter, SmartsheetCredentials),
    "teamwork": (TeamworkAdapter, TeamworkCredentials),
    "freshservice": (FreshserviceAdapter, FreshserviceCredentials),
    "salesforce": (SalesforceAdapter, SalesforceCredentials),
    "hubspot": (HubspotAdapter, HubspotCredentials),
    "pipedrive": (PipedriveAdapter, PipedriveCredentials),
    "copper": (CopperAdapter, CopperCredentials),
    "insightly": (InsightlyAdapter, InsightlyCredentials),
    "close": (CloseAdapter, CloseCredentials),
    "capsule": (CapsuleAdapter, CapsuleCredentials),
    "gong": (GongAdapter, GongCredentials),
    "gorgias": (GorgiasAdapter, GorgiasCredentials),
    "intercom": (IntercomAdapter, IntercomCredentials),
    "xero": (XeroAdapter, XeroCredentials),
    "quickbooks": (QuickbooksAdapter, QuickbooksCredentials),
    "brex": (BrexAdapter, BrexCredentials),
    "ramp": (RampAdapter, RampCredentials),
    "twilio": (TwilioAdapter, TwilioCredentials),
    "apollo": (ApolloAdapter, ApolloCredentials),
    "zoominfo": (ZoominfoAdapter, ZoominfoCredentials),
    "envoy": (EnvoyAdapter, EnvoyCredentials),
    "torii": (ToriiAdapter, ToriiCredentials),
    "rockset": (RocksetAdapter, RocksetCredentials),
    "clockwork": (ClockworkAdapter, ClockworkCredentials),
    "knowbe4": (Knowbe4Adapter, Knowbe4Credentials),
    "udemy_business": (UdemyBusinessAdapter, UdemyBusinessCredentials),
    "wizer": (WizerAdapter, WizerCredentials),
    "mimecast": (MimecastAdapter, MimecastCredentials),
    "docebo": (DoceboAdapter, DoceboCredentials),
    "cybeready": (CybereadyAdapter, CybereadyCredentials),
    "breezy_hr": (BreezyHrAdapter, BreezyHrCredentials),
    "cats": (CatsAdapter, CatsCredentials),
    "jobvite": (JobviteAdapter, JobviteCredentials),
    "smartrecruiters": (SmartrecruitersAdapter, SmartrecruitersCredentials),
    "teamtailor": (TeamtailorAdapter, TeamtailorCredentials),
    "jobadder": (JobadderAdapter, JobadderCredentials),
    "lever": (LeverAdapter, LeverCredentials),
    "comeet": (ComeetAdapter, ComeetCredentials),
    "certn": (CertnAdapter, CertnCredentials),
    "checkr": (CheckrAdapter, CheckrCredentials),
    "oracle_cloud": (OracleCloudAdapter, OracleCloudCredentials),
    "digitalocean": (DigitaloceanAdapter, DigitaloceanCredentials),
    "vercel": (VercelAdapter, VercelCredentials),
    "netlify": (NetlifyAdapter, NetlifyCredentials),
    "scaleway": (ScalewayAdapter, ScalewayCredentials),
    "supabase": (SupabaseAdapter, SupabaseCredentials),
    "ovhcloud": (OvhcloudAdapter, OvhcloudCredentials),
    "heroku": (HerokuAdapter, HerokuCredentials),
    "akamai": (AkamaiAdapter, AkamaiCredentials),
    "snowflake": (SnowflakeAdapter, SnowflakeCredentials),
    "render": (RenderAdapter, RenderCredentials),
    "mongodb_atlas": (MongoDbAtlasAdapter, MongoDbAtlasCredentials),
    "mongodb_atlas_for_government": (MongoDbAtlasForGovernmentAdapter, MongoDbAtlasForGovernmentCredentials),
    "ibm_cloud": (IbmCloudAdapter, IbmCloudCredentials),
    "alibaba_cloud": (AlibabaCloudAdapter, AlibabaCloudCredentials),
    "cloudflare": (CloudflareAdapter, CloudflareCredentials),
    "kubernetes": (KubernetesAdapter, KubernetesCredentials),
    "docker_hub": (DockerHubAdapter, DockerHubCredentials),
    "github_actions": (GithubActionsAdapter, GithubActionsCredentials),
    "jenkins": (JenkinsAdapter, JenkinsCredentials),
    "circleci": (CircleciAdapter, CircleciCredentials),
    "hashicorp_vault": (HashicorpVaultAdapter, HashicorpVaultCredentials),
    "bitwarden": (BitwardenAdapter, BitwardenCredentials),
    "fieldguide": (FieldguideAdapter, FieldguideCredentials),
    "vouch_cyber_insurance": (VouchCyberInsuranceAdapter, VouchCyberInsuranceCredentials),
    "a_scend": (AScendAdapter, AScendCredentials),
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
