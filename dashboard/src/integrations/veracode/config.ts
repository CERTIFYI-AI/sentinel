// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the VeracodeCredentials dataclass in
// sentinel/integrations/veracode/adapter.py

import type { IntegrationConfig } from '../types'

export const VeracodeConfig: IntegrationConfig = {
  id: 'veracode',
  category: 'security',
  name: 'Veracode',
  description:
    'Application security posture: scan findings, policy compliance, '
    + 'and sandbox scan status for vulnerability management and change '
    + 'management evidence.',
  logoUrl: '/integrations/veracode.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/veracode',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_id',
      label: 'API ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'Your Veracode API ID (Administration > API Credentials).',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The API key paired with the API ID above.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
