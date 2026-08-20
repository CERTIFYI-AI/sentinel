// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OnePasswordCredentials dataclass in
// sentinel/integrations/onepassword/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const OnePasswordConfig: IntegrationConfig = {
  id: '1password',
  category: 'identity',
  name: '1Password',
  description:
    'Sign-in event availability, SCIM-managed vault access groups and team '
    + 'member provisioning status from 1Password Business.',
  logoUrl: '/integrations/1password.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/1password',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'Events Reporting token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue a reader token under Settings → Automation → Events Reporting. '
        + 'Read-only access is enough. Sent once over TLS and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
    {
      id: 'sign_in_url',
      label: 'Sign-in URL',
      type: 'url',
      required: true,
      placeholder: 'https://example.1password.com',
      helpText:
        'Your team\'s 1Password sign-in address. Used to reach the SCIM bridge '
        + 'when one is deployed, and to select the correct Events API region.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'audit_logging',
    'access_control',
    'hr_controls',
  ],
}
