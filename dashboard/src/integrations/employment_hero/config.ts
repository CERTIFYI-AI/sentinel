// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the EmploymentHeroCredentials dataclass in
// sentinel/integrations/employment_hero/adapter.py

import type { IntegrationConfig } from '../types'

export const EmploymentHeroConfig: IntegrationConfig = {
  id: 'employment_hero',
  category: 'hr',
  name: 'Employment Hero',
  description:
    'Joiner-mover-leaver evidence from Employment Hero: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/employment_hero.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/employment_hero',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Employment Hero API application.',
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
    'hr_controls',
    'audit_logging',
  ],
}
