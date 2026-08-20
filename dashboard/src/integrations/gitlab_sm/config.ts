// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GitLabSmConfig: IntegrationConfig = {
  id: 'gitlab_self_managed',
  category: 'code',
  name: 'GitLab Self-Managed',
  description:
    'Instance security posture: version currency, open-signup detection, '
    + 'and instance-wide 2FA enforcement.',
  logoUrl: '/integrations/gitlab.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gitlab-self-managed',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'token',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'glpat-…',
      helpText: 'A GitLab PAT with admin_mode and read_api scopes.',
    },
    {
      id: 'base_url',
      label: 'GitLab instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://gitlab.example.com',
      helpText: 'The base URL of your self-managed GitLab instance.',
    },
  ],
  checkCategories: ['change_management', 'access_control', 'mfa_enforcement'],
}
