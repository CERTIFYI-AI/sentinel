// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the FleetDMCredentials dataclass in
// sentinel/integrations/fleetdm/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const FleetDMConfig: IntegrationConfig = {
  id: 'fleetdm',
  category: 'device',
  name: 'FleetDM',
  description:
    'Host posture: host status health, CVE vulnerability detection, and disk '
    + 'encryption compliance across managed endpoints.',
  logoUrl: '/integrations/fleetdm.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/fleetdm',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Fleet server URL',
      type: 'url',
      required: true,
      placeholder: 'https://fleet.example.com',
      helpText:
        'The full URL of your Fleet server, including the protocol.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue a token for a read-only API user. Sent once over TLS and '
        + 'stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'encryption_at_rest',
  ],
}
