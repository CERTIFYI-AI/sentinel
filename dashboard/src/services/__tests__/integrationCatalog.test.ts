// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Tests for the integration catalogue and evidence helpers.
//
// The load-bearing assertion is `isConnectable`: it is the single gate that
// stops the UI offering a Connect button for a product with no adapter behind
// it. If it ever returns true for a 'catalogued' entry, the product starts
// promising evidence collection that cannot happen.

import { describe, it, expect } from 'vitest'

import {
  isConnectable,
  adapterStatusLabel,
  catalogCategories,
  countByCategory,
  connectableCount,
  filterCatalog,
  reconcileWithServer,
  sanitizeDocsHint,
  sanitizeConnectSteps,
  COMPETITOR_GRC_SLUGS,
  type CatalogEntry,
} from '../integrationCatalogService'
import { INTEGRATIONS, getIntegrationConfig } from '@/integrations'
import {
  rankFindings,
  evidencePosture,
  countByStatus,
  type IntegrationFinding,
} from '../integrationFindingsService'

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  slug: 'github',
  name: 'GitHub',
  category: 'code',
  whyNeeded: 'Repositories, branch rules, PRs, reviews, commits, membership.',
  evidencePull: 'REST API / OAuth app with read scopes.',
  connectSteps: '1) Admin opens Integrations…',
  evidenceMapping: 'Maps change management and access review evidence.',
  docsHint: 'https://docs.github.com',
  tier: 1,
  adapterStatus: 'available',
  ...over,
})

const finding = (over: Partial<IntegrationFinding> = {}): IntegrationFinding => ({
  id: 'f1',
  integrationId: 'i1',
  checkId: 'github.org.mfa_required',
  title: 'Organization requires MFA',
  description: 'All members must have two-factor authentication enabled.',
  remediation: 'Enable "Require two-factor authentication" in org settings.',
  status: 'PASSED',
  severity: 'HIGH',
  checkCategory: 'mfa_enforcement',
  collectedAt: '2026-08-18T00:00:00Z',
  ...over,
})

describe('isConnectable — the capability gate', () => {
  it('allows a shipped adapter', () => {
    expect(isConnectable(entry({ adapterStatus: 'available' }))).toBe(true)
  })

  it('allows a beta adapter', () => {
    expect(isConnectable(entry({ adapterStatus: 'beta' }))).toBe(true)
  })

  it('NEVER allows a catalogued-only product', () => {
    // The whole point: no adapter means no collection, so no Connect button.
    expect(isConnectable(entry({ adapterStatus: 'catalogued' }))).toBe(false)
  })
})

describe('catalogue helpers', () => {
  it('labels each adapter status', () => {
    expect(adapterStatusLabel('available')).toBe('Available')
    expect(adapterStatusLabel('beta')).toBe('Beta')
    expect(adapterStatusLabel('catalogued')).toBe('Catalogued')
  })

  it('lists distinct categories alphabetically', () => {
    const list = [
      entry({ slug: 'a', category: 'security' }),
      entry({ slug: 'b', category: 'code' }),
      entry({ slug: 'c', category: 'security' }),
    ]
    expect(catalogCategories(list)).toEqual(['code', 'security'])
  })

  it('counts entries per category', () => {
    const list = [
      entry({ slug: 'a', category: 'security' }),
      entry({ slug: 'b', category: 'code' }),
      entry({ slug: 'c', category: 'security' }),
    ]
    expect(countByCategory(list)).toEqual({ security: 2, code: 1 })
  })

  it('counts only what can actually be connected', () => {
    const list = [
      entry({ slug: 'a', adapterStatus: 'available' }),
      entry({ slug: 'b', adapterStatus: 'beta' }),
      entry({ slug: 'c', adapterStatus: 'catalogued' }),
      entry({ slug: 'd', adapterStatus: 'catalogued' }),
    ]
    expect(connectableCount(list)).toBe(2)
    expect(list.length).toBe(4)
  })
})

