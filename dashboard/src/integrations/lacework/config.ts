// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the LaceworkCredentials dataclass in
// sentinel/integrations/lacework/adapter.py

import type { IntegrationConfig } from '../types'

export const LaceworkConfig: IntegrationConfig = {
  id: 'lacework',
  category: 'security',
  name: 'Lacework',
  description:
    'Cloud-security posture: compliance violations, host vulnerability '
    + 'assessments, and agent deployment status.',
  logoUrl: '/integrations/lacework.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/lacework',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'account',
      label: 'Account subdomain',
      type: 'text',
      required: true,
      placeholder: 'mycompany',
      helpText: 'Your Lacework account subdomain (e.g. "mycompany" from mycompany.lacework.net).',
    },
    {
      id: 'api_key',
      label: 'API key ID',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The API Key ID from Lacework Console > Settings > API Keys.',
    },
    {
      id: 'api_credential',
      label: 'API credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The API credential (generated key content) paired with the API Key ID.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'endpoint_protection',
  ],
}
