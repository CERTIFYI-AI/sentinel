// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DuoCredentials dataclass in
// sentinel/integrations/duo/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const DuoConfig: IntegrationConfig = {
  id: 'duo',
  category: 'identity',
  name: 'Duo Security',
  description:
    'Second-factor posture: authentication policies that always bypass '
    + 'two-factor, active users with no enrolled second factor, and '
    + 'administrator log availability.',
  logoUrl: '/integrations/duo.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/duo',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_hostname',
      label: 'API hostname',
      type: 'url',
      required: true,
      placeholder: 'https://api-xxxxxxxx.duosecurity.com',
      helpText: 'Admin Panel → Applications → your Admin API application → API hostname.',
    },
    {
      id: 'integration_key',
      label: 'Integration key',
      type: 'password',
      required: true,
      placeholder: 'DIXXXXXXXXXXXXXXXXXX',
      helpText: 'From an Admin API application with read-only grants.',
    },
    {
      id: 'signing_key',
      label: 'Secret key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Used to authenticate to the Admin API over TLS. Sent once and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'audit_logging',
  ],
}
