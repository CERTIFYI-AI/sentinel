// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OnePasswordDeviceTrustCredentials dataclass in
// sentinel/integrations/onepassword_device_trust/adapter.py — the backend
// validates the submitted shape against it, so a mismatch here is a 400, not
// a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const OnePasswordDeviceTrustConfig: IntegrationConfig = {
  id: '1password_device_trust_kolide',
  category: 'identity',
  name: '1Password Device Trust (Kolide)',
  description:
    'Endpoint compliance posture: per-device compliance status, fleet-wide '
    + 'failing checks and device inventory from 1Password Device Trust.',
  logoUrl: '/integrations/1password_device_trust_kolide.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/1password_device_trust_kolide',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Issue a read-only service account token under Settings → API. Sent '
        + 'once over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'organization',
      label: 'Organization',
      type: 'text',
      required: false,
      placeholder: 'my-org',
      helpText:
        'Only needed if this token spans more than one Device Trust '
        + 'organization; otherwise leave blank and it resolves from the token.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
  ],
}
