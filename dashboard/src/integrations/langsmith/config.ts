// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const LangSmithConfig: IntegrationConfig = {
  id: 'langsmith_langfuse',
  category: 'ai',
  name: 'LangSmith / Langfuse',
  description:
    'Continuous tracing of LLM inputs, outputs, hallucination scores, '
    + 'and safety evaluations for prompt observability.',
  logoUrl: '/integrations/langsmith.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/langsmith',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: 'ls-...',
      helpText: 'A read-only API key for LangSmith or Langfuse.',
    },
    {
      id: 'host',
      label: 'Host',
      type: 'url',
      required: false,
      placeholder: 'https://api.smith.langchain.com',
      helpText: 'Your LangSmith/Langfuse host (self-hosted or region).',
    },
    {
      id: 'project',
      label: 'Project',
      type: 'text',
      required: false,
      placeholder: 'default',
    },
  ],
  checkCategories: [
    'audit_logging',
    'data_classification',
  ],
}
