// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Coverage gate for the integration catalogue's "real connect" surface.
//
// The product owner's requirement: every catalogued evidence source opens a
// real, product-specific connect form (like AWS), never the generic
// "tenant / workspace / account" fallback. This test pins that — every slug in
// the seeded catalogue (supabase/migrations/20260825000002) must resolve to
// EITHER a shipped adapter (INTEGRATIONS) or a verified product profile
// (PRODUCT_PROFILES). A new catalogue row with no profile fails CI here, which
// is where the gap should surface — not in front of an operator.
//
// CATALOGUE_SLUGS is generated from the seed; regenerate if the seed changes.

import { describe, it, expect } from 'vitest'
import { PRODUCT_PROFILES } from '../productProfiles'
import { INTEGRATIONS } from '../index'

const CATALOGUE_SLUGS = [
  'isolved',
  'payfit',
  'square_payroll',
  'kenjo',
  'netsuite',
  'justworks',
  'factorial',
  'charthop',
  'humaans',
  'proliant',
  'alexishr',
  'deel',
  'hibob',
  'workday',
  'personio',
  'trinet',
  'rippling',
  'bamboohr',
  'gusto',
  'employment_hero',
  '7shifts',
  'adp_workforce_now',
  'github',
  'gitlab_cloud',
  'gitlab_self_managed',
  'azure_devops',
  'google_workspace',
  'microsoft_entra_id',
  'microsoft_entra_id_gcc_high',
  'okta',
  'onelogin',
  'pingone',
  'jumpcloud',
  'keeper',
  'auth0',
  'duo',
  '1password',
  '1password_device_trust_kolide',
  'jira',
  'teamwork',
  'zendesk',
  'linear',
  'asana',
  'clickup',
  'servicenow',
  'monday_com',
  'basecamp',
  'smartsheet',
  'confluence_access_control',
  'aws',
  'microsoft_azure',
  'google_cloud_platform',
  'oracle_cloud',
  'digitalocean',
  'vercel',
  'netlify',
  'scaleway',
  'supabase',
  'ovhcloud',
  'heroku',
  'akamai',
  'snowflake',
  'render',
  'mongodb_atlas',
  'mongodb_atlas_for_government',
  'miradore',
  'ninjaone',
  'manageengine',
  'jamf_pro',
  'addigy',
  'kandji_iru',
  'microsoft_intune',
  'microsoft_intune_gcc_high',
  'omnissa_workspace_one',
  'jumpcloud_mdm',
  'sentinelone',
  'orca_security',
  'tenable',
  'tenable_vulnerability_management_fedramp',
  'microsoft_defender_for_endpoint',
  'microsoft_defender_for_endpoint_gcc_high',
  'semgrep',
  'wiz',
  'snyk',
  'crowdstrike',
  'aikido',
  'datadog',
  'splunk',
  'splunk_enterprise',
  'sumo_logic',
  'grafana',
  'new_relic',
  'sentry',
  'rollbar',
  'launchdarkly',
  'tailscale',
  'knowbe4',
  'udemy_business',
  'wizer',
  'mimecast',
  'docebo',
  'cybeready',
  'google_drive',
  'microsoft_sharepoint',
  'confluence',
  'notion',
  'box',
  'docusign',
  'slack',
  'microsoft_teams',
  'zoom',
  'webex',
  'calendly',
  'salesforce',
  'hubspot',
  'pipedrive',
  'copper',
  'insightly',
  'close',
  'capsule',
  'gong',
  'gorgias',
  'intercom',
  'xero',
  'brex',
  'ramp',
  'twilio',
  'apollo',
  'zoominfo',
  'quickbooks',
  'breezy_hr',
  'cats',
  'jobvite',
  'smartrecruiters',
  'teamtailor',
  'jobadder',
  'lever',
  'comeet',
  'certn',
  'checkr',
  'anthropic_claude_console',
  'openai',
  'fieldguide',
  'vouch_cyber_insurance',
  'envoy',
  'rockset',
  'clockwork',
  'a_scend',
  'torii',
  'ibm_cloud',
  'alibaba_cloud',
  'cloudflare',
  'kubernetes',
  'docker_hub',
  'github_actions',
  'cyberark',
  'sailpoint',
  'ping_identity',
  'one_identity',
  'google_cloud_identity',
  'vmware_workspace_one',
  'hexnode',
  'mosyle',
  'fleetdm',
  'qualys',
  'rapid7_insightvm',
  'nessus',
  'openvas',
  'trivy',
  'trufflehog',
  'gitleaks',
  'checkmarx',
  'veracode',
  'sonarqube',
  'gitguardian',
  'aqua_security',
  'prisma_cloud',
  'lacework',
  'securityscorecard',
  'bitsight',
  'drata',
  'secureframe',
  'elastic_security',
  'microsoft_sentinel',
  'google_chronicle',
  'logrhythm',
  'graylog',
  'freshservice',
  'jira_service_management',
  'ukg',
  'paychex',
  'adp',
  'sap_successfactors',
  'dropbox',
  'onedrive',
  'sharepoint',
  'miro',
  'hashicorp_vault',
  'aws_secrets_manager',
  'azure_key_vault',
  'bitwarden',
  'jenkins',
  'circleci',
  'gitlab_ci_cd',
  'bitbucket_pipelines',
  'openai_azure_openai',
  'aws_bedrock',
  'google_cloud_vertex_ai',
  'anthropic_claude_api',
  'langsmith_langfuse',
  'arize_ai_phoenix',
  'weights_biases_w_b',
  'pinecone',
  'weaviate',
  'lakera_protect_ai',
  'hiddenlayer',
  'hugging_face_enterprise',
  'github_copilot',
  'cursor_codeium',
] as const

const SECRETY = /token|secret|password|key|credential/i

describe('integration catalogue — every product has a real connect form', () => {
  const adapterSlugs = new Set(INTEGRATIONS.map(c => c.id))
  const profileSlugs = new Set(Object.keys(PRODUCT_PROFILES))

  it('covers every catalogue slug with an adapter or a product profile', () => {
    const uncovered = CATALOGUE_SLUGS.filter(
      s => !adapterSlugs.has(s) && !profileSlugs.has(s),
    )
    expect(uncovered, `uncovered catalogue slugs: ${uncovered.join(', ')}`).toEqual([])
  })

  it('catalogues at least 217 evidence sources', () => {
    expect(CATALOGUE_SLUGS.length).toBeGreaterThanOrEqual(217)
  })

  it('never asks for a secret in a product profile (identity & scope only)', () => {
    for (const [slug, profile] of Object.entries(PRODUCT_PROFILES)) {
      for (const f of profile.fields) {
        expect(f.type, `${slug}/${f.id}`).not.toBe('password')
        expect(f.id, `${slug}/${f.id}`).not.toMatch(SECRETY)
      }
      expect(profile.authMethod.length, slug).toBeGreaterThan(0)
      expect(profile.fields.length, slug).toBeGreaterThan(0)
    }
  })

  it('every profile slug exists in the catalogue (no dead profiles)', () => {
    const catalogue = new Set<string>(CATALOGUE_SLUGS)
    const dead = Object.keys(PRODUCT_PROFILES).filter(s => !catalogue.has(s))
    expect(dead, `profiles for non-catalogue slugs: ${dead.join(', ')}`).toEqual([])
  })
})
