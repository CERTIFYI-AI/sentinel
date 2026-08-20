// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CloseCredentials dataclass in
// sentinel/integrations/close/adapter.py

import type { IntegrationConfig } from '../types'

export const CloseConfig: IntegrationConfig = {
  id: 'close',
  category: 'collaboration',
  name: 'Close',
  description:
    'Access-review and data-location evidence from Close CRM: admin-role '
    + 'account concentration, organization event-log retrievability, and '
    + 'the absence of role-based restrictions on lead visibility.',
  logoUrl: '/integrations/close.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/close',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Close API key from Settings > API Keys.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
