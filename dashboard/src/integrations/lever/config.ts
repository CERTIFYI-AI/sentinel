// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the LeverCredentials dataclass in
// sentinel/integrations/lever/adapter.py

import type { IntegrationConfig } from '../types'

export const LeverConfig: IntegrationConfig = {
  id: 'lever',
  category: 'hiring',
  name: 'Lever',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from Lever.',
  logoUrl: '/integrations/lever.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/lever',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Lever API key with read access to users and requisition fields (sent as the Basic auth username with a blank password).',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
