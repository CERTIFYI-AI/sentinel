// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MosyleCredentials dataclass in
// sentinel/integrations/mosyle/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const MosyleConfig: IntegrationConfig = {
  id: 'mosyle',
  category: 'device',
  name: 'Mosyle',
  description:
    'Device posture: device compliance, encryption status, and app/OS update '
    + 'compliance across managed Apple devices.',
  logoUrl: '/integrations/mosyle.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/mosyle',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue a read-only API token in the Mosyle admin console under '
        + 'Organization > Settings > API Integration. Sent once over TLS and '
        + 'stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'account',
      label: 'Account ID',
      type: 'text',
      required: false,
      placeholder: 'my-account-id',
      helpText:
        'Optional. Required only for multi-account setups — leave blank for '
        + 'single-account tenants.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'encryption_at_rest',
    'vulnerability_management',
  ],
}
