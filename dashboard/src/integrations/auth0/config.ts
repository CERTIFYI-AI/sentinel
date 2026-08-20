// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the Auth0Credentials dataclass in
// sentinel/integrations/auth0/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const Auth0Config: IntegrationConfig = {
  id: 'auth0',
  category: 'identity',
  name: 'Auth0',
  description:
    'Identity posture: users missing MFA enrollment, database connection '
    + 'password policy strength, brute-force protection and suspicious '
    + 'activity log availability.',
  logoUrl: '/integrations/auth0.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/auth0',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'tenant_domain',
      label: 'Tenant domain',
      type: 'url',
      required: true,
      placeholder: 'https://yourco.us.auth0.com',
      helpText: 'Your Auth0 tenant domain, including the region if applicable.',
    },
    {
      id: 'api_key',
      label: 'Management API access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A token from a Machine to Machine application authorized against the '
        + 'Management API with read:users, read:connections and read:logs '
        + 'scopes. These tokens are short-lived — rotate the stored value when '
        + 'it expires. Sent once over TLS and stored AES-256-GCM encrypted on '
        + 'the server.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'access_control',
    'audit_logging',
  ],
}
