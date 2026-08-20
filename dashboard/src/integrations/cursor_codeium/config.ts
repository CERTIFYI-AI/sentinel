// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const CursorCodeiumConfig: IntegrationConfig = {
  id: 'cursor_codeium',
  category: 'ai',
  name: 'Cursor / Codeium',
  description:
    'Enterprise team posture: privacy mode enforcement, SSO/SAML '
    + 'configuration, seat inventory, and data-retention settings.',
  logoUrl: '/integrations/cursor.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/cursor-codeium',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Admin API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'Enterprise admin API key.',
    },
    {
      id: 'team',
      label: 'Team',
      type: 'text',
      required: false,
      placeholder: 'my-team',
    },
    {
      id: 'base_url',
      label: 'API base URL',
      type: 'url',
      required: false,
      placeholder: 'https://api.cursor.com/v1',
      helpText: 'Override for self-hosted or Codeium deployments.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'mfa_enforcement',
  ],
}
