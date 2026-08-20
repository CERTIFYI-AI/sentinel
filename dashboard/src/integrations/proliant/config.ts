// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ProliantCredentials dataclass in
// sentinel/integrations/proliant/adapter.py

import type { IntegrationConfig } from '../types'

export const ProliantConfig: IntegrationConfig = {
  id: 'proliant',
  category: 'hr',
  name: 'Proliant',
  description:
    'Joiner-mover-leaver evidence from Proliant US Payroll: '
    + 'terminated-employee deactivation, manager assignment coverage, and '
    + 'employment record change history for access-review and offboarding '
    + 'compliance.',
  logoUrl: '/integrations/proliant.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/proliant',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Proliant API service account.',
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
