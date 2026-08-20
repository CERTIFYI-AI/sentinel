// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const BitbucketConfig: IntegrationConfig = {
  id: 'bitbucket_pipelines',
  category: 'cicd',
  name: 'Bitbucket Pipelines',
  description:
    'CI/CD governance: repository inventory, pipeline enablement, '
    + 'and branch protection policies.',
  logoUrl: '/integrations/bitbucket.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/bitbucket',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'username',
      label: 'Bitbucket username',
      type: 'text',
      required: true,
      placeholder: 'my-username',
      helpText: 'The Bitbucket Cloud username (not email).',
    },
    {
      id: 'app_password',
      label: 'App password',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Bitbucket app password with read-only scopes: '
        + 'Account, Workspace, Repositories, Pipelines.',
    },
    {
      id: 'workspace',
      label: 'Workspace',
      type: 'text',
      required: true,
      placeholder: 'my-workspace',
      helpText: 'The Bitbucket workspace slug to audit.',
    },
  ],
  checkCategories: ['change_management'],
}
