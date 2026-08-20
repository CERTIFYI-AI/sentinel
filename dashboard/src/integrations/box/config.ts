// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BoxCredentials dataclass in
// sentinel/integrations/box/adapter.py

import type { IntegrationConfig } from '../types'

export const BoxConfig: IntegrationConfig = {
  id: 'box',
  category: 'collaboration',
  name: 'Box',
  description:
    'Access-review and data-location evidence: enterprise admin/co-admin '
    + 'concentration, Enterprise Events audit log retrievability, and '
    + 'publicly-accessible shared links.',
  logoUrl: '/integrations/box.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/box',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'AbCdEfGhIjKlMnOpQrStUv',
      helpText: 'The Client ID from your Box Client Credentials Grant app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Client Secret paired with the client ID above.',
    },
    {
      id: 'enterprise_id',
      label: 'Enterprise ID',
      type: 'text',
      required: true,
      placeholder: '123456789',
      helpText: 'The Box enterprise ID to authenticate as (the CCG subject).',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
