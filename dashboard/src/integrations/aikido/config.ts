// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AikidoCredentials dataclass in
// sentinel/integrations/aikido/adapter.py

import type { IntegrationConfig } from '../types'

export const AikidoConfig: IntegrationConfig = {
  id: 'aikido',
  category: 'security',
  name: 'Aikido',
  description:
    'Application-security posture: open vulnerabilities, SLA compliance, '
    + 'and change-management audit logs.',
  logoUrl: '/integrations/aikido.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/aikido',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A read-only API key from Aikido Settings > Integrations.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
