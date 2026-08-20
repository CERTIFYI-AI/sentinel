// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OneLoginCredentials dataclass in
// sentinel/integrations/onelogin/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const OneLoginConfig: IntegrationConfig = {
  id: 'onelogin',
  category: 'identity',
  name: 'OneLogin',
  description:
    'Identity posture: MFA policy enforcement, active-user provisioning '
    + 'status (role/group assignment and suspended accounts), and event log '
    + 'availability.',
  logoUrl: '/integrations/onelogin.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/onelogin',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'subdomain_url',
      label: 'OneLogin subdomain URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourco.onelogin.com',
      helpText: 'Your OneLogin account subdomain.',
    },
    {
      id: 'client_id',
      label: 'API client ID',
      type: 'text',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'From Developers → API Credentials. Grant the credential Read Users, '
        + 'Read All and Read Events scopes.',
    },
    {
      id: 'client_credential',
      label: 'API client secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Exchanged for a short-lived Bearer token via client-credentials OAuth; '
        + 'never sent with individual requests. Sent once over TLS and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'access_control',
    'audit_logging',
  ],
}
