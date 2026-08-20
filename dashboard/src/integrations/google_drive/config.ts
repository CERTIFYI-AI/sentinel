// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GoogleDriveConfig: IntegrationConfig = {
  id: 'google_drive',
  category: 'collaboration',
  name: 'Google Drive',
  description:
    'Sharing posture: externally shared files, anonymous links, '
    + 'and domain-wide sharing exposure.',
  logoUrl: '/integrations/google_drive.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/google-drive',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'service_account_json',
      label: 'Service account key (JSON)',
      type: 'password',
      required: true,
      placeholder: '{"type":"service_account","project_id":…}',
      helpText:
        'Service account key with domain-wide delegation and the '
        + 'Drive API enabled. Read-only scope.',
    },
    {
      id: 'delegated_admin_email',
      label: 'Delegated admin email',
      type: 'text',
      required: true,
      placeholder: 'admin@example.com',
      helpText: 'A Workspace admin email for domain-wide delegation.',
    },
  ],
  checkCategories: ['data_classification'],
}
