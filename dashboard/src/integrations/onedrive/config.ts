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
      + 'application permissions — Files.Read.All, User.Read.All — with admin consent.',
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

export const OneDriveConfig: IntegrationConfig = {
  id: 'microsoft_onedrive',
  category: 'collaboration',
  name: 'Microsoft OneDrive for Business',
  description:
    'OneDrive governance: drive inventory and storage quota utilisation monitoring.',
  logoUrl: '/integrations/onedrive.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/onedrive',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: ['data_classification'],
}
