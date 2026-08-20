// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CheckrCredentials dataclass in
// sentinel/integrations/checkr/adapter.py

import type { IntegrationConfig } from '../types'

export const CheckrConfig: IntegrationConfig = {
  id: 'checkr',
  category: 'hiring',
  name: 'Checkr',
  description:
    'Background-check posture: pending-check aging, adverse-finding '
    + 'follow-up, and audit-trail retrievability from Checkr.',
  logoUrl: '/integrations/checkr.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/checkr',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Checkr API key with read access to reports and audit logs (sent as the Basic auth username with a blank password).',
    },
  ],
  checkCategories: [
    'hr_controls',
    'audit_logging',
  ],
}
