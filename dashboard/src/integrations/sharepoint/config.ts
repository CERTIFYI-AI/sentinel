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
      + 'application permissions — Sites.Read.All, Files.Read.All — with admin consent.',
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

export const SharePointConfig: IntegrationConfig = {
  id: 'microsoft_sharepoint',
  category: 'collaboration',
  name: 'Microsoft SharePoint',
  description:
    'SharePoint governance: external sharing level, anonymous links, '
    + 'document versioning, and site inventory.',
  logoUrl: '/integrations/sharepoint.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sharepoint',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: ['access_control', 'change_management', 'data_classification'],
}
