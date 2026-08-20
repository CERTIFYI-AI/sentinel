// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SalesforceCredentials dataclass in
// sentinel/integrations/salesforce/adapter.py

import type { IntegrationConfig } from '../types'

export const SalesforceConfig: IntegrationConfig = {
  id: 'salesforce',
  category: 'collaboration',
  name: 'Salesforce',
  description:
    'Access-review and data-location evidence from Salesforce: dormant '
    + 'System Administrator accounts, Setup Audit Trail retrievability, '
    + 'and profiles granted org-wide View All Data visibility.',
  logoUrl: '/integrations/salesforce.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/salesforce',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourorg.my.salesforce.com',
      helpText: 'Your Salesforce org\'s My Domain instance URL.',
    },
    {
      id: 'client_id',
      label: 'Connected App consumer key',
      type: 'text',
      required: true,
      placeholder: '3MVG9...',
      helpText: 'The Consumer Key of a Connected App with the client-credentials OAuth flow enabled.',
    },
    {
      id: 'client_credential',
      label: 'Connected App consumer secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Consumer Secret paired with the consumer key above.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
