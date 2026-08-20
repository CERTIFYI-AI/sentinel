// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TeamtailorCredentials dataclass in
// sentinel/integrations/teamtailor/adapter.py

import type { IntegrationConfig } from '../types'

export const TeamtailorConfig: IntegrationConfig = {
  id: 'teamtailor',
  category: 'hiring',
  name: 'Teamtailor',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from Teamtailor.',
  logoUrl: '/integrations/teamtailor.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/teamtailor',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Teamtailor API token with read access to users and offer configuration (sent as Token token=<key>).',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
