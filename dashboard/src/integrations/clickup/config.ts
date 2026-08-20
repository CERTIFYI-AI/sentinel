// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ClickupCredentials dataclass in
// sentinel/integrations/clickup/adapter.py

import type { IntegrationConfig } from '../types'

export const ClickupConfig: IntegrationConfig = {
  id: 'clickup',
  category: 'collaboration',
  name: 'ClickUp',
  description:
    'Access-review and data-location evidence from ClickUp: owner/admin '
    + 'account hygiene, two-factor authentication enforcement, and items '
    + 'shared outside the workspace.',
  logoUrl: '/integrations/clickup.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/clickup',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A ClickUp API token with workspace read access, from Settings > Apps.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
