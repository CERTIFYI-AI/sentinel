// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OktaCredentials dataclass in
// sentinel/integrations/okta/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const OktaConfig: IntegrationConfig = {
  id: 'okta',
  category: 'identity',
  name: 'Okta',
  description:
    'Identity posture: MFA enrolment policy, password strength, administrator '
    + 'assignments, dormant active accounts, federated application sign-on and '
    + 'System Log availability.',
  logoUrl: '/integrations/okta.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/okta',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'org_url',
      label: 'Okta org URL',
      type: 'url',
      required: true,
      placeholder: 'https://example.okta.com',
      helpText:
        'Your Okta tenant. Use the admin URL only if that is what the token was '
        + 'issued against.',
    },
    {
      id: 'api_token',
      label: 'API token (SSWS)',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue the token to a service account, not a person — a token dies with '
        + 'the user who created it. Read-only access is enough; every call '
        + 'Sentinel makes is a GET. Sent once over TLS and stored AES-256-GCM '
        + 'encrypted on the server.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'access_control',
    'least_privilege',
    'hr_controls',
    'audit_logging',
  ],
}
