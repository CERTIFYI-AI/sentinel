// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OpenVasCredentials dataclass in
// sentinel/integrations/openvas/adapter.py

import type { IntegrationConfig } from '../types'

export const OpenVasConfig: IntegrationConfig = {
  id: 'openvas',
  category: 'security',
  name: 'OpenVAS',
  description:
    'Vulnerability scanning: scan task results, high-severity '
    + 'findings, and scan schedule compliance.',
  logoUrl: '/integrations/openvas.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/openvas',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Server URL',
      type: 'url',
      required: true,
      placeholder: 'https://gvm.example.com:9392',
      helpText: 'The base URL of your OpenVAS / Greenbone instance.',
    },
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'admin',
      helpText: 'The GVM web interface username.',
    },
    {
      id: 'credential',
      label: 'Credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The credential for the GVM web interface user.',
    },
  ],
  checkCategories: [
    'vulnerability_management',
  ],
}
