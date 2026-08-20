// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const JiraSmConfig: IntegrationConfig = {
  id: 'jira_service_management',
  category: 'ticketing',
  name: 'Jira Service Management',
  description:
    'Incident management posture: service desk inventory and '
    + 'SLA-tracked queue coverage.',
  logoUrl: '/integrations/jira_sm.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jira-service-management',
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
      helpText: 'Atlassian API token with service desk read access.',
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
  checkCategories: ['incident_response'],
}
