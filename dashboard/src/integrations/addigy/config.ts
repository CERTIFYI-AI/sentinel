// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AddigyCredentials dataclass in
// sentinel/integrations/addigy/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const AddigyConfig: IntegrationConfig = {
  id: 'addigy',
  category: 'device',
  name: 'Addigy',
  description:
    'Device posture: device compliance, software update status, and policy '
    + 'enforcement across managed Apple devices.',
  logoUrl: '/integrations/addigy.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/addigy',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'your-client-id',
      helpText:
        'The API client ID from your Addigy account under Integrations > API.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The API client credential. Sent once over TLS and stored AES-256-GCM '
        + 'encrypted on the server.',
    },
    {
      id: 'org',
      label: 'Organization ID',
      type: 'text',
      required: false,
      placeholder: 'my-org-id',
      helpText:
        'Optional. Required only for multi-org setups — leave blank for '
        + 'single-org accounts.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'access_control',
  ],
}
