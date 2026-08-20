// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the VercelCredentials dataclass in
// sentinel/integrations/vercel/adapter.py

import type { IntegrationConfig } from '../types'

export const VercelConfig: IntegrationConfig = {
  id: 'vercel',
  category: 'cloud',
  name: 'Vercel',
  description:
    'Deployment platform posture: stale access tokens, projects with no '
    + 'deployment protection, and sensitive environment variables stored '
    + 'unencrypted.',
  logoUrl: '/integrations/vercel.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/vercel',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Vercel Access Token from Account Settings > Tokens with read access to projects and environment variables.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'encryption_at_rest',
  ],
}
