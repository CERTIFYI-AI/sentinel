// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PipedriveCredentials dataclass in
// sentinel/integrations/pipedrive/adapter.py

import type { IntegrationConfig } from '../types'

export const PipedriveConfig: IntegrationConfig = {
  id: 'pipedrive',
  category: 'collaboration',
  name: 'Pipedrive',
  description:
    'Access-review and data-location evidence from Pipedrive: dormant '
    + 'administrator accounts, webhooks pushing CRM data to external '
    + 'endpoints, and permission sets exposing deals/leads company-wide.',
  logoUrl: '/integrations/pipedrive.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/pipedrive',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Pipedrive API token from Settings > Personal Preferences > API. '
        + 'Read-only access to users, webhooks, and permission sets is sufficient.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'vendor_management',
    'access_control',
  ],
}
