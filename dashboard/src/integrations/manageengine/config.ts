// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ManageEngineCredentials dataclass in
// sentinel/integrations/manageengine/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const ManageEngineConfig: IntegrationConfig = {
  id: 'manageengine',
  category: 'device',
  name: 'ManageEngine Endpoint Central',
  description:
    'Device posture: endpoint agent status, patch compliance and '
    + 'configuration deployment status via ManageEngine Endpoint Central.',
  logoUrl: '/integrations/manageengine.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/manageengine',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Server URL',
      type: 'url',
      required: true,
      placeholder: 'https://endpointcentral.example.com',
      helpText:
        'The base URL of your Endpoint Central server.',
    },
    {
      id: 'api_token',
      label: 'API auth token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'An API authentication token with read access. Sent once over TLS '
        + 'and stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'access_control',
  ],
}
