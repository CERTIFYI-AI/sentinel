// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OmnissaWorkspaceOneCredentials dataclass in
// sentinel/integrations/omnissa_workspace_one/adapter.py — the backend validates
// the submitted shape against it, so a mismatch here is a 400, not a silent
// misconfiguration.

import type { IntegrationConfig } from '../types'

export const OmnissaWorkspaceOneConfig: IntegrationConfig = {
  id: 'omnissa_workspace_one',
  category: 'device',
  name: 'Omnissa Workspace ONE',
  description:
    'Device posture: compliance status, encryption policy enforcement and '
    + 'profile assignment via Omnissa Workspace ONE UEM.',
  logoUrl: '/integrations/omnissa_workspace_one.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/omnissa-workspace-one',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_url',
      label: 'API URL',
      type: 'url',
      required: true,
      placeholder: 'https://asXXX.awmdm.com',
      helpText:
        'The base URL of your Workspace ONE UEM API server.',
    },
    {
      id: 'api_token',
      label: 'API Key / Tenant Code',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The aw-tenant-code for your environment. Sent once over TLS and '
        + 'stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'username',
      label: 'Admin username',
      type: 'text',
      required: true,
      placeholder: '',
      helpText:
        'A read-only admin account username.',
    },
    {
      id: 'credential',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The admin account credential. Sent once over TLS and stored '
        + 'AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'encryption_at_rest',
    'access_control',
  ],
}
