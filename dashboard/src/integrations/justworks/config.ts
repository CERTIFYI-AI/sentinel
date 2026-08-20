// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JustworksCredentials dataclass in
// sentinel/integrations/justworks/adapter.py

import type { IntegrationConfig } from '../types'

export const JustworksConfig: IntegrationConfig = {
  id: 'justworks',
  category: 'hr',
  name: 'Justworks',
  description:
    'Joiner-mover-leaver lifecycle evidence from Justworks: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/justworks.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/justworks',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Justworks with read access to Employees and Audit Logs.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
