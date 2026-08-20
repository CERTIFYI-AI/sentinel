// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NinjaOneCredentials dataclass in
// sentinel/integrations/ninjaone/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const NinjaOneConfig: IntegrationConfig = {
  id: 'ninjaone',
  category: 'device',
  name: 'NinjaOne',
  description:
    'Device posture: endpoint health, OS patch compliance, antivirus status '
    + 'and activity audit log availability via the NinjaOne RMM platform.',
  logoUrl: '/integrations/ninjaone.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ninjaone',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'region',
      label: 'Instance region',
      type: 'text',
      required: true,
      placeholder: 'app',
      helpText:
        'Instance region: app (US), eu, oc, ca.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '',
      helpText:
        'The OAuth application client ID from NinjaOne Administration '
        + '→ Apps → API.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The OAuth application client credential. Sent once over TLS and '
        + 'stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'audit_logging',
  ],
}
