// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GongCredentials dataclass in
// sentinel/integrations/gong/adapter.py

import type { IntegrationConfig } from '../types'

export const GongConfig: IntegrationConfig = {
  id: 'gong',
  category: 'collaboration',
  name: 'Gong',
  description:
    'User roster and call-recording access posture from Gong for '
    + 'access-review evidence: dormant admins, SSO/MFA enforcement, and '
    + 'recording access from unexpected email domains.',
  logoUrl: '/integrations/gong.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gong',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_key_id',
      label: 'Access key ID',
      type: 'text',
      required: true,
      placeholder: 'XXXXXXXXXXXXXXXXXXXX',
      helpText: 'The access key ID half of a Gong API key pair, from Company Settings > API.',
    },
    {
      id: 'access_key_credential',
      label: 'Access key credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The access key credential (secret) half of the Gong API key pair.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
