// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BrexCredentials dataclass in
// sentinel/integrations/brex/adapter.py

import type { IntegrationConfig } from '../types'

export const BrexConfig: IntegrationConfig = {
  id: 'brex',
  category: 'saas',
  name: 'Brex',
  description:
    'Users, spend budgets, and card transactions from Brex for '
    + 'financial-controls-access evidence: inactive spend approvers and '
    + 'unreviewed high-value transactions.',
  logoUrl: '/integrations/brex.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/brex',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Brex API token issued from the Brex Developer Dashboard with read scopes.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
