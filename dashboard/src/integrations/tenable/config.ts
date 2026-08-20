// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TenableCredentials dataclass in
// sentinel/integrations/tenable/adapter.py

import type { IntegrationConfig } from '../types'

export const TenableConfig: IntegrationConfig = {
  id: 'tenable',
  category: 'security',
  name: 'Tenable.io',
  description:
    'Vulnerability management posture: vulnerability count by severity, '
    + 'asset scan coverage, and compliance audit results for vulnerability '
    + 'management and network security evidence.',
  logoUrl: '/integrations/tenable.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/tenable',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_key',
      label: 'Access key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Your Tenable.io API access key (Settings > My Account > '
        + 'API Keys).',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The client credential (paired with the access key above) '
        + 'from your Tenable.io API keys.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'network_security',
  ],
}
