// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the KandjiIruCredentials dataclass in
// sentinel/integrations/kandji_iru/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const KandjiIruConfig: IntegrationConfig = {
  id: 'kandji_iru',
  category: 'device',
  name: 'Kandji',
  description:
    'Device posture: device status health, FileVault encryption, and app/OS '
    + 'update compliance across managed Apple devices.',
  logoUrl: '/integrations/kandji.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/kandji',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'subdomain_url',
      label: 'Kandji API URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourco.api.kandji.io',
      helpText:
        'Your Kandji API subdomain URL. Find it under Settings > Access in '
        + 'the Kandji console.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue a read-only API token under Settings > Access. Sent once over '
        + 'TLS and stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'encryption_at_rest',
    'vulnerability_management',
  ],
}
