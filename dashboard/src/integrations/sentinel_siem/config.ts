// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

const sharedFields: IntegrationConfig['credentialFields'] = [
  {
    id: 'tenant_id',
    label: 'Directory (tenant) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText: 'Entra admin centre → Overview. The directory this connection governs.',
  },
  {
    id: 'client_id',
    label: 'Application (client) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText:
      'The app registration Sentinel authenticates as. It needs read-only '
      + 'application permissions — SecurityEvents.Read.All, '
      + 'SecurityActions.Read.All — with admin consent.',
  },
  {
    id: 'client_secret',
    label: 'Client secret',
    type: 'password',
    required: true,
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText:
      'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
  },
]

export const SentinelSiemConfig: IntegrationConfig = {
  id: 'microsoft_sentinel',
  category: 'siem',
  name: 'Microsoft Sentinel',
  description:
    'SIEM posture: incident volume, active incident triage, and '
    + 'alert source diversity.',
  logoUrl: '/integrations/sentinel_siem.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sentinel',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: ['incident_response', 'audit_logging'],
}
