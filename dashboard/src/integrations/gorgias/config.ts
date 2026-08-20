// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GorgiasCredentials dataclass in
// sentinel/integrations/gorgias/adapter.py

import type { IntegrationConfig } from '../types'

export const GorgiasConfig: IntegrationConfig = {
  id: 'gorgias',
  category: 'collaboration',
  name: 'Gorgias',
  description:
    'Agent roster, SSO/MFA enforcement, and connected-integration scope '
    + 'review from the Gorgias helpdesk for access-review evidence.',
  logoUrl: '/integrations/gorgias.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gorgias',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'domain',
      label: 'Gorgias domain',
      type: 'text',
      required: true,
      placeholder: 'yourcompany',
      helpText: 'Your Gorgias subdomain, e.g. "yourcompany" for yourcompany.gorgias.com.',
    },
    {
      id: 'user_email',
      label: 'User email',
      type: 'text',
      required: true,
      placeholder: 'integrations@yourcompany.com',
      helpText: 'The email address of the Gorgias user the API key was issued for.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The REST API key generated for this user in Gorgias Settings > REST API.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
