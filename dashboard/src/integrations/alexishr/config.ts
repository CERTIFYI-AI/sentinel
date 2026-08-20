// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AlexisHRCredentials dataclass in
// sentinel/integrations/alexishr/adapter.py

import type { IntegrationConfig } from '../types'

export const AlexisHRConfig: IntegrationConfig = {
  id: 'alexishr',
  category: 'hr',
  name: 'AlexisHR',
  description:
    'Joiner-mover-leaver evidence from AlexisHR: offboarded-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/alexishr.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/alexishr',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from AlexisHR > Settings > API keys with read access to employees and the audit log.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
