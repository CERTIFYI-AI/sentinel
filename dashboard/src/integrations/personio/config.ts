// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PersonioCredentials dataclass in
// sentinel/integrations/personio/adapter.py

import type { IntegrationConfig } from '../types'

export const PersonioConfig: IntegrationConfig = {
  id: 'personio',
  category: 'hr',
  name: 'Personio',
  description:
    'Joiner-mover-leaver lifecycle evidence from Personio: terminated-employee '
    + 'deactivation, supervisor assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/personio.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/personio',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The API credential client ID from Personio Settings > API credentials.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The client credential paired with the client ID, exchanged for a bearer token at /v1/auth.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
