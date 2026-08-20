// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const VertexAiConfig: IntegrationConfig = {
  id: 'google_cloud_vertex_ai',
  category: 'ai',
  name: 'Vertex AI',
  description:
    'AI model governance: deployed model inventory, endpoint inventory, '
    + 'and dataset inventory across the project.',
  logoUrl: '/integrations/vertex_ai.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/vertex-ai',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'service_account_json',
      label: 'Service account key (JSON)',
      type: 'password',
      required: true,
      placeholder: '{"type":"service_account","project_id":…}',
      helpText:
        'Service account key with Vertex AI Viewer role on the project.',
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: true,
      placeholder: 'my-project-123',
      helpText: 'The GCP project containing Vertex AI resources.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: false,
      placeholder: 'us-central1',
      helpText: 'Vertex AI region. Defaults to us-central1.',
    },
  ],
  checkCategories: ['change_management', 'data_classification'],
}
