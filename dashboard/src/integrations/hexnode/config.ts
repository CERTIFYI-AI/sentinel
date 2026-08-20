// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HexnodeCredentials dataclass in
// sentinel/integrations/hexnode/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const HexnodeConfig: IntegrationConfig = {
  id: 'hexnode',
  category: 'device',
  name: 'Hexnode',
  description:
    'Device posture: device compliance, disk encryption policy enforcement, '
    + 'and OS version currency across managed endpoints.',
  logoUrl: '/integrations/hexnode.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hexnode',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'subdomain',
      label: 'Hexnode subdomain',
      type: 'text',
      required: true,
      placeholder: 'yourco',
      helpText:
        'Your Hexnode subdomain (e.g. "yourco" for yourco.hexnodemdm.com). '
        + 'Do not include the full URL.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue an API token under Admin > API in the Hexnode console. Sent '
        + 'once over TLS and stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'encryption_at_rest',
    'vulnerability_management',
  ],
}
