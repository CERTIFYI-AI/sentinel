// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SentinelOneCredentials dataclass in
// sentinel/integrations/sentinelone/adapter.py

import type { IntegrationConfig } from '../types'

export const SentinelOneConfig: IntegrationConfig = {
  id: 'sentinelone',
  category: 'security',
  name: 'SentinelOne',
  description:
    'EDR/XDR posture: agent deployment health, active threat summary, '
    + 'and application vulnerability findings.',
  logoUrl: '/integrations/sentinelone.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sentinelone',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Management console URL',
      type: 'url',
      required: true,
      placeholder: 'https://usea1-partners.sentinelone.net',
      helpText:
        'The base URL of your SentinelOne management console.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'An API token for a service user with Viewer role. Sentinel '
        + 'only reads data; no write scope is required.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'incident_response',
    'vulnerability_management',
  ],
}
