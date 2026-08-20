// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GitLabCloudConfig: IntegrationConfig = {
  id: 'gitlab_cloud',
  category: 'code',
  name: 'GitLab.com',
  description:
    'Repository security posture: project inventory, branch protection, '
    + 'and group-level 2FA enforcement on GitLab.com.',
  logoUrl: '/integrations/gitlab.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gitlab-cloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'token',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'glpat-…',
      helpText:
        'A GitLab PAT with read_api scope. Owner or Maintainer role '
        + 'for the groups you want audited.',
    },
  ],
  checkCategories: ['change_management', 'mfa_enforcement'],
}
