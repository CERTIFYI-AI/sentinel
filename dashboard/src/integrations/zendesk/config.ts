// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ZendeskCredentials dataclass in
// sentinel/integrations/zendesk/adapter.py

import type { IntegrationConfig } from '../types'

export const ZendeskConfig: IntegrationConfig = {
  id: 'zendesk',
  category: 'ticketing',
  name: 'Zendesk',
  description:
    'Access-review and data-location evidence from Zendesk: dormant admin '
    + 'accounts, account-wide two-factor authentication enforcement, and '
    + 'organizations with shared ticket visibility.',
  logoUrl: '/integrations/zendesk.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/zendesk',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'subdomain',
      label: 'Subdomain',
      type: 'text',
      required: true,
      placeholder: 'yourcompany',
      helpText: 'Your Zendesk subdomain (the part before .zendesk.com).',
    },
    {
      id: 'email',
      label: 'Agent email',
      type: 'text',
      required: true,
      placeholder: 'integrations@yourcompany.com',
      helpText: 'The email address of the agent account that owns the API token.',
    },
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Zendesk API token generated under Admin Center > Apps and integrations > APIs.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
