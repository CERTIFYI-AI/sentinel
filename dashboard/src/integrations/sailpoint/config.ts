// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SailPointCredentials dataclass in
// sentinel/integrations/sailpoint/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const SailPointConfig: IntegrationConfig = {
  id: 'sailpoint',
  category: 'identity',
  name: 'SailPoint',
  description:
    'Identity governance campaigns, access certification timeliness, audit '
    + 'event availability and role ownership from SailPoint IdentityNow.',
  logoUrl: '/integrations/sailpoint.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sailpoint',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'sentinel-reader',
      helpText: 'The IdentityNow personal access token client id Sentinel authenticates as.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Scope the token to a role with read-only reporting access. Sent once '
        + 'over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'tenant_url',
      label: 'IdentityNow tenant URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourco.api.identitynow.com',
      helpText: 'Your IdentityNow API base URL.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'access_control',
    'audit_logging',
    'least_privilege',
  ],
}
