// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GoogleCloudIdentityConfig: IntegrationConfig = {
  id: 'google_cloud_identity',
  category: 'identity',
  name: 'Google Cloud Identity',
  description:
    'Group inventory and external-member detection across '
    + 'Cloud Identity groups.',
  logoUrl: '/integrations/google_cloud_identity.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/google-cloud-identity',
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
        + 'Cloud Identity Groups API enabled.',
    },
    {
      id: 'delegated_admin_email',
      label: 'Delegated admin email',
      type: 'text',
      required: true,
      placeholder: 'admin@example.com',
      helpText: 'A Workspace super-admin email for domain-wide delegation.',
    },
  ],
  checkCategories: ['access_control'],
}
