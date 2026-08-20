// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ServicenowCredentials dataclass in
// sentinel/integrations/servicenow/adapter.py

import type { IntegrationConfig } from '../types'

export const ServicenowConfig: IntegrationConfig = {
  id: 'servicenow',
  category: 'ticketing',
  name: 'ServiceNow',
  description:
    'Access-review and data-location evidence from ServiceNow: admin role '
    + 'account hygiene, change-request approval trail, and publicly '
    + 'visible knowledge-base articles.',
  logoUrl: '/integrations/servicenow.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/servicenow',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://example.service-now.com',
      helpText: 'Your ServiceNow instance URL.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000000000000000000000000000',
      helpText: 'The OAuth2 client ID from a ServiceNow Application Registry entry using the client-credentials grant.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'change_management',
    'data_classification',
  ],
}
