// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CharthopCredentials dataclass in
// sentinel/integrations/charthop/adapter.py

import type { IntegrationConfig } from '../types'

export const CharthopConfig: IntegrationConfig = {
  id: 'charthop',
  category: 'hr',
  name: 'ChartHop',
  description:
    'Joiner-mover-leaver evidence from ChartHop: terminated-employee status '
    + 'hygiene, manager-assignment coverage, and employment record change history.',
  logoUrl: '/integrations/charthop.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/charthop',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from the ChartHop API settings with read access to people records.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
