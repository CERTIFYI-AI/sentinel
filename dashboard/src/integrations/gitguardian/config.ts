// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GitGuardianCredentials dataclass in
// sentinel/integrations/gitguardian/adapter.py

import type { IntegrationConfig } from '../types'

export const GitGuardianConfig: IntegrationConfig = {
  id: 'gitguardian',
  category: 'security',
  name: 'GitGuardian',
  description:
    'Secrets-detection posture: open leak incidents, critical unresolved '
    + 'findings, and repository scan coverage.',
  logoUrl: '/integrations/gitguardian.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gitguardian',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A personal or service access token from GitGuardian > API > Personal Access Tokens.',
    },
  ],
  checkCategories: [
    'secret_management',
    'vulnerability_management',
  ],
}
