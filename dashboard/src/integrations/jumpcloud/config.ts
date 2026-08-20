// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JumpCloudCredentials dataclass in
// sentinel/integrations/jumpcloud/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const JumpCloudConfig: IntegrationConfig = {
  id: 'jumpcloud',
  category: 'identity',
  name: 'JumpCloud',
  description:
    'Directory posture: system users missing MFA, staged/suspended account '
    + 'status, Directory Insights event log availability, and password '
    + 'policy strength.',
  logoUrl: '/integrations/jumpcloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jumpcloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue the key to an administrator account with read-only access. '
        + 'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'org_id',
      label: 'Organization ID',
      type: 'text',
      required: false,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'Only needed for a multi-org (MSP) administrator account — selects '
        + 'which organization the API key operates against. Leave blank for a '
        + 'single-org account.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'hr_controls',
    'audit_logging',
    'access_control',
  ],
}
