// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ToriiCredentials dataclass in
// sentinel/integrations/torii/adapter.py

import type { IntegrationConfig } from '../types'

export const ToriiConfig: IntegrationConfig = {
  id: 'torii',
  category: 'collaboration',
  name: 'Torii',
  description:
    'Access-review and data-location posture from Torii SaaS management: '
    + 'stale unused-app licenses, audit-log retrievability, and API '
    + 'access token scope.',
  logoUrl: '/integrations/torii.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/torii',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Torii Settings > API tokens with read access to apps, activities, and tokens.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
