// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the Rapid7InsightVmCredentials dataclass in
// sentinel/integrations/rapid7_insightvm/adapter.py

import type { IntegrationConfig } from '../types'

export const Rapid7InsightVmConfig: IntegrationConfig = {
  id: 'rapid7_insightvm',
  category: 'security',
  name: 'Rapid7 InsightVM',
  description:
    'Vulnerability management: critical vulnerability counts, asset '
    + 'scan coverage, and scan engine health.',
  logoUrl: '/integrations/rapid7_insightvm.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/rapid7_insightvm',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Server URL',
      type: 'url',
      required: true,
      placeholder: 'https://insightvm.example.com:3780',
      helpText: 'The base URL of your InsightVM console (include port if non-standard).',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A platform API key from Rapid7 Insight Platform > API Keys.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'endpoint_protection',
  ],
}
