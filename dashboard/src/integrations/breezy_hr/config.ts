// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BreezyHrCredentials dataclass in
// sentinel/integrations/breezy_hr/adapter.py

import type { IntegrationConfig } from '../types'

export const BreezyHrConfig: IntegrationConfig = {
  id: 'breezy_hr',
  category: 'hiring',
  name: 'Breezy HR',
  description:
    'Applicant-tracking posture: candidate PII access scope, offer-approval '
    + 'workflow evidence, and recruiter/admin account hygiene from Breezy HR.',
  logoUrl: '/integrations/breezy_hr.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/breezy_hr',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Breezy HR company settings with read access to users and offer settings.',
    },
  ],
  checkCategories: [
    'access_control',
    'change_management',
    'least_privilege',
  ],
}
