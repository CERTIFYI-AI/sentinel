// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the KenjoCredentials dataclass in
// sentinel/integrations/kenjo/adapter.py

import type { IntegrationConfig } from '../types'

export const KenjoConfig: IntegrationConfig = {
  id: 'kenjo',
  category: 'hr',
  name: 'Kenjo',
  description:
    'Joiner-mover-leaver evidence from Kenjo: terminated-employee status hygiene, '
    + 'manager-assignment coverage, and employment record change history.',
  logoUrl: '/integrations/kenjo.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/kenjo',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from the Kenjo admin API settings with read access to people records.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
