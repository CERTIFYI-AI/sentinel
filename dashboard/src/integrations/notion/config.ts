// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NotionCredentials dataclass in
// sentinel/integrations/notion/adapter.py

import type { IntegrationConfig } from '../types'

export const NotionConfig: IntegrationConfig = {
  id: 'notion',
  category: 'collaboration',
  name: 'Notion',
  description:
    'Access-review and data-location evidence: bot/integration accounts '
    + 'with workspace access, audit log retrievability, and pages or '
    + 'databases shared to the public web.',
  logoUrl: '/integrations/notion.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/notion',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Internal integration secret',
      type: 'password',
      required: true,
      placeholder: 'secret_••••••••••••••••••••••••',
      helpText:
        'An internal integration secret from Notion, shared with the '
        + 'workspace pages you want evidenced.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
