// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TeamworkCredentials dataclass in
// sentinel/integrations/teamwork/adapter.py

import type { IntegrationConfig } from '../types'

export const TeamworkConfig: IntegrationConfig = {
  id: 'teamwork',
  category: 'ticketing',
  name: 'Teamwork',
  description:
    'Access-review and data-location evidence from Teamwork Projects: '
    + 'dormant site-administrator accounts, account-wide two-factor '
    + 'authentication enforcement, and projects opened up to every user.',
  logoUrl: '/integrations/teamwork.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/teamwork',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'domain',
      label: 'Installation domain',
      type: 'text',
      required: true,
      placeholder: 'yourcompany.teamwork.com',
      helpText: 'Your Teamwork site domain, without the protocol.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Teamwork API key from your profile (My Info > API & Mobile). '
        + 'Read-only access to people, account, and project data is sufficient.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
