// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SnykCredentials dataclass in
// sentinel/integrations/snyk/adapter.py

import type { IntegrationConfig } from '../types'

export const SnykConfig: IntegrationConfig = {
  id: 'snyk',
  category: 'security',
  name: 'Snyk',
  description:
    'Developer security posture: open vulnerability count, license '
    + 'compliance, and project monitoring status for vulnerability '
    + 'management and change management evidence.',
  logoUrl: '/integrations/snyk.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/snyk',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Snyk API token with read access to the organization.',
    },
    {
      id: 'org_id',
      label: 'Organization ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'The UUID of your Snyk organization (Settings > General > '
        + 'Organization ID).',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
