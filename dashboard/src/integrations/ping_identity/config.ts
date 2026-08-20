// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the PingIdentityCredentials dataclass in
// sentinel/integrations/ping_identity/adapter.py — the backend validates the
// submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.
//
// Distinct from the PingOne connector (dashboard/src/integrations/pingone):
// this targets PingFederate/PingDirectory's federation and directory admin
// surface — authentication policies, SP/IdP connections and the
// administrative audit log — rather than PingOne's cloud user store.

import type { IntegrationConfig } from '../types'

export const PingIdentityConfig: IntegrationConfig = {
  id: 'ping_identity',
  category: 'identity',
  name: 'Ping Identity',
  description:
    'Federation posture from PingFederate/PingDirectory: authentication '
    + 'policies that require a credential challenge, SP/IdP connections that '
    + 'require signed assertions, and administrative audit log availability.',
  logoUrl: '/integrations/ping_identity.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ping_identity',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'environment_id',
      label: 'Environment ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The Ping Identity environment this connection governs.',
    },
    {
      id: 'client_id',
      label: 'Worker application client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'A worker application with read-only access to authentication '
        + 'policies, SP/IdP connections and the audit log.',
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
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py.
  checkCategories: [
    'access_control',
    'audit_logging',
  ],
}
