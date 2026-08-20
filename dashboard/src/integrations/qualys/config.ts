// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the QualysCredentials dataclass in
// sentinel/integrations/qualys/adapter.py

import type { IntegrationConfig } from '../types'

export const QualysConfig: IntegrationConfig = {
  id: 'qualys',
  category: 'security',
  name: 'Qualys',
  description:
    'Vulnerability management: host detection summaries, severity '
    + 'counts, and scan activity.',
  logoUrl: '/integrations/qualys.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/qualys',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_url',
      label: 'API URL',
      type: 'url',
      required: true,
      placeholder: 'https://qualysapi.qualys.com',
      helpText: 'The Qualys API base URL for your subscription (e.g. qualysapi.qualys.com, qualysapi.qg2.apps.qualys.com).',
    },
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'api_user',
      helpText: 'A Qualys user with API access (Manager or Reader role).',
    },
    {
      id: 'credential',
      label: 'Credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The credential for the Qualys API user.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
  ],
}
