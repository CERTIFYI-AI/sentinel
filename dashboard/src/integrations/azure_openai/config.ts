// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const AzureOpenAiConfig: IntegrationConfig = {
  id: 'openai_azure_openai',
  category: 'ai',
  name: 'Azure OpenAI',
  description:
    'Deployment inventory, content filtering posture, and network rules '
    + 'for Azure OpenAI resources.',
  logoUrl: '/integrations/azure-openai.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/azure-openai',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'resource_name',
      label: 'Resource name',
      type: 'text',
      required: true,
      placeholder: 'my-aoai',
      helpText: 'The Azure OpenAI resource; endpoint is <name>.openai.azure.com.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An API key for the Azure OpenAI resource.',
    },
    {
      id: 'tenant_id',
      label: 'Directory (tenant) ID',
      type: 'text',
      required: false,
      placeholder: '00000000-0000-0000-0000-000000000000',
    },
    {
      id: 'subscription_id',
      label: 'Subscription ID',
      type: 'text',
      required: false,
      placeholder: '00000000-0000-0000-0000-000000000000',
    },
  ],
  checkCategories: [
    'data_classification',
    'access_control',
  ],
}
