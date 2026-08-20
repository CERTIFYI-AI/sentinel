// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TrivyCredentials dataclass in
// sentinel/integrations/trivy/adapter.py

import type { IntegrationConfig } from '../types'

export const TrivyConfig: IntegrationConfig = {
  id: 'trivy',
  category: 'security',
  name: 'Trivy',
  description:
    'Container scanning posture: vulnerability count, misconfiguration '
    + 'findings, and license compliance for vulnerability management '
    + 'and change management evidence.',
  logoUrl: '/integrations/trivy.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/trivy',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Trivy Server URL',
      type: 'text',
      required: true,
      placeholder: 'https://trivy.internal.example.com',
      helpText:
        'The base URL of your Trivy Server instance.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Trivy Server API token with read access to scan reports.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
