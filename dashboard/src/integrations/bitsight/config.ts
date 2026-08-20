// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BitsightCredentials dataclass in
// sentinel/integrations/bitsight/adapter.py

import type { IntegrationConfig } from '../types'

export const BitsightConfig: IntegrationConfig = {
  id: 'bitsight',
  category: 'security',
  name: 'Bitsight',
  description:
    'Security-rating data: company rating, risk vectors, and '
    + 'third-party portfolio ratings for vendor-risk management.',
  logoUrl: '/integrations/bitsight.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/bitsight',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bitsight API token from Account > API Token.',
    },
  ],
  checkCategories: [
    'vendor_management',
    'vulnerability_management',
  ],
}
