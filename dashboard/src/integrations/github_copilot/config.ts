// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GithubCopilotConfig: IntegrationConfig = {
  id: 'github_copilot',
  category: 'ai',
  name: 'GitHub Copilot',
  description:
    'Copilot seat allocation, public-code suggestion policies, and '
    + 'usage telemetry for the organisation.',
  logoUrl: '/integrations/github-copilot.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/github-copilot',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_token',
      label: 'Personal access token',
      type: 'password',
      required: true,
      placeholder: 'ghp_...',
      helpText:
        'A GitHub PAT with Copilot admin read scope (or a GitHub App installation token).',
    },
    {
      id: 'organization',
      label: 'Organisation',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText: 'The GitHub org whose Copilot usage is read.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
  ],
}
