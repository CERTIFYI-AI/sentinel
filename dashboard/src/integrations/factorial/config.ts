// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the FactorialCredentials dataclass in
// sentinel/integrations/factorial/adapter.py

import type { IntegrationConfig } from '../types'

export const FactorialConfig: IntegrationConfig = {
  id: 'factorial',
  category: 'hr',
  name: 'Factorial',
  description:
    'Joiner-mover-leaver evidence from Factorial: terminated-employee status '
    + 'hygiene, manager-assignment coverage, and employment record change history.',
  logoUrl: '/integrations/factorial.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/factorial',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Factorial API settings with read access to employees.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
