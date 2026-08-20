// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the InsightlyCredentials dataclass in
// sentinel/integrations/insightly/adapter.py

import type { IntegrationConfig } from '../types'

export const InsightlyConfig: IntegrationConfig = {
  id: 'insightly',
  category: 'collaboration',
  name: 'Insightly',
  description:
    'Access-review and data-location evidence from Insightly CRM: '
    + 'administrator/owner concentration, webhooks pushing data to external '
    + 'endpoints, and leads set visible to every user.',
  logoUrl: '/integrations/insightly.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/insightly',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An Insightly API key from User Settings.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'vendor_management',
    'access_control',
  ],
}
