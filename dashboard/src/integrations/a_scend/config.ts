// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AScendCredentials dataclass in
// sentinel/integrations/a_scend/adapter.py

import type { IntegrationConfig } from '../types'

export const AScendConfig: IntegrationConfig = {
  id: 'a_scend',
  category: 'security',
  name: 'A.Scend',
  description:
    'Admin account hygiene, audit-log retrievability, and data-sharing/'
    + 'export scope from A.Scend.',
  logoUrl: '/integrations/a_scend.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/a_scend',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from the A.Scend admin console with read access to users, audit logs, and data-export configuration.',
    },
  ],
  checkCategories: [
    'access_control',
    'audit_logging',
    'data_classification',
  ],
}
