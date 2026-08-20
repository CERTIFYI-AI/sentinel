// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MondayComCredentials dataclass in
// sentinel/integrations/monday_com/adapter.py

import type { IntegrationConfig } from '../types'

export const MondayComConfig: IntegrationConfig = {
  id: 'monday_com',
  category: 'collaboration',
  name: 'monday.com',
  description:
    'Access-review and data-location evidence from monday.com: disabled '
    + 'admin account hygiene, audit log retrievability, and boards shared '
    + 'externally via public link.',
  logoUrl: '/integrations/monday_com.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/monday_com',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A monday.com API token with admin read access, from Admin > API.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
