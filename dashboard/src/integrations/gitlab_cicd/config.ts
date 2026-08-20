// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GitLabCiCdConfig: IntegrationConfig = {
  id: 'gitlab_ci_cd',
  category: 'cicd',
  name: 'GitLab CI/CD',
  description:
    'Pipeline governance: runner inventory, untagged runner detection, '
    + 'and CI/CD variable masking.',
  logoUrl: '/integrations/gitlab.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gitlab-cicd',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'token',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'glpat-…',
      helpText:
        'A GitLab PAT with admin_mode and read_api scopes for '
        + 'runner and variable visibility.',
    },
    {
      id: 'base_url',
      label: 'GitLab instance URL',
      type: 'url',
      required: false,
      placeholder: 'https://gitlab.com',
      helpText: 'Defaults to gitlab.com. Change for self-managed instances.',
    },
  ],
  checkCategories: ['change_management', 'secret_management'],
}
