// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DeelCredentials dataclass in
// sentinel/integrations/deel/adapter.py

import type { IntegrationConfig } from '../types'

export const DeelConfig: IntegrationConfig = {
  id: 'deel',
  category: 'hr',
  name: 'Deel',
  description:
    'Joiner-mover-leaver lifecycle evidence from Deel: terminated-worker '
    + 'deactivation, direct-manager assignment coverage, and employment '
    + 'record change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/deel.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/deel',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Deel with read access to People and Audit Logs.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
