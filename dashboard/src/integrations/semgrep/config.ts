// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SemgrepCredentials dataclass in
// sentinel/integrations/semgrep/adapter.py

import type { IntegrationConfig } from '../types'

export const SemgrepConfig: IntegrationConfig = {
  id: 'semgrep',
  category: 'security',
  name: 'Semgrep',
  description:
    'Static analysis posture: scan activity for change management and '
    + 'open SAST findings for vulnerability management evidence.',
  logoUrl: '/integrations/semgrep.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/semgrep',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Semgrep App API token with read access to the deployment.',
    },
    {
      id: 'deployment_slug',
      label: 'Deployment slug',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText:
        'The slug identifying your Semgrep deployment (visible in the URL '
        + 'at semgrep.dev/orgs/<slug>).',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'change_management',
  ],
}
