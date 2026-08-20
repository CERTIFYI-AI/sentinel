// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SplunkCredentials dataclass in
// sentinel/integrations/splunk/adapter.py

import type { IntegrationConfig } from '../types'

export const SplunkConfig: IntegrationConfig = {
  id: 'splunk',
  category: 'siem',
  name: 'Splunk Cloud',
  description:
    'SIEM posture: search job history, index health, and saved search '
    + 'count for audit logging and incident response evidence.',
  logoUrl: '/integrations/splunk.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/splunk',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Splunk Cloud URL',
      type: 'text',
      required: true,
      placeholder: 'https://mysplunk.splunkcloud.com:8089',
      helpText:
        'The management port URL of your Splunk Cloud search head '
        + '(typically port 8089).',
    },
    {
      id: 'api_token',
      label: 'Authentication token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Splunk authentication token (JWT or session) for a user '
        + 'with search, index list, and alert list capabilities.',
    },
  ],
  checkCategories: [
    'audit_logging',
    'incident_response',
  ],
}
