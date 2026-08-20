// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HibobCredentials dataclass in
// sentinel/integrations/hibob/adapter.py

import type { IntegrationConfig } from '../types'

export const HibobConfig: IntegrationConfig = {
  id: 'hibob',
  category: 'hr',
  name: 'HiBob',
  description:
    'Joiner-mover-leaver lifecycle evidence from HiBob: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/hibob.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hibob',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'service_user_id',
      label: 'Service User ID',
      type: 'text',
      required: true,
      placeholder: 'SERVICE-000001',
      helpText: 'The Service User ID from HiBob Settings > API > Service Users.',
    },
    {
      id: 'credential',
      label: 'Service User token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The token generated for the Service User, used as the Basic auth password.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
