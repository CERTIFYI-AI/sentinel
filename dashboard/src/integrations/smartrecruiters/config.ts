// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SmartrecruitersCredentials dataclass in
// sentinel/integrations/smartrecruiters/adapter.py

import type { IntegrationConfig } from '../types'

export const SmartrecruitersConfig: IntegrationConfig = {
  id: 'smartrecruiters',
  category: 'hiring',
  name: 'SmartRecruiters',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from '
    + 'SmartRecruiters.',
  logoUrl: '/integrations/smartrecruiters.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/smartrecruiters',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from SmartRecruiters admin settings with read access to team members and offer configuration.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
