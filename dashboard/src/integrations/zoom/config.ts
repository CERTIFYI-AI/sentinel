// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ZoomCredentials dataclass in
// sentinel/integrations/zoom/adapter.py

import type { IntegrationConfig } from '../types'

export const ZoomConfig: IntegrationConfig = {
  id: 'zoom',
  category: 'collaboration',
  name: 'Zoom',
  description:
    'Access-review and data-location evidence: Owner/Admin role '
    + 'concentration, account-wide two-factor authentication enforcement, '
    + 'and public sharing of cloud recordings.',
  logoUrl: '/integrations/zoom.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/zoom',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: 'AbCdEfGhIjKlMnOpQrStUv',
      helpText: 'The Zoom account ID for the Server-to-Server OAuth app.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'AbCdEfGhIjKlMnOpQrStUv',
      helpText: 'The Client ID from your Zoom Server-to-Server OAuth app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Client Secret paired with the client ID above.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'data_classification',
  ],
}
