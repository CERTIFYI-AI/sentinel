// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const ConfluenceAcConfig: IntegrationConfig = {
  id: 'confluence_access_control',
  category: 'collaboration',
  name: 'Confluence Access Control',
  description:
    'Access posture: anonymous access detection and '
    + 'space-level permission review.',
  logoUrl: '/integrations/confluence.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/confluence-access-control',
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
      helpText: 'Atlassian API token with Confluence admin read access.',
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
  checkCategories: ['access_control'],
}
