// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the WizCredentials dataclass in
// sentinel/integrations/wiz/adapter.py

import type { IntegrationConfig } from '../types'

export const WizConfig: IntegrationConfig = {
  id: 'wiz',
  category: 'security',
  name: 'Wiz',
  description:
    'Cloud security posture: critical issue count, cloud configuration '
    + 'findings, and vulnerability assessment for vulnerability management, '
    + 'access control, and network security evidence.',
  logoUrl: '/integrations/wiz.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/wiz',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_url',
      label: 'Wiz API URL',
      type: 'text',
      required: true,
      placeholder: 'https://api.us1.app.wiz.io/graphql',
      helpText:
        'Your tenant-specific Wiz GraphQL API endpoint '
        + '(Settings > Wiz API).',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'The OAuth2 client ID from your Wiz service account.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'access_control',
    'network_security',
  ],
}
