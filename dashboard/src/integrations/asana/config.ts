// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AsanaCredentials dataclass in
// sentinel/integrations/asana/adapter.py

import type { IntegrationConfig } from '../types'

export const AsanaConfig: IntegrationConfig = {
  id: 'asana',
  category: 'collaboration',
  name: 'Asana',
  description:
    'Access-review and data-location evidence from Asana: workspace admin '
    + 'account hygiene, audit log retrievability, and external guest '
    + 'access to the workspace.',
  logoUrl: '/integrations/asana.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/asana',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Personal access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An Asana Personal Access Token with workspace admin read access, from My Settings > Apps > Manage Developer Apps.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
