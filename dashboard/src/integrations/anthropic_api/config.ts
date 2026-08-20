// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const AnthropicApiConfig: IntegrationConfig = {
  id: 'anthropic_claude_api',
  category: 'ai',
  name: 'Anthropic (Claude API)',
  description:
    'Organisation posture: model access, workspace membership, API key inventory, '
    + 'and usage boundaries for the Anthropic Claude API.',
  logoUrl: '/integrations/anthropic.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/anthropic-api',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Admin API key',
      type: 'password',
      required: true,
      placeholder: 'sk-ant-admin...',
      helpText: 'An admin-level API key for the organisation.',
    },
    {
      id: 'organization_id',
      label: 'Organisation ID',
      type: 'text',
      required: false,
      placeholder: 'org-...',
      helpText: 'The Anthropic organisation the key is scoped to.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'audit_logging',
  ],
}
