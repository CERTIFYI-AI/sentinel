// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SquarePayrollCredentials dataclass in
// sentinel/integrations/square_payroll/adapter.py

import type { IntegrationConfig } from '../types'

export const SquarePayrollConfig: IntegrationConfig = {
  id: 'square_payroll',
  category: 'hr',
  name: 'Square Payroll',
  description:
    'Joiner-mover-leaver evidence from Square Team Members: terminated-employee '
    + 'status hygiene, manager-assignment coverage, and employment record change '
    + 'history.',
  logoUrl: '/integrations/square_payroll.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/square_payroll',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer access token from a Square application with the EMPLOYEES_READ scope.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
