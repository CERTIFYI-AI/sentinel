// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CapsuleCredentials dataclass in
// sentinel/integrations/capsule/adapter.py

import type { IntegrationConfig } from '../types'

export const CapsuleConfig: IntegrationConfig = {
  id: 'capsule',
  category: 'collaboration',
  name: 'Capsule CRM',
  description:
    'User and administrator roster, SSO/MFA enforcement, and outbound '
    + 'webhook exposure from Capsule CRM for access-review evidence.',
  logoUrl: '/integrations/capsule.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/capsule',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A personal API Authentication Token from Capsule > My Preferences > API Authentication Tokens.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
