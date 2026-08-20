// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the IbmCloudCredentials dataclass in
// sentinel/integrations/ibm_cloud/adapter.py

import type { IntegrationConfig } from '../types'

export const IbmCloudConfig: IntegrationConfig = {
  id: 'ibm_cloud',
  category: 'cloud',
  name: 'IBM Cloud',
  description:
    'Account security posture: stale IAM API keys, Context-Based Restrictions '
    + 'network enforcement, and provisioned key-management services for encryption at rest.',
  logoUrl: '/integrations/ibm_cloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ibm_cloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••••••••••••••',
      helpText: 'An IAM API key (Manage > Access (IAM) > API keys) with Viewer access to IAM Identity, Context-based Restrictions, and Resource Controller.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'encryption_at_rest',
  ],
}
