// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const JiraConfig: IntegrationConfig = {
  id: 'jira',
  category: 'ticketing',
  name: 'Jira',
  description:
    'Change management posture: project inventory, admin group size, '
    + 'and workflow scheme governance.',
  logoUrl: '/integrations/jira.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jira',
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
      helpText:
        'An Atlassian API token from id.atlassian.com/manage-profile/security/api-tokens. '
        + 'Read-only project and user scopes are sufficient.',
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
  checkCategories: ['change_management', 'least_privilege'],
}
