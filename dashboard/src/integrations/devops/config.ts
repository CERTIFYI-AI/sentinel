// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const DevOpsConfig: IntegrationConfig = {
  id: 'azure_devops',
  category: 'cicd',
  name: 'Azure DevOps',
  description:
    'CI/CD governance: project inventory, build pipeline inventory, '
    + 'and branch protection policies.',
  logoUrl: '/integrations/devops.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/devops',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'organization',
      label: 'Azure DevOps Organisation',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText: 'The organisation name from dev.azure.com/{org}.',
    },
    {
      id: 'personal_access_token',
      label: 'Personal Access Token (PAT)',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A PAT with read-only scopes: Project & Team, Build, Code. '
        + 'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: ['change_management'],
}
