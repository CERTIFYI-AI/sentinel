// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const AnthropicConsoleConfig: IntegrationConfig = {
  id: 'anthropic_claude_console',
  category: 'ai',
  name: 'Anthropic Claude Console',
  description:
    'Console-level posture: user management, SSO configuration, '
    + 'pending invitations, and security settings.',
  logoUrl: '/integrations/anthropic.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/anthropic-console',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Admin API key',
      type: 'password',
      required: true,
      placeholder: 'sk-ant-admin...',
      helpText: 'An admin-level API key for the console organisation.',
    },
    {
      id: 'organization_id',
      label: 'Organisation ID',
      type: 'text',
      required: false,
      placeholder: 'org-...',
      helpText: 'The Anthropic Console organisation.',
    },
  ],
  checkCategories: [
    'access_control',
    'mfa_enforcement',
  ],
}
