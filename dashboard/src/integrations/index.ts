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
// Phase 6: Security / SIEM
import { AikidoConfig } from './aikido/config'
import { AquaSecurityConfig } from './aqua_security/config'
import { BitsightConfig } from './bitsight/config'
import { CheckmarxConfig } from './checkmarx/config'
import { CrowdStrikeConfig } from './crowdstrike/config'
import { DatadogConfig } from './datadog/config'
import { ElasticSecurityConfig } from './elastic_security/config'
import { GitGuardianConfig } from './gitguardian/config'
import { GitleaksConfig } from './gitleaks/config'
import { GrafanaConfig } from './grafana/config'
import { GraylogConfig } from './graylog/config'
import { LaceworkConfig } from './lacework/config'
import { LaunchDarklyConfig } from './launchdarkly/config'
import { LogRhythmConfig } from './logrhythm/config'
import { NessusConfig } from './nessus/config'
import { NewRelicConfig } from './new_relic/config'
import { OpenVasConfig } from './openvas/config'
import { OrcaSecurityConfig } from './orca_security/config'
import { PrismaCloudConfig } from './prisma_cloud/config'
import { QualysConfig } from './qualys/config'
import { Rapid7InsightVmConfig } from './rapid7_insightvm/config'
import { RollbarConfig } from './rollbar/config'
import { SecurityScorecardConfig } from './securityscorecard/config'
import { SemgrepConfig } from './semgrep/config'
import { SentinelOneConfig } from './sentinelone/config'
import { SentryConfig } from './sentry/config'
import { SnykConfig } from './snyk/config'
import { SonarQubeConfig } from './sonarqube/config'
import { SplunkConfig } from './splunk/config'
import { SplunkEnterpriseConfig } from './splunk_enterprise/config'
import { SumoLogicConfig } from './sumo_logic/config'
import { TailscaleConfig } from './tailscale/config'
import { TenableConfig } from './tenable/config'
import { TenableFedRampConfig } from './tenable_vulnerability_management_fedramp/config'
import { TrivyConfig } from './trivy/config'
import { TrufflehogConfig } from './trufflehog/config'
import { VeracodeConfig } from './veracode/config'
import { WizConfig } from './wiz/config'
// Phase 7: HRIS / people
import { WorkdayConfig } from './workday/config'
// Phase 8: Collaboration, ticketing & business SaaS
import { SlackConfig } from './slack/config'
import { ZoomConfig } from './zoom/config'
import { WebexConfig } from './webex/config'
import { BoxConfig } from './box/config'
import { DropboxConfig } from './dropbox/config'
import { NotionConfig } from './notion/config'
import { DocusignConfig } from './docusign/config'
import { CalendlyConfig } from './calendly/config'
import { MiroConfig } from './miro/config'
import { ServicenowConfig } from './servicenow/config'
import { ZendeskConfig } from './zendesk/config'
import { AsanaConfig } from './asana/config'
import { LinearConfig } from './linear/config'
import { ClickupConfig } from './clickup/config'
import { MondayComConfig } from './monday_com/config'
import { BasecampConfig } from './basecamp/config'
import { SmartsheetConfig } from './smartsheet/config'
import { TeamworkConfig } from './teamwork/config'
import { FreshserviceConfig } from './freshservice/config'
import { SalesforceConfig } from './salesforce/config'
import { HubspotConfig } from './hubspot/config'
import { PipedriveConfig } from './pipedrive/config'
import { CopperConfig } from './copper/config'
import { InsightlyConfig } from './insightly/config'
import { CloseConfig } from './close/config'
import { CapsuleConfig } from './capsule/config'
import { GongConfig } from './gong/config'
import { GorgiasConfig } from './gorgias/config'
import { IntercomConfig } from './intercom/config'
import { XeroConfig } from './xero/config'
import { QuickbooksConfig } from './quickbooks/config'
import { BrexConfig } from './brex/config'
import { RampConfig } from './ramp/config'
import { TwilioConfig } from './twilio/config'
import { ApolloConfig } from './apollo/config'
import { ZoominfoConfig } from './zoominfo/config'
import { EnvoyConfig } from './envoy/config'
import { ToriiConfig } from './torii/config'
import { RocksetConfig } from './rockset/config'
import { ClockworkConfig } from './clockwork/config'
import { Knowbe4Config } from './knowbe4/config'
import { UdemyBusinessConfig } from './udemy_business/config'
import { WizerConfig } from './wizer/config'
import { MimecastConfig } from './mimecast/config'
import { DoceboConfig } from './docebo/config'
import { CybereadyConfig } from './cybeready/config'
import { BreezyHrConfig } from './breezy_hr/config'
import { CatsConfig } from './cats/config'
import { JobviteConfig } from './jobvite/config'
import { SmartrecruitersConfig } from './smartrecruiters/config'
import { TeamtailorConfig } from './teamtailor/config'
import { JobadderConfig } from './jobadder/config'
import { LeverConfig } from './lever/config'
import { ComeetConfig } from './comeet/config'
import { CertnConfig } from './certn/config'
import { CheckrConfig } from './checkr/config'
import { OracleCloudConfig } from './oracle_cloud/config'
import { DigitaloceanConfig } from './digitalocean/config'
import { VercelConfig } from './vercel/config'
import { NetlifyConfig } from './netlify/config'
import { ScalewayConfig } from './scaleway/config'
import { SupabaseConfig } from './supabase/config'
import { OvhcloudConfig } from './ovhcloud/config'
import { HerokuConfig } from './heroku/config'
import { AkamaiConfig } from './akamai/config'
import { SnowflakeConfig } from './snowflake/config'
import { RenderConfig } from './render/config'
import { MongoDbAtlasConfig } from './mongodb_atlas/config'
import { MongoDbAtlasForGovernmentConfig } from './mongodb_atlas_for_government/config'
import { IbmCloudConfig } from './ibm_cloud/config'
import { AlibabaCloudConfig } from './alibaba_cloud/config'
import { CloudflareConfig } from './cloudflare/config'
import { KubernetesConfig } from './kubernetes/config'
import { DockerHubConfig } from './docker_hub/config'
import { GithubActionsConfig } from './github_actions/config'
import { JenkinsConfig } from './jenkins/config'
import { CircleciConfig } from './circleci/config'
import { HashicorpVaultConfig } from './hashicorp_vault/config'
import { BitwardenConfig } from './bitwarden/config'
import { FieldguideConfig } from './fieldguide/config'
import { VouchCyberInsuranceConfig } from './vouch_cyber_insurance/config'
import { AScendConfig } from './a_scend/config'
import { SapSuccessfactorsConfig } from './sap_successfactors/config'
import { AdpConfig } from './adp/config'
import { AdpWorkforceNowConfig } from './adp_workforce_now/config'
import { UkgConfig } from './ukg/config'
import { PaychexConfig } from './paychex/config'
import { BamboohrConfig } from './bamboohr/config'
import { HibobConfig } from './hibob/config'
import { PersonioConfig } from './personio/config'
import { RipplingConfig } from './rippling/config'
import { GustoConfig } from './gusto/config'
import { DeelConfig } from './deel/config'
import { TrinetConfig } from './trinet/config'
import { JustworksConfig } from './justworks/config'
import { IsolvedConfig } from './isolved/config'
import { PayfitConfig } from './payfit/config'
import { SquarePayrollConfig } from './square_payroll/config'
import { KenjoConfig } from './kenjo/config'
import { NetsuiteConfig } from './netsuite/config'
import { FactorialConfig } from './factorial/config'
import { CharthopConfig } from './charthop/config'
import { HumaansConfig } from './humaans/config'
import { ProliantConfig } from './proliant/config'
import { AlexisHRConfig } from './alexishr/config'
import { EmploymentHeroConfig } from './employment_hero/config'
import { SevenShiftsConfig } from './seven_shifts/config'

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
  // Phase 6: Security / SIEM
  AikidoConfig,
  AquaSecurityConfig,
  BitsightConfig,
  CheckmarxConfig,
  CrowdStrikeConfig,
  DatadogConfig,
  ElasticSecurityConfig,
  GitGuardianConfig,
  GitleaksConfig,
  GrafanaConfig,
  GraylogConfig,
  LaceworkConfig,
  LaunchDarklyConfig,
  LogRhythmConfig,
  NessusConfig,
  NewRelicConfig,
  OpenVasConfig,
  OrcaSecurityConfig,
  PrismaCloudConfig,
  QualysConfig,
  Rapid7InsightVmConfig,
  RollbarConfig,
  SecurityScorecardConfig,
  SemgrepConfig,
  SentinelOneConfig,
  SentryConfig,
  SnykConfig,
  SonarQubeConfig,
  SplunkConfig,
  SplunkEnterpriseConfig,
  SumoLogicConfig,
  TailscaleConfig,
  TenableConfig,
  TenableFedRampConfig,
  TrivyConfig,
  TrufflehogConfig,
  VeracodeConfig,
  WizConfig,
  // Phase 7: HRIS / people
  WorkdayConfig,
  SapSuccessfactorsConfig,
  AdpConfig,
  AdpWorkforceNowConfig,
  UkgConfig,
  PaychexConfig,
  BamboohrConfig,
  HibobConfig,
  PersonioConfig,
  RipplingConfig,
  GustoConfig,
  DeelConfig,
  TrinetConfig,
  JustworksConfig,
  IsolvedConfig,
  PayfitConfig,
  SquarePayrollConfig,
  KenjoConfig,
  NetsuiteConfig,
  FactorialConfig,
  CharthopConfig,
  HumaansConfig,
  ProliantConfig,
  AlexisHRConfig,
  EmploymentHeroConfig,
  SevenShiftsConfig,
  // Phase 8: Collaboration, ticketing & business SaaS
  SlackConfig,
  ZoomConfig,
  WebexConfig,
  BoxConfig,
  DropboxConfig,
  NotionConfig,
  DocusignConfig,
  CalendlyConfig,
  MiroConfig,
  ServicenowConfig,
  ZendeskConfig,
  AsanaConfig,
  LinearConfig,
  ClickupConfig,
  MondayComConfig,
  BasecampConfig,
  SmartsheetConfig,
  TeamworkConfig,
  FreshserviceConfig,
  SalesforceConfig,
  HubspotConfig,
  PipedriveConfig,
  CopperConfig,
  InsightlyConfig,
  CloseConfig,
  CapsuleConfig,
  GongConfig,
  GorgiasConfig,
  IntercomConfig,
  XeroConfig,
  QuickbooksConfig,
  BrexConfig,
  RampConfig,
  TwilioConfig,
  ApolloConfig,
  ZoominfoConfig,
  EnvoyConfig,
  ToriiConfig,
  RocksetConfig,
  ClockworkConfig,
  Knowbe4Config,
  UdemyBusinessConfig,
  WizerConfig,
  MimecastConfig,
  DoceboConfig,
  CybereadyConfig,
  BreezyHrConfig,
  CatsConfig,
  JobviteConfig,
  SmartrecruitersConfig,
  TeamtailorConfig,
  JobadderConfig,
  LeverConfig,
  ComeetConfig,
  CertnConfig,
  CheckrConfig,
  OracleCloudConfig,
  DigitaloceanConfig,
  VercelConfig,
  NetlifyConfig,
  ScalewayConfig,
  SupabaseConfig,
  OvhcloudConfig,
  HerokuConfig,
  AkamaiConfig,
  SnowflakeConfig,
  RenderConfig,
  MongoDbAtlasConfig,
  MongoDbAtlasForGovernmentConfig,
  IbmCloudConfig,
  AlibabaCloudConfig,
  CloudflareConfig,
  KubernetesConfig,
  DockerHubConfig,
  GithubActionsConfig,
  JenkinsConfig,
  CircleciConfig,
  HashicorpVaultConfig,
  BitwardenConfig,
  FieldguideConfig,
  VouchCyberInsuranceConfig,
  AScendConfig,
]

export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS.find((i) => i.id === id)
}
