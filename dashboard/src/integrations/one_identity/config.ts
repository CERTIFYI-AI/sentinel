// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OneIdentityCredentials dataclass in
// sentinel/integrations/one_identity/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const OneIdentityConfig: IntegrationConfig = {
  id: 'one_identity',
  category: 'identity',
  name: 'One Identity',
  description:
    'Joiner/mover/leaver lifecycle policy coverage, attestation '
    + 'recertification coverage and audit trail availability from One '
    + 'Identity Manager.',
  logoUrl: '/integrations/one_identity.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/one_identity',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue the key to a read-only reporting application under Designer → '
        + 'Permissions → API applications. Sent once over TLS and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
    {
      id: 'instance_url',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://oneidentity.example.com',
      helpText: 'Your One Identity Manager REST API base URL.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'access_control',
    'audit_logging',
  ],
}
