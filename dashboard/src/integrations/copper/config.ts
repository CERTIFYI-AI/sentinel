// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CopperCredentials dataclass in
// sentinel/integrations/copper/adapter.py

import type { IntegrationConfig } from '../types'

export const CopperConfig: IntegrationConfig = {
  id: 'copper',
  category: 'collaboration',
  name: 'Copper',
  description:
    'Access-review and data-location evidence from Copper CRM: '
    + 'administrator concentration, webhook subscriptions pushing data to '
    + 'external endpoints, and leads left without an assigned owner.',
  logoUrl: '/integrations/copper.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/copper',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Copper API token from Settings > Integrations > API Keys.',
    },
    {
      id: 'user_email',
      label: 'Account email',
      type: 'text',
      required: true,
      placeholder: 'admin@example.com',
      helpText: 'The email address of the Copper user the API token belongs to.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'vendor_management',
    'access_control',
  ],
}
