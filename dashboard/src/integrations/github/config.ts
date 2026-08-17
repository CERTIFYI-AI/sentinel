// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GithubConfig: IntegrationConfig = {
  id: 'github',
  category: 'code',
  name: 'GitHub',
  description:
    'Organization and repository security posture: 2FA enforcement, owner '
    + 'sprawl, default-branch protection, secret scanning, Dependabot alerts, '
    + 'and audit-log availability.',
  logoUrl: '/integrations/github.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/github',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'token',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: 'ghp_… or github_pat_…',
      helpText:
        'Fine-grained PAT or GitHub App token with read:org, repository '
        + 'metadata/administration read, and security_events read.',
    },
    {
      id: 'organization',
      label: 'Organization',
      type: 'text',
      required: true,
      placeholder: 'certifyi-ai',
      helpText: 'The GitHub organization login to audit.',
    },
    {
      id: 'base_url',
      label: 'API base URL',
      type: 'url',
      required: false,
      placeholder: 'https://api.github.com',
      helpText: 'Only change for GitHub Enterprise Server (…/api/v3).',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py —
  // these drive the control mapping shown on the connect screen.
  checkCategories: [
    'mfa_enforcement',
    'least_privilege',
    'access_control',
    'change_management',
    'secret_management',
    'vulnerability_management',
    'audit_logging',
  ],
}
