// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GustoCredentials dataclass in
// sentinel/integrations/gusto/adapter.py

import type { IntegrationConfig } from '../types'

export const GustoConfig: IntegrationConfig = {
  id: 'gusto',
  category: 'hr',
  name: 'Gusto',
  description:
    'Joiner-mover-leaver lifecycle evidence from Gusto: terminated-employee '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/gusto.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gusto',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Gusto Embedded Payroll app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
    {
      id: 'company_id',
      label: 'Company ID',
      type: 'text',
      required: true,
      placeholder: '123456',
      helpText: 'The Gusto company ID whose employee records should be evidenced.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
