// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the EnvoyCredentials dataclass in
// sentinel/integrations/envoy/adapter.py

import type { IntegrationConfig } from '../types'

export const EnvoyConfig: IntegrationConfig = {
  id: 'envoy',
  category: 'collaboration',
  name: 'Envoy',
  description:
    'Access-review and data-location posture from Envoy workplace '
    + 'management: dormant admin employees, visitor-data retention '
    + 'posture, and public exposure of the employee directory at sign-in.',
  logoUrl: '/integrations/envoy.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/envoy',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Envoy Settings > API tokens with read access to employees and locations.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'data_classification',
    'access_control',
  ],
}
