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
}

/** The profile for a slug, or undefined when we have no verified one. */
export function getProductProfile(slug: string): ProductProfile | undefined {
  return PRODUCT_PROFILES[slug]
}
