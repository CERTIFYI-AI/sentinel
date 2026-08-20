// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the WorkdayCredentials dataclass in
// sentinel/integrations/workday/adapter.py

import type { IntegrationConfig } from '../types'

export const WorkdayConfig: IntegrationConfig = {
  id: 'workday',
  category: 'hr',
  name: 'Workday',
  description:
    'Joiner-mover-leaver evidence from Workday HCM: worker roster and '
    + 'employment status, manager assignments, and staffing event history '
    + 'for access-review and offboarding compliance.',
  logoUrl: '/integrations/workday.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/workday',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'tenant_url',
      label: 'Tenant URL',
      type: 'url',
      required: true,
      placeholder: 'https://wd2-impl-services1.workday.com/ccx',
      helpText: 'Your Workday tenant/instance base URL.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Workday Integration System User (ISU) API client.',
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
