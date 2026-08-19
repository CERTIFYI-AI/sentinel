// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// productProfiles — how each specific product is actually reached.
//
// Before this, every catalogue product with no adapter was asked the same
// three questions: "tenant, workspace or account", an owner, and a cadence.
// That is true of nothing in particular. AWS is identified by a 12-digit
// account number and reached with an IAM role; Zoom is identified by an
// Account ID and reached with a Server-to-Server OAuth app; Okta by an org URL
// and an SSWS token. Asking all three for "tenant, workspace or account"
// produces a record nobody can act on, because the person who eventually
// builds the connection has to go and find out anyway.
//
// WHAT THIS FILE MAY AND MAY NOT ASSERT
//
// Every entry states how that vendor's own documented integration works —
// which identifier names the account, and which authentication method an
// adapter would use. These are stable, publicly documented facts about each
// product, and they are the kind of thing that is either right or obviously
// wrong; nothing here is inferred from the catalogue text, and nothing is
// guessed. A product we are not confident about is simply absent and falls
// back to the category shape, which is honest rather than specific.
//
// WHAT IS STILL NOT COLLECTED
//
// `fields` here are IDENTIFIERS AND SCOPE, never secrets — a monitored source
// has no adapter, so a credential would be stored with nothing able to use it.
// `authMethod` names what the eventual adapter will need, so the registration
// records the right contract without taking the secret early. When an adapter
// does ship, its credential form lives in ./<product>/config.ts and this file
// stops being consulted for it.

import type { ProfileField } from './connectionProfiles'

export interface ProductProfile {
  /** How an adapter authenticates to this product, in the vendor's own terms. */
  authMethod: string
  /** Non-secret identity and scope questions specific to this product. */
  fields: ProfileField[]
  /** One sentence an operator can act on when planning the connection. */
  setupHint?: string
}

const text = (
  id: string, label: string, placeholder: string, helpText?: string, required = true,
): ProfileField => ({ id, label, type: 'text', required, placeholder, helpText })

const url = (
  id: string, label: string, placeholder: string, helpText?: string, required = true,
): ProfileField => ({ id, label, type: 'url', required, placeholder, helpText })

/**
 * Keyed by `integration_catalog.slug`. Slugs verified against the seeded
 * catalogue — an entry for a slug that does not exist is dead code that never
 * runs and never fails.
 */
