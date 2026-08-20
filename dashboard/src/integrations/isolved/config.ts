// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the IsolvedCredentials dataclass in
// sentinel/integrations/isolved/adapter.py

import type { IntegrationConfig } from '../types'

export const IsolvedConfig: IntegrationConfig = {
  id: 'isolved',
  category: 'hr',
  name: 'isolved',
  description:
    'Joiner-mover-leaver evidence from isolved People Cloud: terminated-employee '
    + 'status hygiene, manager-assignment coverage, and employment record change '
    + 'history.',
  logoUrl: '/integrations/isolved.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/isolved',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your isolved People Cloud API application.',
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
