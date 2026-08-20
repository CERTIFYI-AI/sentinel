// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the FreshserviceCredentials dataclass in
// sentinel/integrations/freshservice/adapter.py

import type { IntegrationConfig } from '../types'

export const FreshserviceConfig: IntegrationConfig = {
  id: 'freshservice',
  category: 'ticketing',
  name: 'Freshservice',
  description:
    'Access-review and data-location evidence from Freshservice: dormant '
    + 'administrator agents, audit-log retrievability, and agents granted '
    + 'global ticket visibility across every department.',
  logoUrl: '/integrations/freshservice.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/freshservice',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'domain',
      label: 'Helpdesk domain',
      type: 'text',
      required: true,
      placeholder: 'yourcompany.freshservice.com',
      helpText: 'Your Freshservice helpdesk domain, without the protocol.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Freshservice API key from Profile Settings. Read-only access to '
        + 'agents, roles, and audit logs is sufficient.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
