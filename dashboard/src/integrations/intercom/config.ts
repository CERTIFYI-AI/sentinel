// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the IntercomCredentials dataclass in
// sentinel/integrations/intercom/adapter.py

import type { IntegrationConfig } from '../types'

export const IntercomConfig: IntegrationConfig = {
  id: 'intercom',
  category: 'collaboration',
  name: 'Intercom',
  description:
    'Teammate roster, admin activity log, and public Help Center exposure '
    + 'from Intercom for access-review and audit-logging evidence.',
  logoUrl: '/integrations/intercom.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/intercom',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'An Intercom Access Token from Settings > Developers > your app > Authentication.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
