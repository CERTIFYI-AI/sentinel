// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PayfitCredentials dataclass in
// sentinel/integrations/payfit/adapter.py

import type { IntegrationConfig } from '../types'

export const PayfitConfig: IntegrationConfig = {
  id: 'payfit',
  category: 'hr',
  name: 'PayFit',
  description:
    'Joiner-mover-leaver evidence from PayFit: terminated-employee status hygiene, '
    + 'manager-assignment coverage, and employment record change history.',
  logoUrl: '/integrations/payfit.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/payfit',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from the PayFit partner portal with read access to employees.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
