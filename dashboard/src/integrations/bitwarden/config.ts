// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BitwardenCredentials dataclass in
// sentinel/integrations/bitwarden/adapter.py

import type { IntegrationConfig } from '../types'

export const BitwardenConfig: IntegrationConfig = {
  id: 'bitwarden',
  category: 'secrets',
  name: 'Bitwarden',
  description:
    'Organization vault security posture: member access hygiene, '
    + 'collection sharing scope, and two-factor-authentication '
    + 'enforcement across the organization.',
  logoUrl: '/integrations/bitwarden.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/bitwarden',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'organization.00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from the organization’s API key.',
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
    'data_classification',
    'mfa_enforcement',
  ],
}
