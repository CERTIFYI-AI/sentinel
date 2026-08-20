// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AquaSecurityCredentials dataclass in
// sentinel/integrations/aqua_security/adapter.py

import type { IntegrationConfig } from '../types'

export const AquaSecurityConfig: IntegrationConfig = {
  id: 'aqua_security',
  category: 'security',
  name: 'Aqua Security',
  description:
    'Container-security posture: image vulnerabilities, runtime '
    + 'protection policies, and enforcer agent health.',
  logoUrl: '/integrations/aqua_security.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/aqua_security',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A read-only API key from Aqua Console > Settings > API Keys.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'endpoint_protection',
  ],
}
