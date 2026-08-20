// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the UdemyBusinessCredentials dataclass in
// sentinel/integrations/udemy_business/adapter.py

import type { IntegrationConfig } from '../types'

export const UdemyBusinessConfig: IntegrationConfig = {
  id: 'udemy_business',
  category: 'training',
  name: 'Udemy Business',
  description:
    'Security-awareness training completion, overdue course assignments, '
    + 'and completion audit-trail integrity from the Udemy Business Admin API.',
  logoUrl: '/integrations/udemy_business.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/udemy_business',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The Client ID from Udemy Business Organization Settings > API Clients.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Client Secret paired with the Client ID above (sent as HTTP Basic credentials).',
    },
  ],
  checkCategories: [
    'hr_controls',
    'audit_logging',
  ],
}
