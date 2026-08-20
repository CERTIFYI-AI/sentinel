// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MiradoreCredentials dataclass in
// sentinel/integrations/miradore/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const MiradoreConfig: IntegrationConfig = {
  id: 'miradore',
  category: 'device',
  name: 'Miradore',
  description:
    'Device posture: compliance status, disk encryption and OS update '
    + 'currency via the Miradore MDM platform.',
  logoUrl: '/integrations/miradore.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/miradore',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'site',
      label: 'Site subdomain',
      type: 'text',
      required: true,
      placeholder: 'yourco',
      helpText:
        'yourco.online.miradore.com subdomain.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A read-only API token. Sent once over TLS and stored AES-256-GCM '
        + 'encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'encryption_at_rest',
    'vulnerability_management',
  ],
}
