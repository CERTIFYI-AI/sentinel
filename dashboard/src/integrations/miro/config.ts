// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MiroCredentials dataclass in
// sentinel/integrations/miro/adapter.py

import type { IntegrationConfig } from '../types'

export const MiroConfig: IntegrationConfig = {
  id: 'miro',
  category: 'collaboration',
  name: 'Miro',
  description:
    'Access-review and data-location evidence from Miro: admin account '
    + 'hygiene, audit log retrievability, and boards open to public link '
    + 'sharing.',
  logoUrl: '/integrations/miro.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/miro',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer access token from a Miro OAuth2 app or enterprise service account with org, boards, and audit log read scopes.',
    },
  ],
  checkCategories: [
    'access_control',
    'audit_logging',
    'data_classification',
  ],
}
