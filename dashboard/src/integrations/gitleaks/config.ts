// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GitleaksCredentials dataclass in
// sentinel/integrations/gitleaks/adapter.py

import type { IntegrationConfig } from '../types'

export const GitleaksConfig: IntegrationConfig = {
  id: 'gitleaks',
  category: 'security',
  name: 'Gitleaks',
  description:
    'Secrets-scanning results: open leaks, scan history, and '
    + 'remediation status from Gitleaks Enterprise.',
  logoUrl: '/integrations/gitleaks.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/gitleaks',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from the Gitleaks admin panel with read access to leaks, scans, and configuration.',
    },
  ],
  checkCategories: [
    'secret_management',
    'vulnerability_management',
  ],
}
