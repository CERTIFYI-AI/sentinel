// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GithubActionsCredentials dataclass in
// sentinel/integrations/github_actions/adapter.py
//
// This is a distinct catalogue entry from the existing `github` source
// code adapter — it targets Actions-specific surface area (secrets
// scope, runner exposure, workflow branch protection) with its own
// credential set, even though both reuse a GitHub PAT shape.

import type { IntegrationConfig } from '../types'

export const GithubActionsConfig: IntegrationConfig = {
  id: 'github_actions',
  category: 'cicd',
  name: 'GitHub Actions',
  description:
    'CI/CD security posture: organization Actions secret scope, '
    + 'self-hosted runner exposure, and required-reviewer enforcement '
    + 'on workflow changes.',
  logoUrl: '/integrations/github_actions.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/github_actions',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'org',
      label: 'Organization',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText: 'The GitHub organization login to monitor.',
    },
    {
      id: 'api_key',
      label: 'Personal access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A GitHub PAT with read access to Actions secrets, runners, and '
        + 'repository administration for the organization.',
    },
  ],
  checkCategories: [
    'secret_management',
    'network_security',
    'change_management',
  ],
}
