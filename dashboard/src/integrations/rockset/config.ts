// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the RocksetCredentials dataclass in
// sentinel/integrations/rockset/adapter.py

import type { IntegrationConfig } from '../types'

export const RocksetConfig: IntegrationConfig = {
  id: 'rockset',
  category: 'collaboration',
  name: 'Rockset',
  description:
    'Access-review and data-location posture from Rockset: dormant admin '
    + 'users, org audit-log retrievability, and over-broadly scoped API '
    + 'keys with admin access to data collections.',
  logoUrl: '/integrations/rockset.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/rockset',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Rockset API key with read access to org users, audit logs, and API keys. Sent as "Authorization: ApiKey <key>".',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
