// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DockerHubCredentials dataclass in
// sentinel/integrations/docker_hub/adapter.py

import type { IntegrationConfig } from '../types'

export const DockerHubConfig: IntegrationConfig = {
  id: 'docker_hub',
  category: 'security',
  name: 'Docker Hub',
  description:
    'Registry security posture: repository visibility, organization '
    + 'member access hygiene, and image vulnerability-scan results '
    + '(where the plan includes Docker Scout).',
  logoUrl: '/integrations/docker_hub.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/docker_hub',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'my-docker-org',
      helpText: 'The Docker Hub username or organization namespace to monitor.',
    },
    {
      id: 'credential',
      label: 'Personal access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Docker Hub Personal Access Token with read-only permission.',
    },
  ],
  checkCategories: [
    'data_classification',
    'access_control',
    'vulnerability_management',
  ],
}
