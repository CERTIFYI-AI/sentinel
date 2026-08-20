// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DatadogCredentials dataclass in
// sentinel/integrations/datadog/adapter.py

import type { IntegrationConfig } from '../types'

export const DatadogConfig: IntegrationConfig = {
  id: 'datadog',
  category: 'security',
  name: 'Datadog',
  description:
    'Observability and security: audit trail, security monitoring signals, '
    + 'and CSM vulnerability findings.',
  logoUrl: '/integrations/datadog.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/datadog',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Datadog API key from Organization Settings > API Keys.',
    },
    {
      id: 'application_key',
      label: 'Application key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Datadog Application key with read scopes for audit, security, and vulnerabilities.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'vulnerability_management',
  ],
}