describe('filterCatalog', () => {
  const list = [
    entry({ slug: 'github', name: 'GitHub', category: 'code' }),
    entry({ slug: 'okta', name: 'Okta', category: 'identity', whyNeeded: 'MFA and SSO posture.' }),
    entry({ slug: 'aws', name: 'AWS', category: 'cloud', evidencePull: 'IAM via role assumption.' }),
  ]

  it('returns everything with no filter', () => {
    expect(filterCatalog(list)).toHaveLength(3)
  })

  it('filters by category', () => {
    expect(filterCatalog(list, { category: 'identity' }).map(e => e.slug)).toEqual(['okta'])
  })

  it('matches on name and slug, case-insensitively', () => {
    expect(filterCatalog(list, { query: 'GITHUB' }).map(e => e.slug)).toEqual(['github'])
    expect(filterCatalog(list, { query: 'okta' }).map(e => e.slug)).toEqual(['okta'])
  })

  it('searches the operator prose, not just the name', () => {
    // "which of these gives me MFA evidence?" is the question this answers.
    expect(filterCatalog(list, { query: 'mfa' }).map(e => e.slug)).toEqual(['okta'])
    expect(filterCatalog(list, { query: 'role assumption' }).map(e => e.slug)).toEqual(['aws'])
  })

  it('combines category and query', () => {
    expect(filterCatalog(list, { category: 'code', query: 'okta' })).toEqual([])
  })

  it('returns nothing for an unmatched term', () => {
    expect(filterCatalog(list, { query: 'zzzz-not-a-product' })).toEqual([])
  })
})

describe('findings helpers', () => {
  it('ranks failures first, then warnings, then by severity', () => {
    const list = [
      finding({ id: 'p', status: 'PASSED', severity: 'CRITICAL' }),
      finding({ id: 'w', status: 'WARNING', severity: 'LOW' }),
      finding({ id: 'f-low', status: 'FAILED', severity: 'LOW' }),
      finding({ id: 'f-crit', status: 'FAILED', severity: 'CRITICAL' }),
    ]
    expect(rankFindings(list).map(f => f.id)).toEqual(['f-crit', 'f-low', 'w', 'p'])
  })

  it('does not mutate its input', () => {
    const list = [finding({ id: 'a', status: 'PASSED' }), finding({ id: 'b', status: 'FAILED' })]
    rankFindings(list)
    expect(list.map(f => f.id)).toEqual(['a', 'b'])
  })

  it('reports null posture when nothing was collected', () => {
    // Must render as "—", never as a passing or failing verdict.
    expect(evidencePosture([])).toBeNull()
  })

  it('reports failing when any check failed', () => {
    expect(evidencePosture([finding({ status: 'PASSED' }), finding({ status: 'FAILED' })])).toBe(
      'failing',
    )
  })

  it('reports attention on a warning with no failure', () => {
    expect(evidencePosture([finding({ status: 'PASSED' }), finding({ status: 'WARNING' })])).toBe(
      'attention',
    )
  })

  it('reports passing only when checks passed and none failed or warned', () => {
    expect(evidencePosture([finding({ status: 'PASSED' })])).toBe('passing')
  })

  it('treats an all-unavailable set as no posture', () => {
    expect(evidencePosture([finding({ status: 'NOT_AVAILABLE' })])).toBeNull()
  })

  it('counts by status with every key present', () => {
    const counts = countByStatus([finding({ status: 'FAILED' }), finding({ status: 'PASSED' })])
    expect(counts).toEqual({ PASSED: 1, FAILED: 1, WARNING: 0, NOT_AVAILABLE: 0 })
  })
})


describe('third-party GRC references', () => {
  // The seeded catalogue pointed 163 rows at a competitor's help centre, and a
  // migration clears them. This mirror exists because the frontend and the
  // database deploy separately: without it the text survives every frontend
  // release until someone remembers to run migrations.
  it('drops a docs hint naming a competing GRC platform', () => {
    expect(
      sanitizeDocsHint(
        "Vanta Help Center → Cloud / Infrastructure → search exact product 'AWS'. "
        + 'https://help.vanta.com/en/collections/18953623-cloud-providers',
      ),
    ).toBeNull()
    expect(sanitizeDocsHint('Drata integration guide')).toBeNull()
    expect(sanitizeDocsHint('See Secureframe for details')).toBeNull()
  })

  it('keeps a genuine provider documentation pointer', () => {
    expect(sanitizeDocsHint('https://docs.github.com')).toBe('https://docs.github.com')
    expect(sanitizeDocsHint('AWS IAM User Guide → MFA')).toBe('AWS IAM User Guide → MFA')
  })

  it('treats blank and missing hints alike so the UI omits the line', () => {
    expect(sanitizeDocsHint(null)).toBeNull()
    expect(sanitizeDocsHint(undefined)).toBeNull()
    expect(sanitizeDocsHint('   ')).toBeNull()
  })

  it('rewrites a connection step that sends the operator to another product', () => {
    // Three seeded rows instructed the reader to enter the key "in Vanta" —
    // an instruction someone may actually follow, not merely a reference.
    expect(
      sanitizeConnectSteps('Add Anthropic Organization Admin API Token (Read-only) in Vanta.'),
    ).toBe('Add Anthropic Organization Admin API Token (Read-only) in Sentinel.')
    expect(
      sanitizeConnectSteps('Provide API Service Key or configure automated webhook export to Vanta ingestion queue.'),
    ).toBe('Provide API Service Key or configure automated webhook export to the Sentinel evidence ingestion queue.')
  })

  it('leaves every other connection step exactly as written', () => {
    // The provider-specific facts in these steps come from the source
    // workbook; rewriting them would be inventing instructions.
    const steps = '1) Admin opens Integrations. 2) Grants least-privilege read scope.'
    expect(sanitizeConnectSteps(steps)).toBe(steps)
    expect(sanitizeConnectSteps(null)).toBeNull()
    expect(sanitizeConnectSteps('  ')).toBeNull()
  })

  it('lists the competitor slugs the catalogue must not carry', () => {
    expect(COMPETITOR_GRC_SLUGS).toContain('vanta')
    expect(COMPETITOR_GRC_SLUGS).toContain('drata')
    // Real evidence sources must never be caught by the same net.
    expect(COMPETITOR_GRC_SLUGS).not.toContain('github')
    expect(COMPETITOR_GRC_SLUGS).not.toContain('aws')
  })
})

