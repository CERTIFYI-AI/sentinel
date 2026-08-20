// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const WeaviateConfig: IntegrationConfig = {
  id: 'weaviate',
  category: 'ai',
  name: 'Weaviate',
  description:
    'Vector database security posture: schema classes, multi-tenancy isolation, '
    + 'and cluster health monitoring.',
  logoUrl: '/integrations/weaviate.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/weaviate',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An API key for the Weaviate cluster.',
    },
    {
      id: 'cluster_url',
      label: 'Cluster URL',
      type: 'url',
      required: true,
      placeholder: 'https://my-cluster.weaviate.network',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'encryption_in_transit',
  ],
}
