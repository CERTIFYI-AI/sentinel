// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NessusCredentials dataclass in
// sentinel/integrations/nessus/adapter.py

import type { IntegrationConfig } from '../types'

export const NessusConfig: IntegrationConfig = {
  id: 'nessus',
  category: 'security',
  name: 'Nessus',
  description:
    'Vulnerability scanning: scan inventory, critical findings, '
    + 'and scan schedule compliance.',
  logoUrl: '/integrations/nessus.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/nessus',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Server URL',
      type: 'url',
      required: true,
      placeholder: 'https://nessus.example.com:8834',
      helpText: 'The base URL of your Nessus instance (include port if non-standard).',
    },
    {
      id: 'access_key_id',
      label: 'Access key',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      helpText: 'The access key from Settings > My Account > API Keys.',
    },
    {
      id: 'api_credential',
      label: 'API credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The corresponding credential for the access key.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
  ],
}
