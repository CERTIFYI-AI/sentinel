// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AdpCredentials dataclass in
// sentinel/integrations/adp/adapter.py

import type { IntegrationConfig } from '../types'

export const AdpConfig: IntegrationConfig = {
  id: 'adp',
  category: 'hr',
  name: 'ADP',
  description:
    'Joiner-mover-leaver evidence from ADP: worker roster and employment '
    + 'status, manager assignments, and worker change event history for '
    + 'access-review and offboarding compliance.',
  logoUrl: '/integrations/adp.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/adp',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your ADP API Central application.',
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
