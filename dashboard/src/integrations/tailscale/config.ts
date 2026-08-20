// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TailscaleCredentials dataclass in
// sentinel/integrations/tailscale/adapter.py

import type { IntegrationConfig } from '../types'

export const TailscaleConfig: IntegrationConfig = {
  id: 'tailscale',
  category: 'security',
  name: 'Tailscale',
  description:
    'Zero-trust networking posture: device compliance, ACL policy audit, '
    + 'and MFA enforcement for network security, access control, and '
    + 'MFA evidence.',
  logoUrl: '/integrations/tailscale.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/tailscale',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Tailscale API key with read access to devices, ACLs, and '
        + 'auth keys (Settings > Keys > API keys).',
    },
    {
      id: 'tailnet',
      label: 'Tailnet name',
      type: 'text',
      required: true,
      placeholder: 'example.com',
      helpText:
        'Your tailnet name, usually your organization domain '
        + '(visible at the top of the Tailscale admin console).',
    },
  ],
  checkCategories: [
    'network_security',
    'access_control',
    'mfa_enforcement',
  ],
}
