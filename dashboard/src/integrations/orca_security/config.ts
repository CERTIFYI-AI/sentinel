// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OrcaSecurityCredentials dataclass in
// sentinel/integrations/orca_security/adapter.py

import type { IntegrationConfig } from '../types'

export const OrcaSecurityConfig: IntegrationConfig = {
  id: 'orca_security',
  category: 'security',
  name: 'Orca Security',
  description:
    'CNAPP posture: critical cloud alerts, vulnerability counts, '
    + 'and cloud asset coverage.',
  logoUrl: '/integrations/orca_security.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/orca_security',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An API key from Orca Security > Settings > API.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'endpoint_protection',
  ],
}
