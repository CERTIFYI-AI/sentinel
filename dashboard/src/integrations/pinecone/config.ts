// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const PineconeConfig: IntegrationConfig = {
  id: 'pinecone',
  category: 'ai',
  name: 'Pinecone',
  description:
    'Vector database posture: index inventory, encryption settings, '
    + 'and collection backups.',
  logoUrl: '/integrations/pinecone.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/pinecone',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A read-only Pinecone organisation API key.',
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: true,
      placeholder: 'abcdef',
      helpText: 'The Pinecone project the key belongs to.',
    },
    {
      id: 'environment',
      label: 'Environment',
      type: 'text',
      required: false,
      placeholder: 'us-east-1-aws',
    },
  ],
  checkCategories: [
    'encryption_at_rest',
    'backup_recovery',
  ],
}
