// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ClockworkCredentials dataclass in
// sentinel/integrations/clockwork/adapter.py

import type { IntegrationConfig } from '../types'

export const ClockworkConfig: IntegrationConfig = {
  id: 'clockwork',
  category: 'collaboration',
  name: 'Clockwork',
  description:
    'Access-review and data-location posture from Clockwork: dormant '
    + 'admin users, audit-event retrievability, and over-broadly scoped '
    + 'API keys/integrations.',
  logoUrl: '/integrations/clockwork.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/clockwork',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Clockwork admin settings with read access to users, audit events, and API keys.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
