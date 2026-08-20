// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the RampCredentials dataclass in
// sentinel/integrations/ramp/adapter.py

import type { IntegrationConfig } from '../types'

export const RampConfig: IntegrationConfig = {
  id: 'ramp',
  category: 'saas',
  name: 'Ramp',
  description:
    'Users and card transactions from Ramp for financial-controls-access '
    + 'evidence: inactive admins with card-issuing authority and '
    + 'unreviewed high-value transactions.',
  logoUrl: '/integrations/ramp.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ramp',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'ramp_client_XXXXXXXXXXXXXXXX',
      helpText: 'The OAuth2 client ID from your Ramp API client.',
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
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
