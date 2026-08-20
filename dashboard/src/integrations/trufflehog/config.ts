// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TrufflehogCredentials dataclass in
// sentinel/integrations/trufflehog/adapter.py

import type { IntegrationConfig } from '../types'

export const TrufflehogConfig: IntegrationConfig = {
  id: 'trufflehog',
  category: 'security',
  name: 'TruffleHog',
  description:
    'Credential scanning posture: detected finding count, scan coverage, '
    + 'and remediation status for credential management and vulnerability '
    + 'management evidence.',
  logoUrl: '/integrations/trufflehog.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/trufflehog',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A TruffleHog Enterprise API key with read access to findings '
        + 'and scans.',
    },
  ],
  checkCategories: [
    'secret_management',
    'vulnerability_management',
  ],
}
