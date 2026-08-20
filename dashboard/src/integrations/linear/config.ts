// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the LinearCredentials dataclass in
// sentinel/integrations/linear/adapter.py

import type { IntegrationConfig } from '../types'

export const LinearConfig: IntegrationConfig = {
  id: 'linear',
  category: 'collaboration',
  name: 'Linear',
  description:
    'Access-review and data-location evidence from Linear: dormant admin '
    + 'account hygiene, SAML SSO enforcement, and external guest access to '
    + 'the workspace.',
  logoUrl: '/integrations/linear.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/linear',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Linear API key with workspace admin access, from Settings > API.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
