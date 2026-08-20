// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CrowdStrikeCredentials dataclass in
// sentinel/integrations/crowdstrike/adapter.py

import type { IntegrationConfig } from '../types'

export const CrowdStrikeConfig: IntegrationConfig = {
  id: 'crowdstrike',
  category: 'security',
  name: 'CrowdStrike',
  description:
    'EDR posture: Falcon sensor coverage, Spotlight vulnerabilities, '
    + 'and open incident queue.',
  logoUrl: '/integrations/crowdstrike.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/crowdstrike',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      helpText: 'The OAuth2 Client ID from Falcon > API Clients & Keys.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the Client ID.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'incident_response',
  ],
}
