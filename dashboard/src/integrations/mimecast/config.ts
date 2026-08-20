// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MimecastCredentials dataclass in
// sentinel/integrations/mimecast/adapter.py

import type { IntegrationConfig } from '../types'

export const MimecastConfig: IntegrationConfig = {
  id: 'mimecast',
  category: 'security',
  name: 'Mimecast',
  description:
    'Email-security gateway posture: inbound malicious-email blocking, '
    + 'DMARC/DKIM enforcement across sending domains, and the quarantine '
    + 'hold/release audit trail from the Mimecast API 2.0.',
  logoUrl: '/integrations/mimecast.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/mimecast',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Mimecast API 2.0 application.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'incident_response',
    'network_security',
    'audit_logging',
  ],
}
