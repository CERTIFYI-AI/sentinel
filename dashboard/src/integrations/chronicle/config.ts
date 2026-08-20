// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const ChronicleConfig: IntegrationConfig = {
  id: 'google_chronicle',
  category: 'siem',
  name: 'Google Chronicle',
  description:
    'SIEM coverage: alert volume trends and detection rule inventory.',
  logoUrl: '/integrations/chronicle.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/chronicle',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'service_account_json',
      label: 'Service account key (JSON)',
      type: 'password',
      required: true,
      placeholder: '{"type":"service_account","project_id":…}',
      helpText:
        'Service account key with Chronicle API Reader role.',
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: true,
      placeholder: 'my-project-123',
      helpText: 'The GCP project bound to the Chronicle instance.',
    },
    {
      id: 'instance_id',
      label: 'Chronicle instance ID',
      type: 'text',
      required: true,
      placeholder: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      helpText: 'The Chronicle instance UUID.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: false,
      placeholder: 'us',
      helpText: 'Chronicle region. Defaults to us.',
    },
  ],
  checkCategories: ['incident_response', 'audit_logging'],
}
