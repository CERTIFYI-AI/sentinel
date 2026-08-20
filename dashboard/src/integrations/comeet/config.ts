// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ComeetCredentials dataclass in
// sentinel/integrations/comeet/adapter.py

import type { IntegrationConfig } from '../types'

export const ComeetConfig: IntegrationConfig = {
  id: 'comeet',
  category: 'hiring',
  name: 'Comeet',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from Comeet.',
  logoUrl: '/integrations/comeet.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/comeet',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Comeet API key with read access to team members and offer-approval settings.',
    },
    {
      id: 'company_uid',
      label: 'Company UID',
      type: 'text',
      required: true,
      placeholder: 'ABCDEFGHIJ',
      helpText: 'The Comeet company UID that scopes every API request.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
