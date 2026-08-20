// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GcpConfig: IntegrationConfig = {
  id: 'google_cloud_platform',
  category: 'cloud',
  name: 'Google Cloud Platform',
  description:
    'Project security posture: service-account key hygiene, '
    + 'project inventory, and audit-log configuration.',
  logoUrl: '/integrations/gcp.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gcp',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'service_account_json',
      label: 'Service account key (JSON)',
      type: 'password',
      required: true,
      placeholder: '{"type":"service_account","project_id":…}',
      helpText:
        'Service account key with Viewer and Security Reviewer roles '
        + 'on the project. Read-only — no write permission is needed.',
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: true,
      placeholder: 'my-project-123',
      helpText: 'The GCP project to audit.',
    },
  ],
  checkCategories: ['secret_management', 'change_management', 'audit_logging'],
}
