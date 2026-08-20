// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HumaansCredentials dataclass in
// sentinel/integrations/humaans/adapter.py

import type { IntegrationConfig } from '../types'

export const HumaansConfig: IntegrationConfig = {
  id: 'humaans',
  category: 'hr',
  name: 'Humaans',
  description:
    'Joiner-mover-leaver evidence from Humaans: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/humaans.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/humaans',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Humaans > Settings > API with read access to people and change requests.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