describe('connect forms', () => {
  // A shipped adapter with no form renders a "packaging gap" message instead
  // of fields, so the registry is asserted rather than assumed.
  it('ships a form for each provider the server accepts', () => {
    // Must stay in step with _REGISTRY in sentinel/integrations/registry.py —
    // a slug in one and not the other is a dead Connect button or a hidden
    // capability. `okta` joined in 20260922000001.
    expect(INTEGRATIONS.map(i => i.id).sort()).toEqual(
      [
       '1password', '1password_device_trust_kolide', '7shifts',
       'a_scend', 'addigy', 'adp', 'adp_workforce_now', 'aikido',
       'akamai', 'alexishr', 'alibaba_cloud',
       'anthropic_claude_api', 'anthropic_claude_console',
       'apollo', 'aqua_security', 'arize_ai_phoenix', 'asana',
       'auth0', 'aws', 'aws_bedrock', 'aws_secrets_manager',
       'azure_devops', 'azure_key_vault', 'bamboohr', 'basecamp',
       'bitbucket_pipelines', 'bitsight', 'bitwarden', 'box',
       'breezy_hr', 'brex', 'calendly', 'capsule', 'cats',
       'certn', 'charthop', 'checkmarx', 'checkr', 'circleci',
       'clickup', 'clockwork', 'close', 'cloudflare', 'comeet',
       'confluence', 'confluence_access_control', 'copper',
       'crowdstrike', 'cursor_codeium', 'cyberark', 'cybeready',
       'datadog', 'deel', 'digitalocean', 'docebo', 'docker_hub',
       'docusign', 'dropbox', 'duo', 'elastic_security',
       'employment_hero', 'envoy', 'factorial', 'fieldguide',
       'fleetdm', 'freshservice', 'gitguardian', 'github',
       'github_actions', 'github_copilot', 'gitlab_ci_cd',
       'gitlab_cloud', 'gitlab_self_managed', 'gitleaks', 'gong',
       'google_chronicle', 'google_cloud_identity',
       'google_cloud_platform', 'google_cloud_vertex_ai',
       'google_drive', 'google_workspace', 'gorgias', 'grafana',
       'graylog', 'gusto', 'hashicorp_vault', 'heroku', 'hexnode',
       'hibob', 'hiddenlayer', 'hubspot',
       'hugging_face_enterprise', 'humaans', 'ibm_cloud',
       'insightly', 'intercom', 'isolved', 'jamf_pro', 'jenkins',
       'jira', 'jira_service_management', 'jobadder', 'jobvite',
       'jumpcloud', 'jumpcloud_mdm', 'justworks', 'kandji_iru',
       'keeper', 'kenjo', 'knowbe4', 'kubernetes', 'lacework',
       'lakera_protect_ai', 'langsmith_langfuse', 'launchdarkly',
       'lever', 'linear', 'logrhythm', 'manageengine',
       'microsoft_azure', 'microsoft_defender_for_endpoint',
       'microsoft_defender_for_endpoint_gcc_high',
       'microsoft_entra_id', 'microsoft_entra_id_gcc_high',
       'microsoft_intune', 'microsoft_intune_gcc_high',
       'microsoft_onedrive', 'microsoft_sentinel',
       'microsoft_sharepoint', 'microsoft_teams', 'mimecast',
       'miradore', 'miro', 'monday_com', 'mongodb_atlas',
       'mongodb_atlas_for_government', 'mosyle', 'nessus',
       'netlify', 'netsuite', 'new_relic', 'ninjaone', 'notion',
       'okta', 'omnissa_workspace_one', 'one_identity',
       'onelogin', 'openai', 'openai_azure_openai', 'openvas',
       'oracle_cloud', 'orca_security', 'ovhcloud', 'paychex',
       'payfit', 'personio', 'pinecone', 'ping_identity',
       'pingone', 'pipedrive', 'prisma_cloud', 'proliant',
       'qualys', 'quickbooks', 'ramp', 'rapid7_insightvm',
       'render', 'rippling', 'rockset', 'rollbar', 'sailpoint',
       'salesforce', 'sap_successfactors', 'scaleway',
       'securityscorecard', 'semgrep', 'sentinelone', 'sentry',
       'servicenow', 'slack', 'smartrecruiters', 'smartsheet',
       'snowflake', 'snyk', 'sonarqube', 'splunk',
       'splunk_enterprise', 'square_payroll', 'sumo_logic',
       'supabase', 'tailscale', 'teamtailor', 'teamwork',
       'tenable', 'tenable_vulnerability_management_fedramp',
       'torii', 'trinet', 'trivy', 'trufflehog', 'twilio',
       'udemy_business', 'ukg', 'veracode', 'vercel',
       'vmware_workspace_one', 'vouch_cyber_insurance',
       'weaviate', 'webex', 'weights_biases_w_b', 'wiz', 'wizer',
       'workday', 'xero', 'zendesk', 'zoom', 'zoominfo'],
    )
  })

  it('keys Azure by its catalogue slug, not by "azure"', () => {
    // One id-space: integration_catalog.slug is `microsoft_azure`, and a form
    // registered under `azure` would never be found for the catalogue entry.
    expect(getIntegrationConfig('microsoft_azure')?.name).toBe('Microsoft Azure')
    expect(getIntegrationConfig('azure')).toBeUndefined()
  })

  it('collects a credential for every required AWS and Azure field', () => {
    for (const id of ['aws', 'microsoft_azure']) {
      const config = getIntegrationConfig(id)!
      expect(config.credentialFields.length).toBeGreaterThan(0)
      for (const field of config.credentialFields) {
        expect(field.id).toMatch(/^[a-z_]+$/)
        expect(field.label.length).toBeGreaterThan(0)
        expect(field.helpText, `${id}.${field.id} needs help text`).toBeTruthy()
      }
    }
  })

  it('masks every secret-bearing field', () => {
    // A secret rendered as type="text" is shoulder-surfable and offered to
    // autofill; the type is the only thing stopping that.
    for (const config of INTEGRATIONS) {
      for (const field of config.credentialFields) {
        if (/secret|token|password|key$/.test(field.id) && field.id !== 'access_key_id') {
          expect(field.type, `${config.id}.${field.id}`).toBe('password')
        }
      }
    }
  })
})


