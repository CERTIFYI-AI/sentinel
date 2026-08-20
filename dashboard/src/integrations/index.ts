// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Registry of providers with a connect form (shipped or in-progress
// adapters). The browsable catalog of all catalogued products comes from the
// integration_catalog table — do not mirror it here.
//
// Each id must match a slug in sentinel/integrations/registry.py. The server
// is the authority on what can be connected; this registry only decides which
// fields the form collects, and a provider present here but absent there gets
// a 400 at connect time rather than a broken row.

import type { IntegrationConfig } from './types'
import { GithubConfig } from './github/config'
import { AwsConfig } from './aws/config'
import { AzureConfig } from './azure/config'
import { OktaConfig } from './okta/config'
import { EntraConfig, EntraGccHighConfig } from './entra/config'
import { IntuneConfig, IntuneGccHighConfig } from './intune/config'
import { SharePointConfig } from './sharepoint/config'
import { OneDriveConfig } from './onedrive/config'
import { TeamsConfig } from './teams/config'
import { DefenderConfig, DefenderGccHighConfig } from './defender/config'
import { SentinelSiemConfig } from './sentinel_siem/config'
import { KeyVaultConfig } from './keyvault/config'
import { DevOpsConfig } from './devops/config'
import { GoogleWorkspaceConfig } from './google_workspace/config'
import { GoogleCloudIdentityConfig } from './google_cloud_identity/config'
import { GoogleDriveConfig } from './google_drive/config'
import { GcpConfig } from './gcp/config'
import { VertexAiConfig } from './vertex_ai/config'
import { ChronicleConfig } from './chronicle/config'
import { JiraConfig } from './jira/config'
import { JiraSmConfig } from './jira_sm/config'
import { ConfluenceConfig } from './confluence/config'
import { ConfluenceAcConfig } from './confluence_ac/config'
import { BitbucketConfig } from './bitbucket/config'
import { GitLabCloudConfig } from './gitlab_cloud/config'
import { GitLabSmConfig } from './gitlab_sm/config'
import { GitLabCiCdConfig } from './gitlab_cicd/config'
import { AwsBedrockConfig } from './aws_bedrock/config'
import { AwsSecretsManagerConfig } from './aws_secrets_manager/config'
// Phase 3: AI platforms
import { OpenAiConfig } from './openai_platform/config'
import { AzureOpenAiConfig } from './azure_openai/config'
import { AnthropicApiConfig } from './anthropic_api/config'
import { AnthropicConsoleConfig } from './anthropic_console/config'
import { HuggingFaceConfig } from './hugging_face/config'
import { GithubCopilotConfig } from './github_copilot/config'
import { CursorCodeiumConfig } from './cursor_codeium/config'
import { LangSmithConfig } from './langsmith/config'
import { ArizeConfig } from './arize/config'
import { WandbConfig } from './wandb/config'
import { PineconeConfig } from './pinecone/config'
import { WeaviateConfig } from './weaviate/config'
import { LakeraConfig } from './lakera/config'
import { HiddenLayerConfig } from './hiddenlayer/config'
// Phase 4: Identity providers
import { Auth0Config } from './auth0/config'
import { OneLoginConfig } from './onelogin/config'
import { PingOneConfig } from './pingone/config'
import { PingIdentityConfig } from './ping_identity/config'
import { JumpCloudConfig } from './jumpcloud/config'
import { DuoConfig } from './duo/config'
import { OnePasswordConfig } from './onepassword/config'
import { OnePasswordDeviceTrustConfig } from './onepassword_device_trust/config'
import { KeeperConfig } from './keeper/config'
import { CyberArkConfig } from './cyberark/config'
import { SailPointConfig } from './sailpoint/config'
import { OneIdentityConfig } from './one_identity/config'
// Phase 5: Device / MDM
import { JamfProConfig } from './jamf_pro/config'
import { KandjiIruConfig } from './kandji_iru/config'
import { MosyleConfig } from './mosyle/config'
import { AddigyConfig } from './addigy/config'
import { HexnodeConfig } from './hexnode/config'
import { FleetDMConfig } from './fleetdm/config'
import { NinjaOneConfig } from './ninjaone/config'
import { MiradoreConfig } from './miradore/config'
import { ManageEngineConfig } from './manageengine/config'
import { OmnissaWorkspaceOneConfig } from './omnissa_workspace_one/config'
import { VMwareWorkspaceOneConfig } from './vmware_workspace_one/config'
import { JumpCloudMDMConfig } from './jumpcloud_mdm/config'

export type { IntegrationConfig, CredentialField, IntegrationCategory, AuthMethod } from './types'

export const INTEGRATIONS: IntegrationConfig[] = [
  GithubConfig,
  AwsConfig,
  AzureConfig,
  OktaConfig,
  EntraConfig,
  EntraGccHighConfig,
  IntuneConfig,
  IntuneGccHighConfig,
  SharePointConfig,
  OneDriveConfig,
  TeamsConfig,
  DefenderConfig,
  DefenderGccHighConfig,
  SentinelSiemConfig,
  KeyVaultConfig,
  DevOpsConfig,
  GoogleWorkspaceConfig,
  GoogleCloudIdentityConfig,
  GoogleDriveConfig,
  GcpConfig,
  VertexAiConfig,
  ChronicleConfig,
  JiraConfig,
  JiraSmConfig,
  ConfluenceConfig,
  ConfluenceAcConfig,
  BitbucketConfig,
  GitLabCloudConfig,
  GitLabSmConfig,
  GitLabCiCdConfig,
  AwsBedrockConfig,
  AwsSecretsManagerConfig,
  // Phase 3: AI platforms
  OpenAiConfig,
  AzureOpenAiConfig,
  AnthropicApiConfig,
  AnthropicConsoleConfig,
  HuggingFaceConfig,
  GithubCopilotConfig,
  CursorCodeiumConfig,
  LangSmithConfig,
  ArizeConfig,
  WandbConfig,
  PineconeConfig,
  WeaviateConfig,
  LakeraConfig,
  HiddenLayerConfig,
  // Phase 4: Identity providers
  Auth0Config,
  OneLoginConfig,
  PingOneConfig,
  PingIdentityConfig,
  JumpCloudConfig,
  DuoConfig,
  OnePasswordConfig,
  OnePasswordDeviceTrustConfig,
  KeeperConfig,
  CyberArkConfig,
  SailPointConfig,
  OneIdentityConfig,
  // Phase 5: Device / MDM
  JamfProConfig,
  KandjiIruConfig,
  MosyleConfig,
  AddigyConfig,
  HexnodeConfig,
  FleetDMConfig,
  NinjaOneConfig,
  MiradoreConfig,
  ManageEngineConfig,
  OmnissaWorkspaceOneConfig,
  VMwareWorkspaceOneConfig,
  JumpCloudMDMConfig,
]

export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS.find((i) => i.id === id)
}
