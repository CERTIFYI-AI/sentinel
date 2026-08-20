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
      + 'application permissions — Machine.Read.All, SecurityEvents.Read.All, '
      + 'Vulnerability.Read.All — with admin consent.',
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

const sharedCheckCategories = [
  'incident_response',
  'endpoint_protection',
  'vulnerability_management',
]

export const DefenderConfig: IntegrationConfig = {
  id: 'microsoft_defender_for_endpoint',
  category: 'security',
  name: 'Microsoft Defender for Endpoint',
  description:
    'Endpoint security posture: active alerts, machine inventory, '
    + 'secure score, and vulnerability tracking.',
  logoUrl: '/integrations/defender.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/defender',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}

export const DefenderGccHighConfig: IntegrationConfig = {
  id: 'microsoft_defender_for_endpoint_gcc_high',
  category: 'security',
  name: 'Microsoft Defender for Endpoint (GCC High)',
  description:
    'The same endpoint security checks as the commercial connector, against '
    + 'the US Government cloud endpoints.',
  logoUrl: '/integrations/defender.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/defender',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}
