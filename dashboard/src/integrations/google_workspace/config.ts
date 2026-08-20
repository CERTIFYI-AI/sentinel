// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const GoogleWorkspaceConfig: IntegrationConfig = {
  id: 'google_workspace',
  category: 'identity',
  name: 'Google Workspace',
  description:
    'Directory posture: MFA enrolment across the domain, admin sprawl, '
    + 'and suspended-user inventory.',
  logoUrl: '/integrations/google_workspace.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/google-workspace',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'service_account_json',
      label: 'Service account key (JSON)',
      type: 'password',
      required: true,
      placeholder: '{"type":"service_account","project_id":…}',
      helpText:
        'The full JSON key file content for a service account with '
        + 'domain-wide delegation and the Admin SDK Directory API enabled.',
    },
    {
      id: 'delegated_admin_email',
      label: 'Delegated admin email',
      type: 'text',
      required: true,
      placeholder: 'admin@example.com',
      helpText:
        'A Workspace super-admin email the service account impersonates '
        + 'via domain-wide delegation.',
    },
  ],
  checkCategories: ['mfa_enforcement', 'least_privilege', 'access_control'],
}