export const PRODUCT_PROFILES: Readonly<Record<string, ProductProfile>> = {
  // ── Cloud ────────────────────────────────────────────────────────────────
  aws: {
    authMethod: 'Cross-account IAM role (STS AssumeRole) with an external ID',
    setupHint:
      'A read-only role trusted to Sentinel is preferred over long-lived keys: it is revoked by '
      + 'deleting the role rather than by rotating a secret.',
    fields: [
      text('account_id', 'AWS account ID', '123456789012',
        'The 12-digit account. Register each account separately — an IAM role is account-scoped.'),
      text('regions', 'Regions in scope', 'us-east-1, eu-west-1',
        'IAM, S3 and CloudTrail are account-wide; EBS, RDS, security groups, KMS and GuardDuty are per region.'),
    ],
  },
  google_cloud_platform: {
    authMethod: 'Service account key or workload identity federation',
    fields: [
      text('project_ids', 'Project ID(s)', 'my-project-1234',
        'Or the organisation/folder id if the connection is org-wide.'),
      text('organization_id', 'Organisation ID', '123456789012', undefined, false),
    ],
  },
  cloudflare: {
    authMethod: 'Scoped API token',
    fields: [
      text('account_id', 'Cloudflare account ID', '32-character hex from the dashboard sidebar'),
      text('zones', 'Zones in scope', 'example.com, example.org', undefined, false),
    ],
  },
  snowflake: {
    authMethod: 'Key-pair authentication for a read-only role',
    fields: [
      text('account_identifier', 'Account identifier', 'myorg-myaccount',
        'The organisation-account form, not the legacy locator.'),
      text('warehouse_role', 'Role in scope', 'SECURITY_AUDITOR', undefined, false),
    ],
  },

  // ── Identity ─────────────────────────────────────────────────────────────
  okta: {
    authMethod: 'API token (SSWS) or an OAuth service app with read-only scopes',
    setupHint: 'Use a service account so the token survives the admin who created it leaving.',
    fields: [
      url('org_url', 'Okta org URL', 'https://example.okta.com',
        'Use the admin URL only if that is what the token was issued against.'),
    ],
  },
  microsoft_entra_id: {
    authMethod: 'Entra ID app registration, client credentials, Microsoft Graph read scopes',
    fields: [
      text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'),
      text('primary_domain', 'Primary domain', 'example.onmicrosoft.com', undefined, false),
    ],
  },
  microsoft_entra_id_gcc_high: {
    authMethod: 'Entra ID app registration on the US Government cloud endpoints',
    setupHint: 'GCC High uses separate Graph and login hostnames from commercial — the tenant id alone is not enough for an adapter.',
    fields: [
      text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'),
    ],
  },
  google_workspace: {
    authMethod: 'Service account with domain-wide delegation, impersonating a super-admin',
    fields: [
      text('customer_id', 'Customer ID', 'C01abcdef',
        'Admin console → Account settings. Distinguishes the tenant from its domains.'),
      text('primary_domain', 'Primary domain', 'example.com'),
      text('admin_email', 'Admin to impersonate', 'admin@example.com',
        'Domain-wide delegation acts as a named user; record which one.'),
    ],
  },
  google_cloud_identity: {
    authMethod: 'Service account with domain-wide delegation',
    fields: [
      text('customer_id', 'Customer ID', 'C01abcdef'),
      text('primary_domain', 'Primary domain', 'example.com'),
    ],
  },
  '1password': {
    authMethod: 'Service account token, or the Events API for audit events',
    fields: [
      url('sign_in_url', 'Sign-in URL', 'https://example.1password.com'),
    ],
  },

  // ── Collaboration ────────────────────────────────────────────────────────
  zoom: {
    authMethod: 'Server-to-Server OAuth app (Account ID + Client ID + Client Secret)',
    setupHint:
      'Created in the Zoom App Marketplace as a Server-to-Server OAuth app, not a user-level OAuth '
      + 'app — the account-level one is what survives an admin changing.',
    fields: [
      text('account_id', 'Zoom Account ID', 'From the Server-to-Server OAuth app credentials'),
      text('account_owner_email', 'Account owner', 'admin@example.com', undefined, false),
    ],
  },
  slack: {
    authMethod: 'Slack app with bot/user OAuth token; Enterprise Grid uses org-level install',
    fields: [
      text('workspace', 'Workspace or Enterprise Grid org', 'example.slack.com'),
      text('team_id', 'Team ID', 'T0123ABCDEF',
        'Stable across workspace renames, which the URL is not.', false),
    ],
  },
  microsoft_teams: {
    authMethod: 'Entra ID app registration with Microsoft Graph read scopes',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  microsoft_sharepoint: {
    authMethod: 'Entra ID app registration with Microsoft Graph / SharePoint read scopes',
    fields: [
      text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'),
      url('tenant_url', 'SharePoint tenant URL', 'https://example.sharepoint.com', undefined, false),
    ],
  },
  google_drive: {
    authMethod: 'Service account with domain-wide delegation',
    fields: [
      text('customer_id', 'Customer ID', 'C01abcdef'),
      text('shared_drives', 'Shared drives in scope', 'Compliance, Legal', undefined, false),
    ],
  },
  box: {
    authMethod: 'Box custom app using JWT (server authentication)',
    fields: [text('enterprise_id', 'Enterprise ID', '1234567')],
  },
  dropbox: {
    authMethod: 'Dropbox Business API app, team-scoped',
    fields: [text('team_id', 'Team ID', 'dbtid:...')],
  },
  notion: {
    authMethod: 'Internal integration token, shared to the pages in scope',
    setupHint:
      'A Notion integration sees only pages explicitly shared with it — record which, or the '
      + 'evidence scope is unknowable later.',
    fields: [
      text('workspace_name', 'Workspace', 'Example Inc'),
      text('shared_pages', 'Pages or databases shared', 'Policies, Risk register', undefined, false),
    ],
  },

  // ── Code / CI ────────────────────────────────────────────────────────────
  gitlab_cloud: {
    authMethod: 'Project or group access token, read-only scopes',
    fields: [text('group_path', 'Group path', 'my-group/my-subgroup')],
  },
  gitlab_self_managed: {
    authMethod: 'Personal or group access token against your own instance',
    fields: [
      url('instance_url', 'GitLab instance URL', 'https://gitlab.example.com'),
      text('group_path', 'Group path', 'my-group', undefined, false),
    ],
  },
  github_actions: {
    authMethod: 'GitHub App or fine-grained PAT with Actions read scope',
    fields: [text('organization', 'Organisation', 'certifyi-ai')],
  },

  // ── Ticketing / SaaS ─────────────────────────────────────────────────────
  jira: {
    authMethod: 'Atlassian API token (email + token) or an OAuth 2.0 app',
    fields: [
      url('site_url', 'Atlassian site URL', 'https://example.atlassian.net'),
      text('projects', 'Projects in scope', 'SEC, RISK', undefined, false),
    ],
  },
  jira_service_management: {
    authMethod: 'Atlassian API token (email + token) or an OAuth 2.0 app',
    fields: [
      url('site_url', 'Atlassian site URL', 'https://example.atlassian.net'),
      text('service_desks', 'Service desks in scope', 'IT, Security', undefined, false),
    ],
  },
  servicenow: {
    authMethod: 'OAuth 2.0 or basic auth for a read-only integration user',
    fields: [
      url('instance_url', 'ServiceNow instance', 'https://example.service-now.com'),
      text('tables', 'Tables in scope', 'incident, change_request', undefined, false),
    ],
  },
  zendesk: {
    authMethod: 'API token (email/token) or OAuth',
    fields: [url('subdomain_url', 'Zendesk URL', 'https://example.zendesk.com')],
  },
  asana: {
    authMethod: 'Personal access token or a service account (Enterprise)',
    fields: [text('workspace_gid', 'Workspace / organisation GID', '1200000000000000')],
  },
  salesforce: {
    authMethod: 'Connected app, OAuth 2.0 JWT bearer flow',
    fields: [
      url('instance_url', 'My Domain / instance URL', 'https://example.my.salesforce.com'),
      text('org_id', 'Org ID', '00D000000000000', undefined, false),
    ],
  },
  workday: {
    authMethod: 'Integration System User with an API client (OAuth or WS-Security)',
    fields: [
      text('tenant', 'Workday tenant', 'example_prod'),
      url('host', 'Host', 'https://wd2-impl-services1.workday.com', undefined, false),
    ],
  },

  // ── Security / SIEM / Secrets ────────────────────────────────────────────
  datadog: {
    authMethod: 'API key plus an Application key, scoped read-only',
    setupHint: 'The site matters: keys are not portable between datadoghq.com, .eu and the US3/US5 sites.',
    fields: [
      text('site', 'Datadog site', 'datadoghq.com',
        'e.g. datadoghq.com, datadoghq.eu, us3.datadoghq.com'),
      text('organization', 'Organisation', 'Example Inc', undefined, false),
    ],
  },
  microsoft_defender_for_endpoint: {
    authMethod: 'Entra ID app registration with Defender/Graph security read scopes',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  microsoft_sentinel: {
    authMethod: 'Entra ID app registration with Log Analytics reader on the workspace',
    fields: [
      text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'),
      text('workspace_id', 'Log Analytics workspace ID', '00000000-0000-0000-0000-000000000000'),
    ],
  },
  microsoft_intune: {
    authMethod: 'Entra ID app registration with DeviceManagement read scopes',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  hashicorp_vault: {
    authMethod: 'AppRole or a token with a read-only policy',
    fields: [
      url('vault_addr', 'Vault address', 'https://vault.example.com:8200'),
      text('namespace', 'Namespace', 'admin/security',
        'Vault Enterprise only; leave blank on OSS.', false),
    ],
  },
  azure_key_vault: {
    authMethod: 'Entra ID app registration with Key Vault reader',
    fields: [
      text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'),
      text('vault_names', 'Vaults in scope', 'kv-prod, kv-shared', undefined, false),
    ],
  },

  // ── Additional catalogue products (identity & scope only; no secrets) ──
  sentinelone: {
    authMethod: 'API token (service user), read-only',
    setupHint: 'The console hostname is tenant-specific and is what an adapter calls.',
    fields: [url('console_url', 'Management console URL', 'https://your-tenant.sentinelone.net')],
  },
  orca_security: {
    authMethod: 'API token (read-only)',
    fields: [text('data_region', 'Data region', 'US', 'Your Orca SaaS region: US, EU, AU or AP.')],
  },
  tenable: {
    authMethod: 'API keys (access + secret), read-only',
    fields: [text('scope_assets', 'Assets or scan groups in scope', 'All', 'Tenable.io is cloud; scope narrows which assets are read.', false)],
  },
  tenable_vulnerability_management_fedramp: {
    authMethod: 'API keys against the FedRAMP endpoint',
    setupHint: 'FedRAMP uses fedcloud.tenable.com — a different endpoint from commercial.',
    fields: [text('scope_assets', 'Assets or scan groups in scope', 'All', undefined, false)],
  },
  microsoft_defender_for_endpoint_gcc_high: {
    authMethod: 'Entra ID app registration on US Government cloud endpoints',
    setupHint: 'GCC High uses separate Defender and Graph hostnames from commercial.',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  semgrep: {
    authMethod: 'API token for a deployment',
    fields: [text('deployment_slug', 'Deployment slug', 'my-org', 'Semgrep AppSec Platform deployment (org) the token belongs to.')],
  },
  wiz: {
    authMethod: 'Service account (OAuth2) with read scopes',
    fields: [url('api_endpoint', 'API endpoint', 'https://api.us1.app.wiz.io/graphql', 'Region-specific GraphQL endpoint from Settings → Tenant.')],
  },
  snyk: {
    authMethod: 'API token (service account), read-only',
    fields: [text('org_id', 'Organisation ID', 'a0b1c2d3-...', 'Snyk org (or group) UUID the token is scoped to.')],
  },
  crowdstrike: {
    authMethod: 'OAuth2 API client (Falcon) with read scopes',
    fields: [text('cloud_region', 'Falcon cloud', 'us-1', 'us-1, us-2, eu-1 or us-gov-1 — the region your tenant lives in.')],
  },
  aikido: {
    authMethod: 'API key (read-only)',
    fields: [text('workspace', 'Workspace', 'my-org', undefined, false)],
  },
  splunk: {
    authMethod: 'Bearer token or HEC token for a read-only role',
    fields: [url('instance_url', 'Splunk URL', 'https://your.splunkcloud.com:8089', 'Management/REST port for Splunk Cloud or Enterprise.')],
  },
  splunk_enterprise: {
    authMethod: 'Bearer token for a read-only role',
    fields: [url('instance_url', 'Splunk Enterprise URL', 'https://splunk.example.com:8089')],
  },
  sumo_logic: {
    authMethod: 'Access ID + access key, read-only',
    fields: [text('deployment', 'Deployment', 'us2', 'Sumo deployment: us1, us2, eu, au, etc. — it selects the API endpoint.')],
  },
  grafana: {
    authMethod: 'Service account token (Viewer)',
    fields: [url('instance_url', 'Grafana URL', 'https://myorg.grafana.net')],
  },
  new_relic: {
    authMethod: 'User API key (read-only)',
    fields: [text('account_id', 'Account ID', '1234567', 'Numeric New Relic account; add region below if EU.'), text('region', 'Region', 'US', 'US or EU datacenter.', false)],
  },
  sentry: {
    authMethod: 'Internal integration / auth token, read-only',
    fields: [text('organization_slug', 'Organisation slug', 'my-org'), url('base_url', 'Base URL', 'https://sentry.io', 'Self-hosted URL, or leave for SaaS.', false)],
  },
  rollbar: {
    authMethod: 'Project read access token',
    fields: [text('account_slug', 'Account slug', 'my-account')],
  },
  launchdarkly: {
    authMethod: 'API access token (Reader)',
    fields: [text('project_slug', 'Project key', 'default', undefined, false)],
  },
  tailscale: {
    authMethod: 'API access token or OAuth client',
    fields: [text('tailnet', 'Tailnet', 'example.com', 'Your tailnet name (org domain or user).')],
  },
  qualys: {
    authMethod: 'API user (read-only)',
    fields: [url('platform_url', 'Platform URL', 'https://qualysapi.qg2.apps.qualys.com', 'Your Qualys platform (POD) API URL.')],
  },
  rapid7_insightvm: {
    authMethod: 'API key for the Insight platform',
    fields: [text('region', 'Region', 'us', 'InsightVM/Insight platform region: us, eu, ca, au, ap.')],
  },
  nessus: {
    authMethod: 'API keys (access + secret) on the Nessus host',
    fields: [url('scanner_url', 'Nessus URL', 'https://nessus.example.com:8834')],
  },
  openvas: {
    authMethod: 'Credentialed access to the GVM/GVMD host',
    setupHint: 'OpenVAS/Greenbone is self-hosted; the manager endpoint is site-specific.',
    fields: [url('gvm_url', 'GVM manager URL', 'https://gvm.example.com')],
  },
  trivy: {
    authMethod: 'CI output or Trivy server endpoint',
    fields: [url('server_url', 'Trivy server URL', 'https://trivy.example.com', 'Only when running trivy in server mode; otherwise evidence is CI-side.', false)],
  },
  trufflehog: {
    authMethod: 'CI output from the scanning pipeline',
    fields: [text('scan_target', 'Scan target', 'org/*', 'Which repos/paths the pipeline scans.', false)],
  },
  gitleaks: {
    authMethod: 'CI output from the scanning pipeline',
    fields: [text('scan_target', 'Scan target', 'org/*', undefined, false)],
  },
  checkmarx: {
    authMethod: 'OAuth API client for Checkmarx One',
    fields: [url('base_url', 'Checkmarx One URL', 'https://ast.checkmarx.net'), text('tenant', 'Tenant', 'my-tenant')],
  },
  veracode: {
    authMethod: 'API credentials (HMAC id + key), read-only',
    fields: [text('region', 'Region', 'commercial', 'commercial, eu or us-federal region.')],
  },
  sonarqube: {
    authMethod: 'User token (read-only)',
    fields: [url('server_url', 'SonarQube/Cloud URL', 'https://sonarcloud.io'), text('organization', 'Organisation', 'my-org', 'Required for SonarCloud.', false)],
  },
  gitguardian: {
    authMethod: 'Personal/service account API token',
    fields: [url('base_url', 'Base URL', 'https://api.gitguardian.com', 'Self-hosted URL, or leave for SaaS.', false)],
  },
  aqua_security: {
    authMethod: 'API key + secret for the Aqua console',
    fields: [url('console_url', 'Console URL', 'https://cloud.aquasec.com')],
  },
  prisma_cloud: {
    authMethod: 'Access key + secret key for a read-only role',
    fields: [url('api_url', 'API URL', 'https://api.prismacloud.io', 'Your stack-specific api2/api3… URL from the console.')],
  },
  lacework: {
    authMethod: 'API key + secret for the account',
    fields: [url('account_url', 'Account URL', 'https://myaccount.lacework.net')],
  },
  securityscorecard: {
    authMethod: 'API token (read-only)',
    fields: [text('primary_domain', 'Your primary domain', 'example.com', 'SecurityScorecard is keyed on the domain being scored.')],
  },
  bitsight: {
    authMethod: 'API token (read-only)',
    fields: [text('company_guid', 'Company GUID', 'a0b1c2d3-...', 'The rated entity in BitSight.', false)],
  },
  drata: {
    authMethod: 'API key (read-only)',
    fields: [text('workspace', 'Workspace', 'my-company', undefined, false)],
  },
  secureframe: {
    authMethod: 'API key (read-only)',
    fields: [text('company_domain', 'Company domain', 'example.com', undefined, false)],
  },
  hubspot: {
    authMethod: 'Private app token or OAuth app, read-only',
    fields: [text('portal_id', 'Hub (portal) ID', '12345678', 'Numeric HubSpot account the app is installed in.')],
  },
  pipedrive: {
    authMethod: 'API token or OAuth app',
    fields: [text('company_domain', 'Company domain', 'yourco', 'yourco.pipedrive.com — the company subdomain.')],
  },
  copper: {
    authMethod: 'API key + user email',
    fields: [text('account_email', 'Account email', 'admin@example.com')],
  },
  insightly: {
    authMethod: 'API key (per-user)',
    fields: [text('pod', 'Instance pod', 'api.na1', 'Your Insightly API pod, e.g. na1/eu1.', false)],
  },
  close: {
    authMethod: 'API key (read-only)',
    fields: [text('organization_id', 'Organisation ID', 'orga_...', undefined, false)],
  },
  capsule: {
    authMethod: 'OAuth app / personal access token',
    fields: [text('account', 'Account', 'yourco', 'yourco.capsulecrm.com subdomain.')],
  },
  gong: {
    authMethod: 'API key (access key + secret)',
    fields: [url('api_base', 'API base URL', 'https://api.gong.io', 'Region-specific base if not the default.', false)],
  },
  gorgias: {
    authMethod: 'API key + username',
    fields: [text('subdomain', 'Subdomain', 'yourco', 'yourco.gorgias.com.')],
  },
  intercom: {
    authMethod: 'OAuth app / access token',
    fields: [text('app_id', 'App ID', 'abcd1234', undefined, false), text('region', 'Region', 'US', 'US, EU or AU hosting region.', false)],
  },
  xero: {
    authMethod: 'OAuth 2.0 app, read scopes',
    fields: [text('tenant_name', 'Organisation', 'My Company Ltd', 'The Xero organisation the app is authorised against.', false)],
  },
  brex: {
    authMethod: 'API token (read-only)',
    fields: [text('account_scope', 'Accounts in scope', 'All', undefined, false)],
  },
  ramp: {
    authMethod: 'OAuth client (client id + secret), read scopes',
    fields: [text('business_name', 'Business', 'My Company', undefined, false)],
  },
  twilio: {
    authMethod: 'Account SID + auth token (or API key)',
    fields: [text('account_sid', 'Account SID', 'AC...', 'The Twilio account the credentials belong to.')],
  },
  apollo: {
    authMethod: 'API key (read-only)',
    fields: [text('team', 'Team', 'my-team', undefined, false)],
  },
  zoominfo: {
    authMethod: 'API credentials (username + client id)',
    fields: [text('org', 'Organisation', 'my-org', undefined, false)],
  },
  quickbooks: {
    authMethod: 'OAuth 2.0 app (Intuit), read scopes',
    fields: [text('realm_id', 'Company (realm) ID', '1234567890', 'The QuickBooks company id the token is bound to.')],
  },
  anthropic_claude_console: {
    authMethod: 'Admin API key for the organisation',
    fields: [text('organization_id', 'Organisation ID', 'org-...', 'Anthropic Console organisation.', false)],
  },
  openai: {
    authMethod: 'Admin API key (organisation)',
    fields: [text('organization_id', 'Organisation ID', 'org-...', 'OpenAI organisation the key is scoped to.', false)],
  },
  fieldguide: {
    authMethod: 'API token (read-only)',
    fields: [text('workspace', 'Workspace', 'my-firm', undefined, false)],
  },
  vouch_cyber_insurance: {
    authMethod: 'API access / portal export',
    fields: [text('account', 'Account', 'my-company', undefined, false)],
  },
  envoy: {
    authMethod: 'API token (read-only)',
    fields: [text('company_id', 'Company ID', '12345', undefined, false)],
  },
  rockset: {
    authMethod: 'API key (read-only)',
    fields: [text('region', 'Region', 'usw2a1', 'Rockset region for the API endpoint.', false)],
  },
  clockwork: {
    authMethod: 'API token',
    fields: [text('workspace', 'Workspace', 'my-workspace', undefined, false)],
  },
  a_scend: {
    authMethod: 'API token',
    fields: [text('workspace', 'Workspace', 'my-firm', undefined, false)],
  },
  torii: {
    authMethod: 'API key (read-only)',
    fields: [text('workspace', 'Workspace', 'my-org', undefined, false)],
  },
  freshservice: {
    authMethod: 'API key (read-only)',
    fields: [text('domain', 'Domain', 'yourco', 'yourco.freshservice.com subdomain.')],
  },
  onedrive: {
    authMethod: 'Entra ID app registration, Files.Read.All (Graph)',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  sharepoint: {
    authMethod: 'Entra ID app registration, Sites.Read.All (Graph)',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000'), url('root_site', 'Root site URL', 'https://example.sharepoint.com', undefined, false)],
  },
  miro: {
    authMethod: 'OAuth app / REST token',
    fields: [text('team_id', 'Team ID', '3458764...', undefined, false)],
  },
  isolved: {
    authMethod: 'API credentials for iSolved People Cloud',
    fields: [text('client_id', 'Client / tenant', 'my-company', undefined, false)],
  },
  payfit: {
    authMethod: 'OAuth app / API key',
    fields: [text('company_id', 'Company ID', 'comp-...', undefined, false)],
  },
  square_payroll: {
    authMethod: 'OAuth app (Square), read scopes',
    fields: [text('merchant_id', 'Merchant ID', 'ML...', 'The Square merchant the payroll belongs to.')],
  },
  kenjo: {
    authMethod: 'API key (read-only)',
    fields: [text('subdomain', 'Subdomain', 'yourco', 'yourco.kenjo.io.')],
  },
  netsuite: {
    authMethod: 'Token-based auth (TBA) for a read-only role',
    fields: [text('account_id', 'Account ID', '1234567', 'NetSuite account (realm) id.')],
  },
  justworks: {
    authMethod: 'API access / export',
    fields: [text('company', 'Company', 'my-company', undefined, false)],
  },
  factorial: {
    authMethod: 'API key (read-only)',
    fields: [text('company_id', 'Company ID', '12345', undefined, false)],
  },
  charthop: {
    authMethod: 'API token (read-only)',
    fields: [text('org_id', 'Organisation ID', 'org_...', undefined, false)],
  },
  humaans: {
    authMethod: 'API token (read-only)',
    fields: [text('company', 'Company', 'yourco', 'yourco.humaans.io subdomain.', false)],
  },
  proliant: {
    authMethod: 'API credentials',
    fields: [text('company_id', 'Company ID', '12345', undefined, false)],
  },
  alexishr: {
    authMethod: 'API key (read-only)',
    fields: [text('subdomain', 'Subdomain', 'yourco', undefined, false)],
  },
  deel: {
    authMethod: 'API token (read-only)',
    fields: [text('organization', 'Organisation', 'my-org', undefined, false)],
  },
  hibob: {
    authMethod: 'Service user API token, read-only',
    fields: [text('company_id', 'Company', 'my-company', 'Your HiBob company identifier.', false)],
  },
  personio: {
    authMethod: 'Client id + client secret, read-only',
    fields: [text('company_id', 'Company ID', '12345', 'Personio company id from the API credentials page.')],
  },
  trinet: {
    authMethod: 'API access / export',
    fields: [text('company_id', 'Company ID', '12345', undefined, false)],
  },
  rippling: {
    authMethod: 'API key (custom app), read scopes',
    fields: [text('company', 'Company', 'my-company', undefined, false)],
  },
  bamboohr: {
    authMethod: 'API key (per-user), read-only',
    fields: [text('subdomain', 'Subdomain', 'yourco', 'yourco.bamboohr.com — the company subdomain.')],
  },
  gusto: {
    authMethod: 'OAuth 2.0 app, read scopes',
    fields: [text('company_id', 'Company ID', 'comp_...', 'The Gusto company the token is authorised for.', false)],
  },
  employment_hero: {
    authMethod: 'OAuth app / API key',
    fields: [text('organisation_id', 'Organisation ID', '12345', undefined, false)],
  },
  '7shifts': {
    authMethod: 'Access token (read-only)',
    fields: [text('company_id', 'Company ID', '12345', undefined, false)],
  },
  adp_workforce_now: {
    authMethod: 'ADP API client (cert-based), read scopes',
    fields: [text('client_id', 'Client ID', 'abcd-1234', 'Registered ADP API client id.')],
  },
  ukg: {
    authMethod: 'API credentials for UKG Pro/Ready',
    fields: [url('base_url', 'Service URL', 'https://serviceX.ultipro.com', 'Your UKG Pro service/tenant URL.')],
  },
  paychex: {
    authMethod: 'OAuth app (Paychex), read scopes',
    fields: [text('client_id', 'Client ID', 'abcd1234', undefined, false)],
  },
  adp: {
    authMethod: 'ADP API client (cert-based), read scopes',
    fields: [text('client_id', 'Client ID', 'abcd-1234')],
  },
  sap_successfactors: {
    authMethod: 'OAuth / basic auth for OData, read-only',
    fields: [text('company_id', 'Company ID', 'myCompany', 'SuccessFactors company (tenant) id.'), url('api_server', 'API server', 'https://api4.successfactors.com', 'Your data-center API server.', false)],
  },
  oracle_cloud: {
    authMethod: 'API signing key for a read-only IAM user',
    fields: [text('tenancy_ocid', 'Tenancy OCID', 'ocid1.tenancy.oc1..', 'The OCI tenancy the connection covers.'), text('region', 'Home region', 'us-ashburn-1', undefined, false)],
  },
  digitalocean: {
    authMethod: 'Personal access token (read scope)',
    fields: [text('team', 'Team', 'my-team', undefined, false)],
  },
  vercel: {
    authMethod: 'Access token (read-only)',
    fields: [text('team_id', 'Team ID', 'team_...', undefined, false)],
  },
  netlify: {
    authMethod: 'Personal access token (read-only)',
    fields: [text('account_slug', 'Team slug', 'my-team', undefined, false)],
  },
  scaleway: {
    authMethod: 'API key (read-only) for an organisation',
    fields: [text('organization_id', 'Organisation ID', 'a0b1c2d3-...')],
  },
  supabase: {
    authMethod: 'Management API token / service role, read-only',
    fields: [text('project_ref', 'Project ref', 'abcdefghijklmnop', 'The 20-char project reference.')],
  },
  ovhcloud: {
    authMethod: 'Application key/secret + consumer key',
    fields: [text('endpoint', 'Endpoint', 'ovh-eu', 'API endpoint: ovh-eu, ovh-us, ovh-ca.')],
  },
  heroku: {
    authMethod: 'API token (read-only)',
    fields: [text('team', 'Team / enterprise', 'my-team', undefined, false)],
  },
  akamai: {
    authMethod: 'API client credentials (EdgeGrid)',
    fields: [url('api_host', 'API host', 'https://akab-....luna.akamaiapis.net', 'Your EdgeGrid host.')],
  },
  render: {
    authMethod: 'API key (read-only)',
    fields: [text('owner_id', 'Owner / team ID', 'tea-...', undefined, false)],
  },
  mongodb_atlas: {
    authMethod: 'Programmatic API key (public + private), read-only',
    fields: [text('org_id', 'Organisation ID', '5f...', 'Atlas organisation the key belongs to.')],
  },
  mongodb_atlas_for_government: {
    authMethod: 'Programmatic API key on the AtlasGov endpoint',
    setupHint: 'AtlasGov uses cloud.mongodbgov.com — a separate control plane.',
    fields: [text('org_id', 'Organisation ID', '5f...')],
  },
  ibm_cloud: {
    authMethod: 'IAM API key (read-only)',
    fields: [text('account_id', 'Account ID', 'a0b1c2d3...', undefined, false)],
  },
  alibaba_cloud: {
    authMethod: 'RAM user AccessKey (read-only)',
    fields: [text('account_id', 'Account ID', '1234567890', 'The Alibaba Cloud account (uid).'), text('region', 'Region', 'cn-hangzhou', undefined, false)],
  },
  kubernetes: {
    authMethod: 'Read-only service account kubeconfig / token',
    fields: [url('api_server', 'API server', 'https://k8s.example.com:6443'), text('cluster_name', 'Cluster name', 'prod-cluster', undefined, false)],
  },
  docker_hub: {
    authMethod: 'Personal access token (read-only)',
    fields: [text('namespace', 'Organisation / namespace', 'myorg')],
  },
  openai_azure_openai: {
    authMethod: 'Entra ID app / API key for the Azure OpenAI resource',
    fields: [text('resource_name', 'Resource name', 'my-aoai', 'The Azure OpenAI resource; endpoint is <name>.openai.azure.com.'), text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000', undefined, false)],
  },
  aws_bedrock: {
    authMethod: 'Cross-account IAM role (STS) with Bedrock read scopes',
    fields: [text('account_id', 'AWS account ID', '123456789012'), text('regions', 'Regions in scope', 'us-east-1', undefined, false)],
  },
  google_cloud_vertex_ai: {
    authMethod: 'Service account with Vertex AI Viewer',
    fields: [text('project_id', 'Project ID', 'my-project-1234'), text('location', 'Location', 'us-central1', undefined, false)],
  },
  anthropic_claude_api: {
    authMethod: 'Admin API key (organisation)',
    fields: [text('organization_id', 'Organisation ID', 'org-...', 'Anthropic organisation the key is scoped to.', false)],
  },
  langsmith_langfuse: {
    authMethod: 'API key (read-only)',
    fields: [url('host', 'Host', 'https://api.smith.langchain.com', 'Your LangSmith/Langfuse host (self-hosted or region).', false), text('project', 'Project', 'default', undefined, false)],
  },
  arize_ai_phoenix: {
    authMethod: 'API key (read-only)',
    fields: [text('space_id', 'Space ID', 'U3BhY2U6...', undefined, false)],
  },
  weights_biases_w_b: {
    authMethod: 'API key (service account)',
    fields: [url('host', 'Host', 'https://api.wandb.ai', 'Self-hosted URL, or leave for SaaS.', false), text('entity', 'Entity (team)', 'my-team')],
  },
  pinecone: {
    authMethod: 'API key (read-only)',
    fields: [text('project_id', 'Project ID', 'abcdef', 'Pinecone project the key belongs to.'), text('environment', 'Environment', 'us-east-1-aws', undefined, false)],
  },
  weaviate: {
    authMethod: 'API key for the cluster',
    fields: [url('cluster_url', 'Cluster URL', 'https://my-cluster.weaviate.network')],
  },
  lakera_protect_ai: {
    authMethod: 'API key (read-only)',
    fields: [text('project', 'Project', 'my-project', undefined, false)],
  },
  hiddenlayer: {
    authMethod: 'API client credentials (read-only)',
    fields: [text('tenant', 'Tenant', 'my-org', undefined, false)],
  },
  hugging_face_enterprise: {
    authMethod: 'Access token (read) for the organisation',
    fields: [text('organization', 'Organisation', 'my-org', 'The Hugging Face org the token is scoped to.')],
  },
  github_copilot: {
    authMethod: 'GitHub App / PAT with Copilot admin read',
    fields: [text('organization', 'Organisation', 'my-org', 'The GitHub org whose Copilot usage is read.')],
  },
  cursor_codeium: {
    authMethod: 'Admin API key / team export',
    fields: [text('team', 'Team', 'my-team', undefined, false)],
  },
  miradore: {
    authMethod: 'API key (read-only)',
    fields: [text('site', 'Site', 'yourco', 'yourco.online.miradore.com subdomain.', false)],
  },
  ninjaone: {
    authMethod: 'OAuth client (client id + secret), read scopes',
    fields: [text('region', 'Region', 'app', 'Instance region: app (US), eu, oc, ca.')],
  },
  manageengine: {
    authMethod: 'API auth token for Endpoint Central',
    fields: [url('server_url', 'Server URL', 'https://endpointcentral.example.com')],
  },
  jamf_pro: {
    authMethod: 'API client (roles) or API user, read-only',
    fields: [url('instance_url', 'Jamf Pro URL', 'https://yourco.jamfcloud.com')],
  },
  addigy: {
    authMethod: 'API credentials (account + user token)',
    fields: [text('org', 'Organisation', 'my-org', undefined, false)],
  },
  kandji_iru: {
    authMethod: 'API token (read-only)',
    fields: [url('subdomain_url', 'API URL', 'https://yourco.api.kandji.io')],
  },
  microsoft_intune_gcc_high: {
    authMethod: 'Entra ID app registration on US Government cloud (Graph)',
    fields: [text('tenant_id', 'Directory (tenant) ID', '00000000-0000-0000-0000-000000000000')],
  },
  omnissa_workspace_one: {
    authMethod: 'API key (aw-tenant-code) + admin, read-only',
    fields: [url('api_url', 'API URL', 'https://asXXX.awmdm.com')],
  },
  jumpcloud_mdm: {
    authMethod: 'API key (read-only)',
    fields: [text('org_id', 'Organisation ID', '5f...', undefined, false)],
  },
  vmware_workspace_one: {
    authMethod: 'API key (aw-tenant-code) + admin, read-only',
    fields: [url('api_url', 'API URL', 'https://asXXX.awmdm.com')],
  },
  hexnode: {
    authMethod: 'API access token',
    fields: [text('subdomain', 'Subdomain', 'yourco', 'yourco.hexnodemdm.com.')],
  },
  mosyle: {
    authMethod: 'API token (read-only)',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  fleetdm: {
    authMethod: 'API token for a read-only user',
    fields: [url('server_url', 'Fleet URL', 'https://fleet.example.com')],
  },
  onelogin: {
    authMethod: 'API credentials (client id + secret), read',
    fields: [url('subdomain_url', 'Subdomain URL', 'https://yourco.onelogin.com')],
  },
  pingone: {
    authMethod: 'Worker app (client credentials) read scopes',
    fields: [text('environment_id', 'Environment ID', '00000000-0000-0000-0000-000000000000'), text('region', 'Region', 'com', 'Tenant region tld: com, eu, asia, ca.', false)],
  },
  jumpcloud: {
    authMethod: 'API key (read-only)',
    fields: [text('org_id', 'Organisation ID', '5f...', undefined, false)],
  },
  keeper: {
    authMethod: 'Service account / Commander with read scope',
    fields: [text('enterprise_id', 'Enterprise', 'my-org', undefined, false)],
  },
  auth0: {
    authMethod: 'Management API app (client credentials) read scopes',
    fields: [url('tenant_domain', 'Tenant domain', 'https://yourco.us.auth0.com')],
  },
  duo: {
    authMethod: 'Admin API integration (ikey + skey)',
    fields: [url('api_hostname', 'API hostname', 'https://api-xxxxxxxx.duosecurity.com')],
  },
  '1password_device_trust_kolide': {
    authMethod: 'API token (read-only)',
    fields: [text('organization', 'Organisation', 'my-org', undefined, false)],
  },
  cyberark: {
    authMethod: 'API credentials for the tenant',
    fields: [url('tenant_url', 'Tenant URL', 'https://yourco.privilegecloud.cyberark.cloud')],
  },
  sailpoint: {
    authMethod: 'Personal access token (client id + secret)',
    fields: [url('tenant_url', 'Tenant URL', 'https://yourco.api.identitynow.com')],
  },
  ping_identity: {
    authMethod: 'Worker app (client credentials) read scopes',
    fields: [text('environment_id', 'Environment ID', '00000000-0000-0000-0000-000000000000')],
  },
  one_identity: {
    authMethod: 'API credentials for the instance',
    fields: [url('instance_url', 'Instance URL', 'https://oneidentity.example.com')],
  },
  breezy_hr: {
    authMethod: 'API key (per-company)',
    fields: [text('company_id', 'Company ID', 'abcd1234', undefined, false)],
  },
  cats: {
    authMethod: 'API key (read-only)',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  jobvite: {
    authMethod: 'API credentials (api key + secret)',
    fields: [text('company_id', 'Company ID', 'abcd', undefined, false)],
  },
  smartrecruiters: {
    authMethod: 'API key (read-only)',
    fields: [text('company_id', 'Company ID', 'abcd', undefined, false)],
  },
  teamtailor: {
    authMethod: 'API key (read-only)',
    fields: [text('subdomain', 'Subdomain', 'yourco', 'yourco.teamtailor.com.', false)],
  },
  jobadder: {
    authMethod: 'OAuth 2.0 app, read scopes',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  lever: {
    authMethod: 'API key or OAuth app, read scopes',
    fields: [text('account', 'Account', 'yourco', 'Lever account (subdomain).', false)],
  },
  comeet: {
    authMethod: 'API token (company uid + token)',
    fields: [text('company_uid', 'Company UID', 'abcd-1234')],
  },
  certn: {
    authMethod: 'API key (read-only)',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  checkr: {
    authMethod: 'API key (read-only)',
    fields: [text('account_id', 'Account ID', 'abcd1234', undefined, false)],
  },
  teamwork: {
    authMethod: 'API token (read-only)',
    fields: [text('site', 'Site', 'yourco', 'yourco.teamwork.com.')],
  },
  linear: {
    authMethod: 'API key or OAuth app, read scopes',
    fields: [text('workspace', 'Workspace', 'my-org', 'Linear workspace the key is scoped to.', false)],
  },
  clickup: {
    authMethod: 'Personal / OAuth token, read',
    fields: [text('workspace_id', 'Workspace (team) ID', '1234567', undefined, false)],
  },
  monday_com: {
    authMethod: 'API token (read-only)',
    fields: [text('account_slug', 'Account slug', 'yourco', 'yourco.monday.com.', false)],
  },
  basecamp: {
    authMethod: 'OAuth 2.0 app, read',
    fields: [text('account_id', 'Account ID', '1234567', 'The Basecamp account (used in the API base path).')],
  },
  smartsheet: {
    authMethod: 'API access token (read-only)',
    fields: [text('workspace', 'Workspace', 'my-workspace', undefined, false)],
  },
  confluence_access_control: {
    authMethod: 'API token + Atlassian account email',
    fields: [url('site_url', 'Site URL', 'https://yourco.atlassian.net')],
  },
  knowbe4: {
    authMethod: 'Reporting API token',
    fields: [text('region', 'Region', 'us', 'KnowBe4 region: us, eu, ca, uk, de.')],
  },
  udemy_business: {
    authMethod: 'API credentials (client id + secret)',
    fields: [text('account', 'Account', 'yourco', 'yourco.udemy.com.')],
  },
  wizer: {
    authMethod: 'API token (read-only)',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  mimecast: {
    authMethod: 'API application (client id + secret), read',
    fields: [text('region', 'Region', 'us', 'Mimecast region for the API base URL.')],
  },
  docebo: {
    authMethod: 'OAuth app, read scopes',
    fields: [url('domain', 'Domain', 'https://yourco.docebosaas.com')],
  },
  cybeready: {
    authMethod: 'API token (read-only)',
    fields: [text('account', 'Account', 'my-org', undefined, false)],
  },
  confluence: {
    authMethod: 'API token + Atlassian account email, read',
    fields: [url('site_url', 'Site URL', 'https://yourco.atlassian.net/wiki')],
  },
  docusign: {
    authMethod: 'JWT / OAuth app, read scopes',
    fields: [text('account_id', 'Account ID', 'a0b1c2d3-...'), text('base_uri', 'Base URI', 'na4', 'Your DocuSign account base (e.g. na4, eu).', false)],
  },
  webex: {
    authMethod: 'OAuth integration / service app, read',
    fields: [text('org_id', 'Organisation ID', 'Y2lzY29z...', undefined, false)],
  },
  calendly: {
    authMethod: 'Personal access token / OAuth, read',
    fields: [text('organization', 'Organisation URI', 'my-org', undefined, false)],
  },
  elastic_security: {
    authMethod: 'API key for a read-only role',
    fields: [url('kibana_url', 'Kibana URL', 'https://myco.kb.us-central1.gcp.cloud.es.io')],
  },
  google_chronicle: {
    authMethod: 'Service account with Chronicle API read',
    fields: [text('customer_id', 'Customer ID', '00000000-0000-0000-0000-000000000000'), text('region', 'Region', 'us', undefined, false)],
  },
  logrhythm: {
    authMethod: 'API token for the platform',
    fields: [url('api_url', 'API URL', 'https://logrhythm.example.com')],
  },
  graylog: {
    authMethod: 'API token for a read-only user',
    fields: [url('server_url', 'Graylog URL', 'https://graylog.example.com')],
  },
  jenkins: {
    authMethod: 'API token for a read-only user',
    fields: [url('server_url', 'Jenkins URL', 'https://jenkins.example.com')],
  },
  circleci: {
    authMethod: 'Personal API token (read-only)',
    fields: [text('org_slug', 'Org slug', 'gh/my-org', 'VCS-qualified org, e.g. gh/my-org.')],
  },
  gitlab_ci_cd: {
    authMethod: 'Project/group access token, read scopes',
    fields: [url('instance_url', 'GitLab URL', 'https://gitlab.com'), text('group', 'Group or project', 'my-group', undefined, false)],
  },
  bitbucket_pipelines: {
    authMethod: 'App password / OAuth, read scopes',
    fields: [text('workspace', 'Workspace', 'my-workspace', 'Bitbucket workspace id.')],
  },
  aws_secrets_manager: {
    authMethod: 'Cross-account IAM role (STS) with read-only Secrets Manager',
    fields: [text('account_id', 'AWS account ID', '123456789012'), text('regions', 'Regions in scope', 'us-east-1', undefined, false)],
  },
  bitwarden: {
    authMethod: 'Organisation API key (client id + secret)',
    fields: [text('organization_id', 'Organisation ID', 'a0b1c2d3-...'), url('base_url', 'Base URL', 'https://vault.bitwarden.com', 'Self-hosted/EU URL, or leave for US SaaS.', false)],
  },
  azure_devops: {
    authMethod: 'Entra ID app / PAT with read scopes',
    fields: [url('org_url', 'Organisation URL', 'https://dev.azure.com/my-org')],
  },

}

/** The profile for a slug, or undefined when we have no verified one. */
export function getProductProfile(slug: string): ProductProfile | undefined {
  return PRODUCT_PROFILES[slug]
}
