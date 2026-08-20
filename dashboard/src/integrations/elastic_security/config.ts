// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ElasticSecurityCredentials dataclass in
// sentinel/integrations/elastic_security/adapter.py

import type { IntegrationConfig } from '../types'

export const ElasticSecurityConfig: IntegrationConfig = {
  id: 'elastic_security',
  category: 'siem',
  name: 'Elastic Security',
  description:
    'SIEM posture: detection rule coverage, open security alerts, '
    + 'and audit-log / Fleet access for compliance evidence.',
  logoUrl: '/integrations/elastic_security.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/elastic_security',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Kibana URL',
      type: 'url',
      required: true,
      placeholder: 'https://kibana.example.com:5601',
      helpText: 'The base URL of your Kibana instance.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Kibana API key with read access to detection rules, alerts, and Fleet.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
