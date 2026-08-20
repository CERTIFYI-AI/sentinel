// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BasecampCredentials dataclass in
// sentinel/integrations/basecamp/adapter.py

import type { IntegrationConfig } from '../types'

export const BasecampConfig: IntegrationConfig = {
  id: 'basecamp',
  category: 'collaboration',
  name: 'Basecamp',
  description:
    'Access-review and data-location evidence from Basecamp: admin '
    + 'account hygiene, single sign-on enforcement, and projects exposing '
    + 'data to external clients.',
  logoUrl: '/integrations/basecamp.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/basecamp',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000000000000000000000000000000000000000000000000000000000',
      helpText: 'The OAuth2 client ID from your 37signals integration.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: '1234567',
      helpText: 'The numeric Basecamp account ID (found in your Basecamp URL).',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
