// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PrismaCloudCredentials dataclass in
// sentinel/integrations/prisma_cloud/adapter.py

import type { IntegrationConfig } from '../types'

export const PrismaCloudConfig: IntegrationConfig = {
  id: 'prisma_cloud',
  category: 'security',
  name: 'Prisma Cloud',
  description:
    'CSPM posture: policy violations, host vulnerabilities, '
    + 'and network security alerts.',
  logoUrl: '/integrations/prisma_cloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/prisma_cloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_url',
      label: 'API URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.prismacloud.io',
      helpText: 'The Prisma Cloud API base URL for your tenant (e.g. api.prismacloud.io, api2.prismacloud.io).',
    },
    {
      id: 'access_key_id',
      label: 'Access key ID',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      helpText: 'The access key ID from Settings > Access Keys.',
    },
    {
      id: 'client_credential',
      label: 'Secret key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The secret key paired with the access key ID.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'endpoint_protection',
    'network_security',
  ],
}
