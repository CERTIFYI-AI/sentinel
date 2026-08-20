// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const HuggingFaceConfig: IntegrationConfig = {
  id: 'hugging_face_enterprise',
  category: 'ai',
  name: 'Hugging Face Enterprise',
  description:
    'Organisation model repositories, member access, model license auditing, '
    + 'and supply-chain scanning posture.',
  logoUrl: '/integrations/huggingface.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hugging-face',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_token',
      label: 'Access token (read)',
      type: 'password',
      required: true,
      placeholder: 'hf_...',
      helpText: 'A Hugging Face access token with read scope for the organisation.',
    },
    {
      id: 'organization',
      label: 'Organisation',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText: 'The Hugging Face org the token is scoped to.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'vendor_management',
  ],
}
