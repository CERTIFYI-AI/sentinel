// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SecurityScorecardCredentials dataclass in
// sentinel/integrations/securityscorecard/adapter.py

import type { IntegrationConfig } from '../types'

export const SecurityScorecardConfig: IntegrationConfig = {
  id: 'securityscorecard',
  category: 'security',
  name: 'SecurityScorecard',
  description:
    'Cyber risk ratings: portfolio scores for vendor management and '
    + 'active security issues for vulnerability management evidence.',
  logoUrl: '/integrations/securityscorecard.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/securityscorecard',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A SecurityScorecard API token with read access to portfolios '
        + 'and scorecards.',
    },
  ],
  checkCategories: [
    'vendor_management',
    'vulnerability_management',
  ],
}
