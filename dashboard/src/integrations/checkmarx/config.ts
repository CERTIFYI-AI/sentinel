// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CheckmarxCredentials dataclass in
// sentinel/integrations/checkmarx/adapter.py

import type { IntegrationConfig } from '../types'

export const CheckmarxConfig: IntegrationConfig = {
  id: 'checkmarx',
  category: 'security',
  name: 'Checkmarx',
  description:
    'SAST/DAST findings: high-severity results, project scan coverage, '
    + 'and recent scan activity for change management.',
  logoUrl: '/integrations/checkmarx.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/checkmarx',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Checkmarx One API key with read-only access to projects and results.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
