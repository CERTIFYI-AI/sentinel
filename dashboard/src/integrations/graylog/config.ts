// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GraylogCredentials dataclass in
// sentinel/integrations/graylog/adapter.py

import type { IntegrationConfig } from '../types'

export const GraylogConfig: IntegrationConfig = {
  id: 'graylog',
  category: 'siem',
  name: 'Graylog',
  description:
    'Log management posture: input health, stream count, and alert '
    + 'condition status for audit logging and incident response evidence.',
  logoUrl: '/integrations/graylog.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/graylog',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Graylog instance URL',
      type: 'text',
      required: true,
      placeholder: 'https://graylog.example.com',
      helpText:
        'The base URL of your Graylog instance.',
    },
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Graylog API token with read access to inputs, streams, '
        + 'and alert conditions (System > Users > Tokens).',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
