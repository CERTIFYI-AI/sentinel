// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PingOneCredentials dataclass in
// sentinel/integrations/pingone/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const PingOneConfig: IntegrationConfig = {
  id: 'pingone',
  category: 'identity',
  name: 'PingOne',
  description:
    'Identity posture: sign-on policies requiring multi-factor '
    + 'authentication, password policy strength, and population assignment '
    + 'across the user directory.',
  logoUrl: '/integrations/pingone.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/pingone',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'environment_id',
      label: 'Environment ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'PingOne admin console → the environment this connection governs.',
    },
    {
      id: 'client_id',
      label: 'Worker application client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'A worker application (Applications → Worker) with the Identity Data '
        + 'Read Only or Environment Viewer role.',
    },
    {
      id: 'client_credential',
      label: 'Worker application client secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Exchanged for a short-lived Bearer token via client-credentials OAuth. '
        + 'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: false,
      placeholder: 'com',
      helpText: 'Tenant region tld: com, eu, asia, ca. Defaults to com when left blank.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'mfa_enforcement',
    'access_control',
    'hr_controls',
  ],
}
