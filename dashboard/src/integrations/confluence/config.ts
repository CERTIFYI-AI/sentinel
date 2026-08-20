// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const ConfluenceConfig: IntegrationConfig = {
  id: 'confluence',
  category: 'collaboration',
  name: 'Confluence',
  description:
    'Knowledge-base governance: space inventory and '
    + 'publicly visible content detection.',
  logoUrl: '/integrations/confluence.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/confluence',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'email',
      label: 'Atlassian account email',
      type: 'text',
      required: true,
      placeholder: 'admin@example.com',
      helpText: 'The email address of the Atlassian account.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'Atlassian API token with Confluence read access.',
    },
    {
      id: 'site_url',
      label: 'Site URL',
      type: 'url',
      required: true,
      placeholder: 'https://yoursite.atlassian.net',
      helpText: 'Your Atlassian Cloud site URL.',
    },
  ],
  checkCategories: ['change_management', 'data_classification'],
}
