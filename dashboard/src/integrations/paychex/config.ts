// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PaychexCredentials dataclass in
// sentinel/integrations/paychex/adapter.py

import type { IntegrationConfig } from '../types'

export const PaychexConfig: IntegrationConfig = {
  id: 'paychex',
  category: 'hr',
  name: 'Paychex',
  description:
    'Joiner-mover-leaver evidence from Paychex Flex: worker roster and '
    + 'employment status, supervisor assignments, and worker history for '
    + 'access-review and offboarding compliance.',
  logoUrl: '/integrations/paychex.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/paychex',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Paychex Flex API application.',
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
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
