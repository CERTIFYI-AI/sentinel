// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the WebexCredentials dataclass in
// sentinel/integrations/webex/adapter.py

import type { IntegrationConfig } from '../types'

export const WebexConfig: IntegrationConfig = {
  id: 'webex',
  category: 'collaboration',
  name: 'Webex',
  description:
    'Access-review and data-location evidence: organization admin-role '
    + 'concentration, Admin Audit Events retrievability, and publicly '
    + 'listed meeting exposure.',
  logoUrl: '/integrations/webex.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/webex',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_credential',
      label: 'Access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'An org admin-scoped Webex integration or bot access token with '
        + 'identity:people_read, identity:roles_read, audit:events_read, '
        + 'and meeting:schedules_read scopes.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
