// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CyberArkCredentials dataclass in
// sentinel/integrations/cyberark/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const CyberArkConfig: IntegrationConfig = {
  id: 'cyberark',
  category: 'identity',
  name: 'CyberArk',
  description:
    'Privileged account inventory, session recording enforcement and '
    + 'credential rotation policy from CyberArk Privilege Cloud.',
  logoUrl: '/integrations/cyberark.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/cyberark',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'sentinel-reader@cyberark',
      helpText: 'The CyberArk Identity service user Sentinel authenticates as.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Scope the service user to the Auditor role — it can read every check '
        + 'without changing a vaulted credential. Sent once over TLS and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
    {
      id: 'tenant_url',
      label: 'Privilege Cloud tenant URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourco.privilegecloud.cyberark.cloud',
      helpText: 'Your Privilege Cloud API base URL.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'secret_management',
  ],
}
