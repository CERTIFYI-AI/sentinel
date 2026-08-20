// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JumpCloudMDMCredentials dataclass in
// sentinel/integrations/jumpcloud_mdm/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const JumpCloudMDMConfig: IntegrationConfig = {
  id: 'jumpcloud_mdm',
  category: 'device',
  name: 'JumpCloud MDM',
  description:
    'Device posture: MDM enrolment/compliance, OS version currency and disk '
    + 'encryption status via the JumpCloud v2 API.',
  logoUrl: '/integrations/jumpcloud_mdm.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jumpcloud-mdm',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A read-only API key. Sent once over TLS and stored AES-256-GCM '
        + 'encrypted on the server.',
    },
    {
      id: 'org_id',
      label: 'Organization ID',
      type: 'text',
      required: false,
      placeholder: '',
      helpText:
        'Multi-tenant org ID. Leave blank for single-org setups.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'encryption_at_rest',
  ],
}