describe('reconcileWithServer', () => {
  // The catalogue's adapter_status is set by a migration; the registry lives
  // in Python. They deploy separately, so they drift, and the server is the
  // one that actually accepts or rejects a connect request.
  it('leaves the catalogue alone when the backend is unreachable', () => {
    const entries = [entry({ slug: 'aws', adapterStatus: 'catalogued' })]
    // null means "no information", not "nothing is connectable".
    expect(reconcileWithServer(entries, null)).toBe(entries)
  })

  it('offers Connect when the server ships an adapter the catalogue has not been told about', () => {
    const [row] = reconcileWithServer(
      [entry({ slug: 'aws', adapterStatus: 'catalogued' })],
      ['github', 'aws'],
    )
    expect(row.adapterStatus).toBe('beta')
    expect(isConnectable(row)).toBe(true)
  })

  it('never promotes straight to available on the strength of the registry alone', () => {
    // The registry proves an adapter exists, not that it is production-ready.
    const [row] = reconcileWithServer(
      [entry({ slug: 'microsoft_azure', adapterStatus: 'catalogued' })],
      ['microsoft_azure'],
    )
    expect(row.adapterStatus).not.toBe('available')
  })

  it('withdraws Connect when the server has no adapter for it', () => {
    const [row] = reconcileWithServer(
      [entry({ slug: 'okta', adapterStatus: 'available' })],
      ['github'],
    )
    expect(row.adapterStatus).toBe('catalogued')
    expect(isConnectable(row)).toBe(false)
  })

  it('leaves an agreeing entry untouched', () => {
    const rows = [entry({ slug: 'github', adapterStatus: 'available' })]
    const [row] = reconcileWithServer(rows, ['github'])
    expect(row).toBe(rows[0])
  })

  it('keeps connectableCount honest after reconciliation', () => {
    const rows = reconcileWithServer(
      [
        entry({ slug: 'github', adapterStatus: 'available' }),
        entry({ slug: 'aws', adapterStatus: 'catalogued' }),
        entry({ slug: 'okta', adapterStatus: 'beta' }),
      ],
      ['github', 'aws'],
    )
    expect(connectableCount(rows)).toBe(2)
  })
})
