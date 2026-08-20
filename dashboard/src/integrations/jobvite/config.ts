// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JobviteCredentials dataclass in
// sentinel/integrations/jobvite/adapter.py

import type { IntegrationConfig } from '../types'

export const JobviteConfig: IntegrationConfig = {
  id: 'jobvite',
  category: 'hiring',
  name: 'Jobvite',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from Jobvite.',
  logoUrl: '/integrations/jobvite.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jobvite',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Jobvite API key issued from company API settings.',
    },
    {
      id: 'api_credential',
      label: 'API secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The API secret paired with the Jobvite API key.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
