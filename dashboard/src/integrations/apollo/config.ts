// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ApolloCredentials dataclass in
// sentinel/integrations/apollo/adapter.py

import type { IntegrationConfig } from '../types'

export const ApolloConfig: IntegrationConfig = {
  id: 'apollo',
  category: 'collaboration',
  name: 'Apollo.io',
  description:
    'Access-review and data-location posture from Apollo.io: dormant '
    + 'admin seats, audit/activity log retrievability, and sharing scope '
    + 'on saved contact and lead lists.',
  logoUrl: '/integrations/apollo.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/apollo',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Apollo Settings > Integrations with read access to users, activities, and lists.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
