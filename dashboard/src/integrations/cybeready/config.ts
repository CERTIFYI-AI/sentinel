// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CybereadyCredentials dataclass in
// sentinel/integrations/cybeready/adapter.py

import type { IntegrationConfig } from '../types'

export const CybereadyConfig: IntegrationConfig = {
  id: 'cybeready',
  category: 'training',
  name: 'CybeReady',
  description:
    'Security-awareness training completion, phishing-simulation click '
    + 'rates, and repeat-clicker risk segmentation from the CybeReady API.',
  logoUrl: '/integrations/cybeready.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/cybeready',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from CybeReady Admin Console > API Access, with read access to training and phishing data.',
    },
  ],
  checkCategories: [
    'hr_controls',
    'incident_response',
  ],
}
