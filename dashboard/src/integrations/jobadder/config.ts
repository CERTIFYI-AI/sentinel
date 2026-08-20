// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JobadderCredentials dataclass in
// sentinel/integrations/jobadder/adapter.py

import type { IntegrationConfig } from '../types'

export const JobadderConfig: IntegrationConfig = {
  id: 'jobadder',
  category: 'hiring',
  name: 'JobAdder',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from JobAdder.',
  logoUrl: '/integrations/jobadder.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jobadder',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your JobAdder connected app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
