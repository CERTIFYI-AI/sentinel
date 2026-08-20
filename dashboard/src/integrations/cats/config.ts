// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CatsCredentials dataclass in
// sentinel/integrations/cats/adapter.py

import type { IntegrationConfig } from '../types'

export const CatsConfig: IntegrationConfig = {
  id: 'cats',
  category: 'hiring',
  name: 'CATS',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from CATS ATS.',
  logoUrl: '/integrations/cats.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/cats',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from CATS API settings with read access to users and offer configuration.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
