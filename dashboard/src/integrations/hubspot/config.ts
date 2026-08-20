// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HubspotCredentials dataclass in
// sentinel/integrations/hubspot/adapter.py

import type { IntegrationConfig } from '../types'

export const HubspotConfig: IntegrationConfig = {
  id: 'hubspot',
  category: 'collaboration',
  name: 'HubSpot',
  description:
    'Access-review and data-location evidence from HubSpot: super admin '
    + 'concentration, security audit log retrievability, and over-broad '
    + 'OAuth scopes granted to the connected app token.',
  logoUrl: '/integrations/hubspot.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hubspot',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Private app access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A HubSpot Private App access token with read scopes for users, '
        + 'account info, and audit logs.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
