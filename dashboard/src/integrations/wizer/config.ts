// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the WizerCredentials dataclass in
// sentinel/integrations/wizer/adapter.py

import type { IntegrationConfig } from '../types'

export const WizerConfig: IntegrationConfig = {
  id: 'wizer',
  category: 'training',
  name: 'Wizer',
  description:
    'Security-awareness training completion, phishing-simulation click '
    + 'rates, and report rates from the Wizer API.',
  logoUrl: '/integrations/wizer.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/wizer',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Wizer Account Settings > API, with read access to training and phishing data.',
    },
  ],
  checkCategories: [
    'hr_controls',
    'incident_response',
  ],
}
