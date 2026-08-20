// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AlibabaCloudCredentials dataclass in
// sentinel/integrations/alibaba_cloud/adapter.py

import type { IntegrationConfig } from '../types'

export const AlibabaCloudConfig: IntegrationConfig = {
  id: 'alibaba_cloud',
  category: 'cloud',
  name: 'Alibaba Cloud',
  description:
    'RAM and Cloud Config security posture: stale RAM access keys, and Cloud '
    + 'Config compliance for public resource exposure and encryption at rest.',
  logoUrl: '/integrations/alibaba_cloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/alibaba_cloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_key_id',
      label: 'AccessKey ID',
      type: 'text',
      required: true,
      placeholder: 'LTAI5t••••••••••••••••',
      helpText: 'The RAM AccessKey ID. Attach the AliyunRAMReadOnlyAccess and AliyunConfigReadOnlyAccess policies to the RAM user or role.',
    },
    {
      id: 'access_key_credential',
      label: 'AccessKey secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••••••',
      helpText: 'The AccessKey secret paired with the AccessKey ID above.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'encryption_at_rest',
  ],
}
