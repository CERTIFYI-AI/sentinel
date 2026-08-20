// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AkamaiCredentials dataclass in
// sentinel/integrations/akamai/adapter.py

import type { IntegrationConfig } from '../types'

export const AkamaiConfig: IntegrationConfig = {
  id: 'akamai',
  category: 'cloud',
  name: 'Akamai',
  description:
    'Edge/CDN security posture: stale API clients, WAF enforcement across '
    + 'security configurations, and Property Manager version rollback coverage.',
  logoUrl: '/integrations/akamai.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/akamai',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'host',
      label: 'API host',
      type: 'text',
      required: true,
      placeholder: 'akaa-xxxxxxxxxxxx-xxxxxxxxxxxx.luna.akamaiapis.net',
      helpText: 'The tenant-specific EdgeGrid host from the API client credentials (Identity and Access Management > API Clients).',
    },
    {
      id: 'client_token',
      label: 'Client token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The EdgeGrid client token issued alongside the client and access credentials.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The EdgeGrid client secret used to derive the per-request signing key.',
    },
    {
      id: 'access_credential',
      label: 'Access credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The EdgeGrid access token paired with the client token above.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
