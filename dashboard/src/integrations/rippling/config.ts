// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the RipplingCredentials dataclass in
// sentinel/integrations/rippling/adapter.py

import type { IntegrationConfig } from '../types'

export const RipplingConfig: IntegrationConfig = {
  id: 'rippling',
  category: 'hr',
  name: 'Rippling',
  description:
    'Joiner-mover-leaver lifecycle evidence from Rippling: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/rippling.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/rippling',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API app token from Rippling with read access to Employees and Audit Logs.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
