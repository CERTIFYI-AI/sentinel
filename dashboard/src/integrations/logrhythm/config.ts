// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the LogRhythmCredentials dataclass in
// sentinel/integrations/logrhythm/adapter.py

import type { IntegrationConfig } from '../types'

export const LogRhythmConfig: IntegrationConfig = {
  id: 'logrhythm',
  category: 'siem',
  name: 'LogRhythm',
  description:
    'SIEM posture: log source health, alarm count, and case management '
    + 'status for audit logging and incident response evidence.',
  logoUrl: '/integrations/logrhythm.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/logrhythm',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'LogRhythm instance URL',
      type: 'text',
      required: true,
      placeholder: 'https://logrhythm.example.com',
      helpText:
        'The base URL of your LogRhythm deployment manager.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A LogRhythm API key with read access to log sources, alarms, '
        + 'and cases (Administration > API Keys).',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
