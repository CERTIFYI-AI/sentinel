// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CertnCredentials dataclass in
// sentinel/integrations/certn/adapter.py

import type { IntegrationConfig } from '../types'

export const CertnConfig: IntegrationConfig = {
  id: 'certn',
  category: 'hiring',
  name: 'Certn',
  description:
    'Background-check posture: pending-check aging, adverse-finding '
    + 'follow-up, and audit-trail retrievability from Certn.',
  logoUrl: '/integrations/certn.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/certn',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Certn account settings with read access to checks and the audit log.',
    },
  ],
  checkCategories: [
    'hr_controls',
    'audit_logging',
  ],
}
