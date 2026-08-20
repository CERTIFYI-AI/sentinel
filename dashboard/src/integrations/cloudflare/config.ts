// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CloudflareCredentials dataclass in
// sentinel/integrations/cloudflare/adapter.py

import type { IntegrationConfig } from '../types'

export const CloudflareConfig: IntegrationConfig = {
  id: 'cloudflare',
  category: 'cloud',
  name: 'Cloudflare',
  description:
    'Account and zone security posture: non-expiring or stale API tokens, WAF '
    + 'managed-ruleset enforcement per zone, and Always Online resilience.',
  logoUrl: '/integrations/cloudflare.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/cloudflare',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••••••••••',
      helpText: 'A scoped Cloudflare API Token with Zone WAF Read, Zone Settings Read, and API Tokens Read permissions.',
    },
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: '023e105f4ecef8ad9ca31a8372d0c353',
      helpText: 'The Cloudflare account ID the token operates against (Dashboard > any domain > Account ID in the sidebar).',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
