// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SmartsheetCredentials dataclass in
// sentinel/integrations/smartsheet/adapter.py

import type { IntegrationConfig } from '../types'

export const SmartsheetConfig: IntegrationConfig = {
  id: 'smartsheet',
  category: 'collaboration',
  name: 'Smartsheet',
  description:
    'Access-review and data-location evidence from Smartsheet: system '
    + 'admin account hygiene, single sign-on enforcement, and sheets '
    + 'published for anyone-with-the-link access.',
  logoUrl: '/integrations/smartsheet.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/smartsheet',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Smartsheet API access token with system admin read access, from Account > Apps & Integrations > API Access.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
