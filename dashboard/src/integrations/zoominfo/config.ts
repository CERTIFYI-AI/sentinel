// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ZoominfoCredentials dataclass in
// sentinel/integrations/zoominfo/adapter.py

import type { IntegrationConfig } from '../types'

export const ZoominfoConfig: IntegrationConfig = {
  id: 'zoominfo',
  category: 'collaboration',
  name: 'ZoomInfo',
  description:
    'Access-review and data-location posture from ZoomInfo: dormant '
    + 'admin users, org-wide SSO/MFA enforcement, and access scope on '
    + 'contact/lead export activity.',
  logoUrl: '/integrations/zoominfo.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/zoominfo',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID issued for your ZoomInfo API application.',
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
    'mfa_enforcement',
    'data_classification',
  ],
}
