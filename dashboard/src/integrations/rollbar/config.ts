// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the RollbarCredentials dataclass in
// sentinel/integrations/rollbar/adapter.py

import type { IntegrationConfig } from '../types'

export const RollbarConfig: IntegrationConfig = {
  id: 'rollbar',
  category: 'security',
  name: 'Rollbar',
  description:
    'Error tracking posture: project activity for audit logging and '
    + 'recent error/critical items for incident response evidence.',
  logoUrl: '/integrations/rollbar.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/rollbar',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A project or account-level read access token. Sentinel only '
        + 'reads data; write scope is not required.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
