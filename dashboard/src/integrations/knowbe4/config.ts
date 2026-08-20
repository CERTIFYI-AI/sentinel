// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the Knowbe4Credentials dataclass in
// sentinel/integrations/knowbe4/adapter.py

import type { IntegrationConfig } from '../types'

export const Knowbe4Config: IntegrationConfig = {
  id: 'knowbe4',
  category: 'training',
  name: 'KnowBe4',
  description:
    'Security-awareness training completion, phishing-simulation click '
    + 'rates, and overdue training enrollments from the KnowBe4 Reporting API.',
  logoUrl: '/integrations/knowbe4.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/knowbe4',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from KnowBe4 Account Settings > API Access, with Reporting API read permissions.',
    },
  ],
  checkCategories: [
    'hr_controls',
    'incident_response',
  ],
}
