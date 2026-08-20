// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SplunkEnterpriseCredentials dataclass in
// sentinel/integrations/splunk_enterprise/adapter.py

import type { IntegrationConfig } from '../types'

export const SplunkEnterpriseConfig: IntegrationConfig = {
  id: 'splunk_enterprise',
  category: 'siem',
  name: 'Splunk Enterprise',
  description:
    'On-premises SIEM posture: forwarder status, index data volume, '
    + 'and license usage for audit logging and incident response evidence.',
  logoUrl: '/integrations/splunk_enterprise.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/splunk_enterprise',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Splunk Enterprise URL',
      type: 'text',
      required: true,
      placeholder: 'https://splunk.internal.example.com:8089',
      helpText:
        'The management port URL of your Splunk Enterprise search head '
        + '(typically port 8089).',
    },
    {
      id: 'api_token',
      label: 'Authentication token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Splunk authentication token for a user with search, index '
        + 'list, forwarder list, and license read capabilities.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
