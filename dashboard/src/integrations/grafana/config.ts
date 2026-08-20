// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the GrafanaCredentials dataclass in
// sentinel/integrations/grafana/adapter.py

import type { IntegrationConfig } from '../types'

export const GrafanaConfig: IntegrationConfig = {
  id: 'grafana',
  category: 'security',
  name: 'Grafana',
  description:
    'Observability posture: alert rules, firing alerts, and '
    + 'dashboard inventory for compliance audit.',
  logoUrl: '/integrations/grafana.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/grafana',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'server_url',
      label: 'Server URL',
      type: 'url',
      required: true,
      placeholder: 'https://grafana.example.com',
      helpText: 'The base URL of your Grafana instance.',
    },
    {
      id: 'api_token',
      label: 'Service account token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A service account token with Viewer role from Administration > Service Accounts.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'vulnerability_management',
  ],
}
