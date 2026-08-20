// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const OpenAiConfig: IntegrationConfig = {
  id: 'openai',
  category: 'ai',
  name: 'OpenAI',
  description:
    'Organisation posture: model inventory, member access, API key governance, '
    + 'and usage telemetry for cost and risk monitoring.',
  logoUrl: '/integrations/openai.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/openai',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Admin API key',
      type: 'password',
      required: true,
      placeholder: 'sk-admin-...',
      helpText:
        'An admin-level API key for the organisation. Read-only access is sufficient.',
    },
    {
      id: 'organization_id',
      label: 'Organisation ID',
      type: 'text',
      required: false,
      placeholder: 'org-...',
      helpText: 'The OpenAI organisation the key is scoped to.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'audit_logging',
  ],
}
