// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DoceboCredentials dataclass in
// sentinel/integrations/docebo/adapter.py

import type { IntegrationConfig } from '../types'

export const DoceboConfig: IntegrationConfig = {
  id: 'docebo',
  category: 'training',
  name: 'Docebo',
  description:
    'Security-awareness training completion, overdue course assignments, '
    + 'and completion audit-trail integrity from the Docebo Learn API.',
  logoUrl: '/integrations/docebo.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/docebo',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Docebo API-only application.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'hr_controls',
    'audit_logging',
  ],
}
