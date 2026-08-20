// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the LaunchDarklyCredentials dataclass in
// sentinel/integrations/launchdarkly/adapter.py

import type { IntegrationConfig } from '../types'

export const LaunchDarklyConfig: IntegrationConfig = {
  id: 'launchdarkly',
  category: 'security',
  name: 'LaunchDarkly',
  description:
    'Feature-flag governance: stale flags, approval workflows, '
    + 'and audit-log access for change management.',
  logoUrl: '/integrations/launchdarkly.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/launchdarkly',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An API access token from Account Settings > Authorization with Reader role.',
    },
  ],
  checkCategories: [
    'change_management',
    'audit_logging',
  ],
}
