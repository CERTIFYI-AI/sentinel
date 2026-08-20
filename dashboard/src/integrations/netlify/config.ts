// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NetlifyCredentials dataclass in
// sentinel/integrations/netlify/adapter.py

import type { IntegrationConfig } from '../types'

export const NetlifyConfig: IntegrationConfig = {
  id: 'netlify',
  category: 'cloud',
  name: 'Netlify',
  description:
    'Deployment platform posture: Owner-role concentration across team '
    + 'members, sites that do not force HTTPS, and sensitive environment '
    + 'variables that are not marked secret.',
  logoUrl: '/integrations/netlify.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/netlify',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Personal access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Netlify Personal Access Token from User settings > Applications with read access to sites, team members, and environment variables.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'network_security',
    'encryption_at_rest',
  ],
}
