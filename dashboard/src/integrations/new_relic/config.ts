// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NewRelicCredentials dataclass in
// sentinel/integrations/new_relic/adapter.py

import type { IntegrationConfig } from '../types'

export const NewRelicConfig: IntegrationConfig = {
  id: 'new_relic',
  category: 'security',
  name: 'New Relic',
  description:
    'Observability posture: alert policies, open violations, '
    + 'and NerdGraph API access for audit evidence.',
  logoUrl: '/integrations/new_relic.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/new_relic',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: '1234567',
      helpText: 'Your New Relic account ID (visible in the URL when logged in).',
    },
    {
      id: 'api_key',
      label: 'User API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A New Relic User API key from API Keys settings.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'vulnerability_management',
  ],
}
