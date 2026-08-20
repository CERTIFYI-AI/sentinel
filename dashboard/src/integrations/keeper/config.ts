// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the KeeperCredentials dataclass in
// sentinel/integrations/keeper/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const KeeperConfig: IntegrationConfig = {
  id: 'keeper',
  category: 'identity',
  name: 'Keeper',
  description:
    'Per-user MFA enforcement, vault audit-event availability and user '
    + 'provisioning status from Keeper Enterprise.',
  logoUrl: '/integrations/keeper.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/keeper',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Enterprise API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue the key to a read-only enterprise administrator role under '
        + 'Admin Console → Admin → Secrets & Encryption → API. Sent once over '
        + 'TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'enterprise_id',
      label: 'Enterprise ID',
      type: 'text',
      required: false,
      placeholder: '1234567',
      helpText:
        'Only needed if this key spans more than one managed enterprise; '
        + 'otherwise leave blank and it resolves from the key.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'audit_logging',
    'access_control',
  ],
}
