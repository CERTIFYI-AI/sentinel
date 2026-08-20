// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SonarQubeCredentials dataclass in
// sentinel/integrations/sonarqube/adapter.py

import type { IntegrationConfig } from '../types'

export const SonarQubeConfig: IntegrationConfig = {
  id: 'sonarqube',
  category: 'security',
  name: 'SonarQube',
  description:
    'Code quality posture: quality gate status, security hotspots, '
    + 'and code coverage compliance for vulnerability management '
    + 'and change management evidence.',
  logoUrl: '/integrations/sonarqube.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sonarqube',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'SonarQube instance URL',
      type: 'text',
      required: true,
      placeholder: 'https://sonarqube.example.com',
      helpText:
        'The base URL of your SonarQube instance or https://sonarcloud.io '
        + 'for SonarCloud.',
    },
    {
      id: 'api_token',
      label: 'User token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A SonarQube user token or global analysis token with Browse '
        + 'permission on the projects you want Sentinel to assess.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
