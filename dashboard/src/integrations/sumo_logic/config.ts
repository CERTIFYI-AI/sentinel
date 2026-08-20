// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SumoLogicCredentials dataclass in
// sentinel/integrations/sumo_logic/adapter.py

import type { IntegrationConfig } from '../types'

export const SumoLogicConfig: IntegrationConfig = {
  id: 'sumo_logic',
  category: 'siem',
  name: 'Sumo Logic',
  description:
    'Cloud SIEM posture: collector health, log ingest volume, and '
    + 'scheduled search count for audit logging and incident response '
    + 'evidence.',
  logoUrl: '/integrations/sumo_logic.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sumo_logic',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_id',
      label: 'Access ID',
      type: 'text',
      required: true,
      placeholder: 'suXXXXXXXXXXXXXX',
      helpText:
        'Your Sumo Logic access ID (Administration > Security > '
        + 'Access Keys).',
    },
    {
      id: 'access_key',
      label: 'Access key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The access key paired with the access ID above.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
