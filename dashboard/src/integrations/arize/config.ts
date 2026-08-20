// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const ArizeConfig: IntegrationConfig = {
  id: 'arize_ai_phoenix',
  category: 'ai',
  name: 'Arize AI / Phoenix',
  description:
    'Monitor live embedding drift, RAG retrieval quality, and model '
    + 'degradation alerts for AI observability.',
  logoUrl: '/integrations/arize.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/arize',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A read-only API key for the Arize space.',
    },
    {
      id: 'space_id',
      label: 'Space ID',
      type: 'text',
      required: false,
      placeholder: 'U3BhY2U6...',
    },
  ],
  checkCategories: [
    'audit_logging',
  ],
}
