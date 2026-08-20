// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CircleciCredentials dataclass in
// sentinel/integrations/circleci/adapter.py

import type { IntegrationConfig } from '../types'

export const CircleciConfig: IntegrationConfig = {
  id: 'circleci',
  category: 'cicd',
  name: 'CircleCI',
  description:
    'Pipeline security posture: context environment-variable exposure '
    + 'scope, pipeline trigger access hygiene, and approval-gate '
    + 'enforcement on deploy workflows.',
  logoUrl: '/integrations/circleci.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/circleci',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Personal API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A CircleCI Personal API Token belonging to an org member.',
    },
    {
      id: 'org_slug',
      label: 'Organization slug',
      type: 'text',
      required: true,
      placeholder: 'gh/my-org',
      helpText: 'The CircleCI organization slug, e.g. "gh/my-org" or "circleci/my-org".',
    },
  ],
  checkCategories: [
    'secret_management',
    'access_control',
    'change_management',
  ],
}
